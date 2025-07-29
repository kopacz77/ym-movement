"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "ADMIN" | "COACH" | "STUDENT";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
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

  const isLoading = useMemo(() => status === "loading", [status]);
  const isAuthenticated = useMemo(() => !!user, [user]);

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      logout,
    }),
    [user, isLoading, isAuthenticated, logout],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
