import { NextResponse } from "next/server";

export async function GET() {
  const info: Record<string, unknown> = {
    nodeEnv: process.env.NODE_ENV,
    hasDbUrl: !!process.env.DATABASE_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    secretLength: process.env.NEXTAUTH_SECRET?.length,
  };

  // Test prisma import
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    info.prisma = "ok";
  } catch (e) {
    info.prisma = String(e);
  }

  // Test auth import
  try {
    await import("@/lib/auth");
    info.auth = "ok";
  } catch (e) {
    info.auth = String(e);
  }

  return NextResponse.json(info);
}
