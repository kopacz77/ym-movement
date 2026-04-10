"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "COACH" | "STUDENT";
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
    if (status === "authenticated" && session?.user) {
      // Use session data directly — role is already in the JWT token
      setUser({
        id: session.user.id as string,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role as User["role"],
      });
    } else if (status === "unauthenticated") {
      setUser(null);
    }
  }, [session, status]);

  const logout = useCallback(async () => {
    try {
      // Clear user state first to prevent React warnings
      setUser(null);

      // Use the Next.js signOut with proper URL configuration
      await signOut({
        redirect: false,
        callbackUrl: "/auth/login",
      });

      // Small delay to ensure cleanup completes before navigation
      setTimeout(() => {
        router.push("/auth/login");
      }, 100);
    } catch (error) {
      console.error("Logout error:", error);
      // Force navigation even if signOut fails
      router.push("/auth/login");
    }
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
