import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { clearLoginAttempts, getLockoutExpiry, isAccountLockedOut, recordLoginAttempt } from "@/lib/account-lockout";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        // Run lockout check and user lookup in parallel to save a DB round trip
        const [isLocked, user] = await Promise.all([
          isAccountLockedOut(email),
          prisma.user.findUnique({
            where: { email },
            include: {
              Student: { select: { id: true, isApproved: true, isActive: true } },
              Coach: { select: { id: true, isApproved: true, isActive: true } },
            },
          }),
        ]);

        if (isLocked) {
          const lockExpiry = await getLockoutExpiry(email);
          if (lockExpiry) {
            const minutesRemaining = Math.ceil((lockExpiry.getTime() - Date.now()) / (1000 * 60));
            throw new Error(
              `Account temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`,
            );
          }
        }

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

        // Successful login - clear failed attempts (fire-and-forget, not needed for response)
        clearLoginAttempts(email).catch(() => {});
        recordLoginAttempt({ email, success: true }).catch(() => {});

        // Determine profile IDs and approval status
        const studentId = user.Student?.id ?? null;
        const coachId = user.Coach?.id ?? null;
        const isApproved = user.role === "ADMIN" || user.role === "SUPER_ADMIN"
          ? true
          : (user.Student?.isApproved ?? user.Coach?.isApproved ?? null);
        const isActive = user.role === "ADMIN" || user.role === "SUPER_ADMIN"
          ? true
          : (user.Student?.isActive ?? user.Coach?.isActive ?? null);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          studentId,
          coachId,
          isApproved,
          isActive,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.studentId = user.studentId;
        token.coachId = user.coachId;
        token.isApproved = user.isApproved;
        token.isActive = user.isActive;
      }
      // On session update trigger, refresh profile data from database
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            Student: { select: { id: true, isApproved: true, isActive: true } },
            Coach: { select: { id: true, isApproved: true, isActive: true } },
          },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.studentId = dbUser.Student?.id ?? null;
          token.coachId = dbUser.Coach?.id ?? null;
          token.isApproved = dbUser.role === "ADMIN" || dbUser.role === "SUPER_ADMIN"
            ? true
            : (dbUser.Student?.isApproved ?? dbUser.Coach?.isApproved ?? null);
          token.isActive = dbUser.role === "ADMIN" || dbUser.role === "SUPER_ADMIN"
            ? true
            : (dbUser.Student?.isActive ?? dbUser.Coach?.isActive ?? null);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.studentId = token.studentId as string | null;
        session.user.coachId = token.coachId as string | null;
        session.user.isApproved = token.isApproved as boolean | null;
        session.user.isActive = token.isActive as boolean | null;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
});
