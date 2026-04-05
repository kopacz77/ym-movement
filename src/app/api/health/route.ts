import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Health Check Endpoint
 * Used by Docker healthcheck and monitoring systems
 * Returns 200 OK if application is healthy
 */
export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "yura-scheduler",
        database: "connected",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        service: "yura-scheduler",
        database: "disconnected",
      },
      { status: 503 },
    );
  }
}
