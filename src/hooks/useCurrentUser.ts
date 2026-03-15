import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function useCurrentUser() {
  const { data: session } = useSession();
  const [studentId, setStudentId] = useState("");
  const [coachId, setCoachId] = useState("");
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [isActive, setIsActive] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    // If we have a session and the user is a student, fetch their student profile ID
    if (session?.user && session.user.role === "STUDENT") {
      fetch("/api/auth/me")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then((userData) => {
          if (isMounted) {
            if (userData.Student?.id) {
              setStudentId(userData.Student.id);
              setIsApproved(userData.Student.isApproved ?? false);
              setIsActive(userData.Student.isActive ?? true);
            } else {
              console.warn("Student profile not found in user data:", userData);
              setIsApproved(false);
              setIsActive(false);
            }
          }
        })
        .catch((err) => {
          console.error("Error fetching user data:", err);
          setIsApproved(false);
          setIsActive(false);
          // Don't throw here to prevent React error boundary triggers
          // The components will handle missing studentId gracefully
        });
    } else if (session?.user?.role === "COACH") {
      fetch("/api/auth/me")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then((userData) => {
          if (isMounted) {
            if (userData.Coach?.id) {
              setCoachId(userData.Coach.id);
              setIsApproved(userData.Coach.isApproved ?? false);
              setIsActive(userData.Coach.isActive ?? true);
            } else {
              console.warn("Coach profile not found in user data:", userData);
              setIsApproved(false);
              setIsActive(false);
            }
          }
        })
        .catch((err) => {
          console.error("Error fetching coach data:", err);
          setIsApproved(false);
          setIsActive(false);
        });
    } else if (session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") {
      // Admins are always "approved" and "active"
      setIsApproved(true);
      setIsActive(true);
      // Also fetch Coach profile if exists (SUPER_ADMIN is also a coach)
      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((userData) => {
          if (isMounted && userData?.Coach?.id) {
            setCoachId(userData.Coach.id);
          }
        })
        .catch(() => {
          // Silently fail -- admin access doesn't require coach profile
        });
    }

    return () => {
      isMounted = false;
    };
  }, [session]);

  return {
    id: studentId || coachId || "",
    userId: session?.user?.id || "",
    email: session?.user?.email || "",
    name: session?.user?.name || "",
    role: session?.user?.role || "",
    coachId: coachId || "",
    isApproved: isApproved,
    isActive: isActive,
    isStudent: session?.user?.role === "STUDENT",
    isAdmin: session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN",
    isCoach:
      session?.user?.role === "COACH" ||
      session?.user?.role === "SUPER_ADMIN" ||
      session?.user?.role === "ADMIN",
  };
}
