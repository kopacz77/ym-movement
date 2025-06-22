import { sendWelcomeEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { authRateLimiter, logSecurityEvent, validatePasswordStrength } from "@/lib/security";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// src/app/api/auth/signup/route.ts
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
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
  maxLessonsPerWeek: z.number().int().positive().default(3),
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
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!authRateLimiter.isAllowed(clientIP)) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { 
        endpoint: '/api/auth/signup',
        ip: clientIP 
      });
      return NextResponse.json(
        { message: "Too many signup attempts. Please try again later." },
        { status: 429 }
      );
    }

    // Parse request body with size limit
    const body = await req.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      logSecurityEvent('INVALID_SIGNUP_DATA', { 
        ip: clientIP,
        errors: result.error.format() 
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
      logSecurityEvent('WEAK_PASSWORD_ATTEMPT', { 
        ip: clientIP,
        email: email.toLowerCase(),
        errors: passwordValidation.errors 
      });
      return NextResponse.json(
        { message: "Password does not meet security requirements", errors: passwordValidation.errors },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      logSecurityEvent('DUPLICATE_EMAIL_SIGNUP', { 
        ip: clientIP,
        email: email.toLowerCase() 
      });
      return NextResponse.json({ message: "Email already in use" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and student profile in a transaction
    const user = await prisma.$transaction(async (prisma) => {
      // Create user
      const newUser = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: "STUDENT",
          student: {
            create: {
              phone,
              level,
              maxLessonsPerWeek,
              emergencyContact,
              parentConsent, // Fixed: Include parentConsent field
            },
          },
        },
        include: {
          student: true,
        },
      });

      // Send welcome email
      await sendWelcomeEmail(newUser.email, newUser.name || "");

      return newUser;
    });

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
    return NextResponse.json({ message: "Failed to create account" }, { status: 500 });
  }
}
