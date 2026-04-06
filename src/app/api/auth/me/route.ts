import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        Student:
          session.user.role === "STUDENT"
            ? {
                select: {
                  id: true,
                  level: true,
                  maxLessonsPerWeek: true,
                  isApproved: true,
                  isActive: true,
                },
              }
            : undefined,
        Coach: ["COACH", "SUPER_ADMIN", "ADMIN"].includes(session.user.role)
          ? {
              select: {
                id: true,
                isApproved: true,
                isActive: true,
                suspendedAt: true,
                bio: true,
                skills: true,
              },
            }
          : undefined,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
