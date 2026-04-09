import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days (reduced from 30 for better security)
    updateAge: 24 * 60 * 60, // Update session every 24 hours
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
    Credentials({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Dynamic import to avoid circular dependency
        const { isAccountLockedOut, recordLoginAttempt, clearLoginAttempts, getLockoutExpiry } =
          await import("@/lib/account-lockout");

        // Check if account is locked out
        const isLocked = await isAccountLockedOut(email);
        if (isLocked) {
          const lockExpiry = await getLockoutExpiry(email);
          if (lockExpiry) {
            const minutesRemaining = Math.ceil((lockExpiry.getTime() - Date.now()) / (1000 * 60));
            throw new Error(
              `Account temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`,
            );
          }
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          // Record failed attempt (no req available in v5 authorize)
          await recordLoginAttempt({
            email,
            success: false,
          });
          return null;
        }

        const isPasswordValid = await compare(password, user.password);

        if (!isPasswordValid) {
          // Record failed attempt
          await recordLoginAttempt({
            email,
            success: false,
          });
          return null;
        }

        // Successful login - clear failed attempts
        await clearLoginAttempts(email);

        // Record successful attempt
        await recordLoginAttempt({
          email,
          success: true,
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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      // On session update trigger, refresh role from database
      // This allows role changes (e.g., ADMIN -> SUPER_ADMIN) to propagate without re-login
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
        }
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
});
