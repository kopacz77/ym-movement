import { generateResetToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
// src/app/api/auth/forgot-password/route.ts
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // We don't want to reveal if a user exists or not for security reasons
    if (!user) {
      return NextResponse.json(
        { message: "If your email exists in our system, you will receive a password reset link" },
        { status: 200 },
      );
    }

    try {
      // Delete any existing reset tokens for this user
      await prisma.$executeRaw`DELETE FROM "PasswordResetToken" WHERE "userId" = ${user.id}`;

      // Generate reset token
      const token = generateResetToken();

      // Set token expiration (24 hours from now)
      const expires = new Date();
      expires.setHours(expires.getHours() + 24);

      // Create password reset token in database
      await prisma.$executeRaw`
        INSERT INTO "PasswordResetToken" ("id", "userId", "token", "expires", "createdAt")
        VALUES (gen_random_uuid(), ${user.id}, ${token}, ${expires}, NOW())
      `;

      // Construct reset URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      // Send reset email
      await sendPasswordResetEmail(email, user.name || "User", token);

      return NextResponse.json(
        { message: "If your email exists in our system, you will receive a password reset link" },
        { status: 200 },
      );
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);

      // Delete the token if email sending fails
      await prisma.$executeRaw`DELETE FROM "PasswordResetToken" WHERE "userId" = ${user.id}`;

      return NextResponse.json({ error: "Failed to send password reset email" }, { status: 500 });
    }
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 },
    );
  }
}
