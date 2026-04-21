import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Data Integrity Health Check
 * Returns row counts for critical tables to verify data is intact.
 * GET /api/health/data
 */
export async function GET() {
  try {
    const [users, students, rinks, timeSlots, lessons, payments] = await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.rink.count(),
      prisma.rinkTimeSlot.count(),
      prisma.lesson.count(),
      prisma.payment.count(),
    ]);

    const counts = {
      users,
      students,
      rinks,
      timeSlots,
      lessons,
      payments,
    };

    const warnings: string[] = [];
    if (timeSlots === 0) {
      warnings.push("RinkTimeSlot table is empty");
    }
    if (lessons === 0) {
      warnings.push("Lesson table is empty");
    }
    if (payments === 0) {
      warnings.push("Payment table is empty");
    }

    return NextResponse.json(
      {
        status: warnings.length > 0 ? "warning" : "healthy",
        timestamp: new Date().toISOString(),
        counts,
        ...(warnings.length > 0 && { warnings }),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        message: "Failed to query database",
      },
      { status: 503 },
    );
  }
}
