import { prisma } from "@/lib/prisma";
// src/app/api/auth/validate-reset-token/route.ts
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Get token from query parameters
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find the reset token with raw query
    const results = await prisma.$queryRaw`
      SELECT t.expires 
      FROM "PasswordResetToken" t
      WHERE t.token = ${token}
    `;

    const tokenData = Array.isArray(results) && results.length > 0 ? results[0] : null;

    // Check if token exists
    if (!tokenData) {
      return NextResponse.json({ valid: false, message: "Invalid token" }, { status: 200 });
    }

    // Check if token is expired
    const now = new Date();
    const expires = new Date(tokenData.expires);

    if (now > expires) {
      return NextResponse.json({ valid: false, message: "Token has expired" }, { status: 200 });
    }

    // Token is valid
    return NextResponse.json({ valid: true }, { status: 200 });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { error: "An error occurred while validating the token" },
      { status: 500 },
    );
  }
}
