import { hash } from "bcrypt";
// src/app/api/auth/reset-password/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authRateLimiter, logSecurityEvent, validatePasswordStrength } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIP =
      req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!authRateLimiter.isAllowed(clientIP)) {
      logSecurityEvent("RATE_LIMIT_EXCEEDED", {
        endpoint: "/api/auth/reset-password",
        ip: clientIP,
      });
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      logSecurityEvent("WEAK_PASSWORD_ATTEMPT", {
        endpoint: "/api/auth/reset-password",
        ip: clientIP,
        errors: passwordValidation.errors,
      });
      return NextResponse.json(
        {
          error: "Password does not meet security requirements",
          details: passwordValidation.errors,
        },
        { status: 400 },
      );
    }

    // Find the reset token using raw query to avoid type issues
    const tokenResults = await prisma.$queryRaw`
      SELECT t.id, t."userId" 
      FROM "PasswordResetToken" t
      WHERE t.token = ${token}
    `;

    const passwordResetToken =
      Array.isArray(tokenResults) && tokenResults.length > 0 ? tokenResults[0] : null;

    // Check if token exists and is valid
    if (!passwordResetToken) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    // Check if token is expired
    const tokenWithExpiry = await prisma.$queryRaw`
      SELECT t.expires
      FROM "PasswordResetToken" t
      WHERE t.id = ${passwordResetToken.id}
    `;

    const now = new Date();
    const tokenExpiry =
      Array.isArray(tokenWithExpiry) && tokenWithExpiry.length > 0
        ? new Date(tokenWithExpiry[0].expires)
        : null;

    if (tokenExpiry && now > tokenExpiry) {
      // Delete the expired token
      await prisma.$executeRaw`
        DELETE FROM "PasswordResetToken" 
        WHERE id = ${passwordResetToken.id}
      `;

      return NextResponse.json({ error: "Reset token has expired" }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await hash(password, 10);

    // Update user's password
    await prisma.user.update({
      where: { id: passwordResetToken.userId },
      data: { password: hashedPassword },
    });

    // Delete the used token
    await prisma.$executeRaw`
      DELETE FROM "PasswordResetToken" 
      WHERE id = ${passwordResetToken.id}
    `;

    return NextResponse.json({ message: "Password has been reset successfully" }, { status: 200 });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "An error occurred while resetting your password" },
      { status: 500 },
    );
  }
}
