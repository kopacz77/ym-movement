import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcrypt";
// Updated auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days (reduced from 30 for better security)
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
    error: "/auth/login",
  },
  events: {
    async signOut() {
      // Clear any server-side sessions or caches here if needed
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Dynamic import to avoid circular dependency
        const { isAccountLockedOut, recordLoginAttempt, clearLoginAttempts, getLockoutExpiry } =
          await import("@/lib/account-lockout");

        // Check if account is locked out
        const isLocked = await isAccountLockedOut(credentials.email);
        if (isLocked) {
          const lockExpiry = await getLockoutExpiry(credentials.email);
          if (lockExpiry) {
            const minutesRemaining = Math.ceil(
              (lockExpiry.getTime() - new Date().getTime()) / (1000 * 60),
            );
            throw new Error(
              `Account temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`,
            );
          }
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          // Record failed attempt
          await recordLoginAttempt({
            email: credentials.email,
            success: false,
            ipAddress: (req as any)?.headers?.["x-forwarded-for"] || (req as any)?.headers?.["x-real-ip"],
            userAgent: (req as any)?.headers?.["user-agent"],
          });
          return null;
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          // Record failed attempt
          await recordLoginAttempt({
            email: credentials.email,
            success: false,
            ipAddress: (req as any)?.headers?.["x-forwarded-for"] || (req as any)?.headers?.["x-real-ip"],
            userAgent: (req as any)?.headers?.["user-agent"],
          });
          return null;
        }

        // Successful login - clear failed attempts
        await clearLoginAttempts(credentials.email);

        // Record successful attempt
        await recordLoginAttempt({
          email: credentials.email,
          success: true,
          ipAddress: (req as any)?.headers?.["x-forwarded-for"] || (req as any)?.headers?.["x-real-ip"],
          userAgent: (req as any)?.headers?.["user-agent"],
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

/**
 * Generates a cryptographically secure token for password reset
 * @returns A random string token
 */
export function generateResetToken(): string {
  // Use crypto.randomBytes for cryptographically secure random generation
  if (typeof window !== "undefined") {
    // Browser environment
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  // Node.js environment
  const nodeCrypto = require("node:crypto");
  return nodeCrypto.randomBytes(32).toString("hex");
}
