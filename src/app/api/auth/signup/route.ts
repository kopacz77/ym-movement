import bcrypt from "bcrypt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
// src/app/api/auth/signup/route.ts
import { z } from "zod";
import { sendWelcomeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { authRateLimiter, logSecurityEvent, validatePasswordStrength } from "@/lib/security";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),
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
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIP =
      req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!authRateLimiter.isAllowed(clientIP)) {
      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        endpoint: "/api/auth/signup",
        ip: clientIP,
      });
      return NextResponse.json(
        { message: "Too many signup attempts. Please try again later." },
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

    const {
      name,
      email,
      password,
      phone,
      level,
      maxLessonsPerWeek,
      emergencyContact,
      parentConsent,
    } = result.data;

    // Additional password validation using security utility
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      console.error("Signup failed: Weak password:", {
        email: email.toLowerCase(),
        errors: passwordValidation.errors,
      });
      logSecurityEvent("WEAK_PASSWORD_ATTEMPT", {
        ip: clientIP,
        email: email.toLowerCase(),
        errors: passwordValidation.errors,
      });
      return NextResponse.json(
        {
          message: "Password does not meet security requirements",
          errors: passwordValidation.errors,
        },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      console.log("Signup failed: Email already in use:", email.toLowerCase());
      logSecurityEvent("DUPLICATE_EMAIL_SIGNUP", {
        ip: clientIP,
        email: email.toLowerCase(),
      });
      return NextResponse.json({ message: "Email already in use" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and student profile in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user first
      const newUser = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: "STUDENT",
        },
      });

      // Create student profile linked to user
      const student = await tx.student.create({
        data: {
          userId: newUser.id,
          phone,
          level,
          maxLessonsPerWeek,
          emergencyContact,
          parentConsent,
        },
      });

      return {
        ...newUser,
        Student: student,
      };
    });

    // Temporarily disable email sending to debug signup issue
    console.log("Skipping welcome email to debug signup issue");

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
    return NextResponse.json({ 
      message: "Failed to create account",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
