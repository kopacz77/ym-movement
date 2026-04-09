import { NextResponse } from "next/server";

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_SECRET_LENGTH: process.env.NEXTAUTH_SECRET?.length ?? 0,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "NOT SET",
    DATABASE_URL_SET: !!process.env.DATABASE_URL,
    AUTH_SECRET_SET: !!process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL ?? "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
  };

  // Test DB connection
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    diagnostics.database = "connected";
  } catch (e) {
    diagnostics.database = "FAILED: " + (e instanceof Error ? e.message : String(e));
  }

  // Test auth import
  try {
    const { auth } = await import("@/lib/auth");
    diagnostics.authImport = "OK";
  } catch (e) {
    diagnostics.authImport = "FAILED: " + (e instanceof Error ? e.message : String(e));
  }

  return NextResponse.json(diagnostics);
}
