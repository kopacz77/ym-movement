// src/contexts/OptimizedAuthContext.tsx
"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { AuthContextSelector, type AuthState } from "@/lib/context-utils";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "ADMIN" | "COACH" | "STUDENT";
}

export const OptimizedAuthProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Create an abort controller for cleanup
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchUser = async () => {
      if (session?.user) {
        try {
          const response = await fetch("/api/auth/me", { signal });

          if (!response.ok) {
            // Handle failed fetch
            await signOut({ redirect: false });
            router.push("/auth/login");
            return;
          }

          const userData = await response.json();

          // Only update state if component is still mounted
          if (!signal.aborted) {
            setUser(userData);
          }
        } catch (error) {
          // Only process error if not caused by abort
          if (!signal.aborted) {
            console.error("Error fetching user data:", error);
            await signOut({ redirect: false });
            router.push("/auth/login");
          }
        }
      }
    };

    if (status === "authenticated") {
      fetchUser();
    } else if (status === "unauthenticated") {
      setUser(null);
    }

    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [session, status, router]);

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    router.push("/auth/login");
  }, [router]);

  const authState: AuthState = useMemo(
    () => ({
      user,
      isLoading: status === "loading",
      isAuthenticated: !!user,
      logout,
    }),
    [user, status, logout],
  );

  return (
    <AuthContextSelector.Provider value={authState}>
      {children}
    </AuthContextSelector.Provider>
  );
};

// Export optimized selectors
export { useAuthUser, useAuthStatus, useAuthActions } from "@/lib/context-utils";