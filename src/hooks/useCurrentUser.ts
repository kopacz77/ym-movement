import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function useCurrentUser() {
  const { data: session } = useSession();
  const [studentId, setStudentId] = useState("");

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
            } else {
              console.warn("Student profile not found in user data:", userData);
            }
          }
        })
        .catch((err) => {
          console.error("Error fetching user data:", err);
          // Don't throw here to prevent React error boundary triggers
          // The components will handle missing studentId gracefully
        });
    }

    return () => {
      isMounted = false;
    };
  }, [session]);

  return {
    id: studentId || "", // This will be the student ID for student users
    userId: session?.user?.id || "",
    email: session?.user?.email || "",
    name: session?.user?.name || "",
    role: session?.user?.role || "",
  };
}
