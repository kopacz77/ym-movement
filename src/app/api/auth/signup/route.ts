import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
// src/app/api/auth/signup/route.ts
import { z } from "zod";
import { sendWelcomeEmail } from "@/lib/email";
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
      console.warn("⚠️  TURNSTILE_SECRET_KEY not configured - bypassing in development");
      return true;
    }

    if (!secretKey) {
      console.error("❌ TURNSTILE_SECRET_KEY not configured");
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
    console.log("Turnstile verification result:", data.success);

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
    console.log("Signup request received:", { ...body, password: "[REDACTED]" });
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      console.error("Signup validation failed:", {
        body,
        errors: result.error.format(),
        issues: result.error.issues,
      });
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
      console.warn("🤖 Bot detected via honeypot field:", {
        ip: clientIP,
        honeypot: result.data.honeypot,
      });
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
        console.warn("🚫 Token replay attack detected:", { ip: clientIP });
        logSecurityEvent("TOKEN_REPLAY_ATTACK", {
          ip: clientIP,
          token: result.data.turnstileToken.substring(0, 20) + "...",
        });
        return NextResponse.json(
          { message: "Security token has already been used. Please refresh and try again." },
          { status: 400 },
        );
      }

      const isValidToken = await verifyTurnstileToken(result.data.turnstileToken, clientIP);
      if (!isValidToken) {
        console.warn("🚫 Invalid Turnstile token:", { ip: clientIP });
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
        console.warn("🚫 Failed to mark token as used (race condition):", { ip: clientIP });
        logSecurityEvent("TOKEN_MARKING_RACE_CONDITION", {
          ip: clientIP,
        });
        return NextResponse.json(
          { message: "Security verification error. Please try again." },
          { status: 400 },
        );
      }

      console.log("✅ Turnstile token verified successfully");
    } else if (process.env.NODE_ENV === "production") {
      // In production, require Turnstile token
      console.warn("❌ Missing Turnstile token in production:", { ip: clientIP });
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
      console.log("Signup failed: Email already in use:", email);
      logSecurityEvent("DUPLICATE_EMAIL_SIGNUP", {
        ip: clientIP,
        email,
      });
      return NextResponse.json({ message: "Email already in use" }, { status: 400 });
    }

    // REMOVED: Password hashing - password will be set during registration completion

    // Test database connection
    console.log("Testing database connection...");
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("Database connection successful");
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      throw new Error("Database connection failed");
    }

    // Create user and student profile in a transaction
    console.log("Starting database transaction...");
    console.log("Data to create:", {
      name,
      email: email.toLowerCase(),
      phone: phone || null,
      level,
      maxLessonsPerWeek,
      emergencyContact: emergencyContact || null,
      parentConsent,
    });

    const user = await prisma.$transaction(async (tx) => {
      console.log("Creating user...");
      // Create user first (ID auto-generated by Prisma) - NO PASSWORD YET
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: null, // Password will be set during registration completion
          role: "STUDENT",
        },
      });
      console.log("User created successfully:", newUser.id);

      console.log("Creating student profile...");
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
      console.log("Student profile created successfully:", student.id);

      return {
        ...newUser,
        Student: student,
      };
    });
    console.log("Transaction completed successfully");

    // Send welcome email after successful user creation (don't fail if email fails)
    console.log("=== EMAIL SENDING ATTEMPT ===");
    console.log("RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
    console.log("RESEND_API_KEY length:", process.env.RESEND_API_KEY?.length || 0);
    console.log("Sending welcome email to:", user.email);

    try {
      const emailResult = await sendWelcomeEmail(user.email, user.name || "");
      console.log("✅ Welcome email sent successfully:", emailResult);
    } catch (emailError) {
      console.error("❌ Failed to send welcome email:", emailError);
      // Don't fail the whole signup if email fails
    }

    console.log("=== EMAIL SENDING COMPLETE ===");

    // Return success with user data (excluding password)
    const { password: _, ...userData } = user;
    return NextResponse.json(
      {
        message: "Account created successfully",
        user: userData,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating user:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        message: "Failed to create account",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
