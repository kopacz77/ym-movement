import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateAuthUrl } from "@/lib/google/oauth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coach = await prisma.coach.findUnique({
    where: { userId: session.user.id },
  });

  if (!coach) {
    return NextResponse.json({ error: "Coach profile not found" }, { status: 403 });
  }

  const url = generateAuthUrl(coach.id);
  return NextResponse.redirect(url);
}
