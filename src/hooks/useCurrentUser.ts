// src/hooks/useCurrentUser.ts
import { DEFAULT_STUDENT_ID } from "@/constants";

export function useCurrentUser() {
  // In the future, this will use real auth
  // For now, return the default user
  return {
    id: DEFAULT_STUDENT_ID,
    // Add other user properties as needed
  };
}