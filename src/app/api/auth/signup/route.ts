import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
// src/app/api/auth/signup/route.ts
import { z } from "zod";
import { sendAdminSignupNotification, sendWelcomeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  authRateLimiter,
  getClientIP,
  logSecurityEvent,
  turnstileTokenTracker,
} from "@/lib/security";
import { formatEmail, formatPhoneNumber, toProperCase } from "@/lib/utils";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  // REMOVED: Password is now set during registration completion after approval
  phone: z.string().optional(),
  level: z.enum([
    "PRE_PRELIMINARY",
    "PRELIMINARY",
    "PRE_JUVENILE",
    "JUVENILE",
    "INTERMEDIATE",
    "NOVICE",
    "JUNIOR",
    "SENIOR",
  ]),
  maxLessonsPerWeek: z.number().int().positive().optional().default(3),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    })
    .optional(),
  parentConsent: z.boolean().default(false),
  // Layer 1: Honeypot field (should always be empty)
  honeypot: z.string().optional(),
  // Layer 2: Cloudflare Turnstile token (required for verification)
  turnstileToken: z.string().optional(),
});

/**
 * Layer 2: Verify Cloudflare Turnstile token with Cloudflare API
 * @param token - The Turnstile token from the client
 * @param clientIP - The client's IP address
 * @returns True if token is valid
 */
