// app/(protected)/student/schedule/page.tsx

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StudentScheduleClient from "./client"; // We'll create this file next

export const metadata: Metadata = {
  title: "My Schedule",
  description: "View and manage your scheduled lessons",
};

// Add this function to fix Next.js 15.2.1 typing issues
export function generateStaticParams() {
  return [];
}

export default async function Page() {
  // Auth check
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  // Get the student profile
  const student = await prisma.student.findFirst({
    where: {
      userId: session.user.id,
    },
  });

  if (!student) {
    // Redirect if user doesn't have a student profile
    redirect("/student/profile");
  }

  // Render the client component without passing any problematic props
  return <StudentScheduleClient />;
}
