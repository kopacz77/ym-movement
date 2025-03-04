// src/contexts/AuthContext.tsx
"use client";

import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

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
    const fetchUser = async () => {
      if (session?.user) {
        try {
          const response = await fetch("/api/auth/me");
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            await signOut({ redirect: false });
            router.push("/auth/login");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    if (status === "authenticated") {
      fetchUser();
    } else if (status === "unauthenticated") {
      setUser(null);
    }
  }, [session, status, router]);

  const logout = async () => {
    await signOut({ redirect: false });
    router.push("/auth/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: status === "loading",
        isAuthenticated: !!user,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};