async function verifyTurnstileToken(token: string, clientIP: string): Promise<boolean> {
  try {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    // In development, allow bypass if no secret key is configured
    if (!secretKey && process.env.NODE_ENV === "development") {
      return true;
    }

    if (!secretKey) {
      console.error("TURNSTILE_SECRET_KEY not configured");
      return false;
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: clientIP,
      }),
    });

    const data = await response.json();

    return data.success === true;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Layer 3: Rate limiting (5 signups per IP per hour) - using secure IP extraction
    const clientIP = getClientIP(req.headers);
    if (!authRateLimiter.isAllowed(clientIP)) {
      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        endpoint: "/api/auth/signup",
        ip: clientIP,
      });
      return NextResponse.json(
        { message: "Too many signup attempts. Please try again in an hour." },
        { status: 429 },
      );
    }

    // Parse request body with size limit
    const body = await req.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      logSecurityEvent("INVALID_SIGNUP_DATA", {
        ip: clientIP,
        errors: result.error.format(),
      });
      return NextResponse.json(
        { message: "Invalid data", errors: result.error.format() },
        { status: 400 },
      );
    }

    // Layer 1 Verification: Honeypot field should be empty (server-side check)
    if (result.data.honeypot && result.data.honeypot.length > 0) {
      logSecurityEvent("BOT_DETECTED_HONEYPOT", {
        ip: clientIP,
        honeypot: result.data.honeypot,
      });
      // Return a generic error to not reveal the honeypot mechanism
      return NextResponse.json(
        { message: "Invalid form submission. Please try again." },
        { status: 400 },
      );
    }

    // Layer 2 Verification: Verify Cloudflare Turnstile token (server-side check)
    if (result.data.turnstileToken) {
      // Check for token replay attack
      if (turnstileTokenTracker.isUsed(result.data.turnstileToken)) {
        logSecurityEvent("TOKEN_REPLAY_ATTACK", {
          ip: clientIP,
          token: `${result.data.turnstileToken.substring(0, 20)}...`,
        });
        return NextResponse.json(
          { message: "Security token has already been used. Please refresh and try again." },
          { status: 400 },
        );
      }

      const isValidToken = await verifyTurnstileToken(result.data.turnstileToken, clientIP);
      if (!isValidToken) {
        logSecurityEvent("INVALID_TURNSTILE_TOKEN", {
          ip: clientIP,
        });
        return NextResponse.json(
          { message: "Security verification failed. Please try again." },
          { status: 400 },
        );
      }

      // Mark token as used to prevent replay
      if (!turnstileTokenTracker.markUsed(result.data.turnstileToken)) {
        logSecurityEvent("TOKEN_MARKING_RACE_CONDITION", {
          ip: clientIP,
        });
        return NextResponse.json(
          { message: "Security verification error. Please try again." },
          { status: 400 },
        );
      }
    } else if (process.env.NODE_ENV === "production") {
      // In production, require Turnstile token
      logSecurityEvent("MISSING_TURNSTILE_TOKEN", {
        ip: clientIP,
      });
      return NextResponse.json(
        { message: "Security verification required. Please complete the CAPTCHA." },
        { status: 400 },
      );
    }

    // Apply formatting to all inputs
    const formattedData = {
      name: toProperCase(result.data.name),
      email: formatEmail(result.data.email),
      phone: result.data.phone ? formatPhoneNumber(result.data.phone) : null,
      level: result.data.level,
      maxLessonsPerWeek: result.data.maxLessonsPerWeek,
      emergencyContact: result.data.emergencyContact
        ? {
            name: toProperCase(result.data.emergencyContact.name),
            phone: formatPhoneNumber(result.data.emergencyContact.phone),
            relationship: toProperCase(result.data.emergencyContact.relationship),
          }
        : null,
      parentConsent: result.data.parentConsent,
    };

    const { name, email, phone, level, maxLessonsPerWeek, emergencyContact, parentConsent } =
      formattedData;

    // REMOVED: Password validation - password will be set during registration completion

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logSecurityEvent("DUPLICATE_EMAIL_SIGNUP", {
        ip: clientIP,
        email,
      });
      return NextResponse.json(
        {
          message:
            "This email is already registered. If you've already signed up, please wait for admin approval or check your inbox (including spam) for an approval email. Contact info@ym-movement.com if you need help.",
          code: "DUPLICATE_EMAIL",
        },
        { status: 400 },
      );
    }

    // REMOVED: Password hashing - password will be set during registration completion

    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      throw new Error("Database connection failed");
    }

    // Create user and student profile in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user first (ID auto-generated by Prisma) - NO PASSWORD YET
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: null, // Password will be set during registration completion
          role: "STUDENT",
        },
      });

      // Create student profile linked to user (ID auto-generated by Prisma)
      const student = await tx.student.create({
        data: {
          userId: newUser.id,
          phone,
          level,
          maxLessonsPerWeek,
          emergencyContact: emergencyContact || undefined,
          parentConsent,
        },
      });

      return {
        ...newUser,
        Student: student,
      };
    });

    // Fire welcome + admin notification in parallel. Both are best-effort — neither
    // rolls back the created records — but each failure is reported back to the UI
    // and logged so admin can follow up manually instead of the student falling
    // into a silent hole (the pre-fix behavior that hid Reina Lee's signup).
    const [welcomeResult, adminResult] = await Promise.allSettled([
      sendWelcomeEmail(user.email, user.name || ""),
      sendAdminSignupNotification({
        name: user.name || "",
        email: user.email,
        level,
        phone: phone ?? undefined,
      }),
    ]);

    const welcomeEmailSent = welcomeResult.status === "fulfilled";
    const welcomeEmailError =
      welcomeResult.status === "rejected"
        ? welcomeResult.reason instanceof Error
          ? welcomeResult.reason.message
          : "Unknown email error"
        : null;
    if (!welcomeEmailSent) {
      console.error("Failed to send welcome email to new signup:", welcomeResult.reason);
    }

    const adminNotified =
      adminResult.status === "fulfilled" && adminResult.value.sent === true;
    if (adminResult.status === "rejected") {
      console.error("Failed to send admin signup notification:", adminResult.reason);
    }

    // Return success with user data (excluding password) plus email-delivery status
    // so the client can warn the user if their welcome email didn't actually send.
    const { password: _, ...userData } = user;
    return NextResponse.json(
      {
        message: "Account created successfully",
        user: userData,
        welcomeEmailSent,
        welcomeEmailError,
        adminNotified,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      {
        message: "Failed to create account",
      },
      { status: 500 },
    );
  }
}
