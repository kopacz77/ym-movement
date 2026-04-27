import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardRedirect() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const role = (session.user as any).role as string;

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    redirect("/admin/dashboard");
  } else if (role === "COACH") {
    redirect("/coach/dashboard");
  } else if (role === "STUDENT") {
    redirect("/student/dashboard");
  }

  redirect("/auth/login");
}
