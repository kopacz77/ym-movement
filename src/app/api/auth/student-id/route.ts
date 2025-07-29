import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized or not a student" }, { status: 401 });
    }

    // Get student ID from user
    const student = await prisma.student.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return NextResponse.json({ message: "Student profile not found" }, { status: 404 });
    }

    return NextResponse.json({ studentId: student.id });
  } catch (error) {
    console.error("Error fetching student ID:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
