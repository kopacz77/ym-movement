// src/app/api/auth/reset-password/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
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
