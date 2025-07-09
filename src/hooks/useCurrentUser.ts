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
        .then((res) => res.json())
        .then((userData) => {
          if (isMounted && userData.Student?.id) {
            setStudentId(userData.Student.id);
          }
        })
        .catch((err) => console.error("Error fetching user data:", err));
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
