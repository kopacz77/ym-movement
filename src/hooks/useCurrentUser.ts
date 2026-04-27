import { useSession } from "next-auth/react";

export function useCurrentUser() {
  const { data: session } = useSession();
  const user = session?.user;

  return {
    id: user?.studentId || user?.coachId || "",
    userId: user?.id || "",
    email: user?.email || "",
    name: user?.name || "",
    role: user?.role || "",
    coachId: user?.coachId || "",
    isApproved: user?.isApproved ?? null,
    isActive: user?.isActive ?? null,
    isStudent: user?.role === "STUDENT",
    isAdmin: user?.role === "ADMIN" || user?.role === "SUPER_ADMIN",
    isCoach: user?.role === "COACH" || user?.role === "SUPER_ADMIN" || user?.role === "ADMIN",
  };
}
