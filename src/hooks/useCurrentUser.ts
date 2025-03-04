// src/hooks/useCurrentUser.ts
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function useCurrentUser() {
  const { data: session } = useSession();
  const [studentId, setStudentId] = useState("");
  
  useEffect(() => {
    // If we have a session and the user is a student, fetch their student profile ID
    if (session?.user && session.user.role === "STUDENT") {
      fetch("/api/auth/me")
        .then(res => res.json())
        .then(userData => {
          if (userData.student?.id) {
            setStudentId(userData.student.id);
          }
        })
        .catch(err => console.error("Error fetching user data:", err));
    }
  }, [session]);
  
  return {
    id: studentId || "", // This will be the student ID for student users
    userId: session?.user?.id || "",
    email: session?.user?.email || "",
    name: session?.user?.name || "",
    role: session?.user?.role || "",
  };
}