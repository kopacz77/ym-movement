import { initTRPC, TRPCError } from "@trpc/server";
import type { Session } from "next-auth";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole, isCoachRole } from "@/lib/roles";
import { authRateLimiter, getClientIP, logSecurityEvent } from "@/lib/security";

export type TRPCContext = {
  prisma: typeof prisma;
  session: Session | null;
  clientIP: string;
};

export const createTRPCContext = async (opts: { headers: Headers }): Promise<TRPCContext> => {
  const session = await auth();
  const clientIP = getClientIP(opts.headers);

  return {
    prisma,
    session,
    clientIP,
  };
};

/**
 * Sanitize error messages to prevent information leakage
 * Removes file paths, database details, and other sensitive information
 */
function sanitizeErrorMessage(message: string): string {
  return (
    message
      // Remove file paths (Unix and Windows)
      .replace(/\/[^\s]+\.(ts|js|tsx|jsx)/gi, "[file]")
      .replace(/[A-Z]:\\[^\s]+\.(ts|js|tsx|jsx)/gi, "[file]")
      // Remove database errors
      .replace(/prisma[^\s]*/gi, "database")
      .replace(/postgres[^\s]*/gi, "database")
      // Remove stack traces
      .replace(/at\s+[^\n]+/g, "")
      // Remove sensitive paths
      .replace(/node_modules[^\s]*/gi, "[package]")
  );
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Safe error codes that can be shown to users
    const isSafeError =
      error.code === "BAD_REQUEST" ||
      error.code === "UNAUTHORIZED" ||
      error.code === "FORBIDDEN" ||
      error.code === "NOT_FOUND";

    // Surface the real cause of masked internal errors. The generic client message
    // hides what actually failed; this logs the true cause server-side under a
    // greppable tag and hands the client a short ref id so a report can be traced
    // back to the exact log line. Behavior-neutral: no message text leaks to users.
    let errorRef: string | undefined;
    if (!isSafeError) {
      errorRef = globalThis.crypto.randomUUID().slice(0, 8);
      const cause =
        error.cause instanceof Error
          ? `${error.cause.name}: ${error.cause.message}`
          : String(error.cause ?? "");
      console.error(
        `[trpc-error] ref=${errorRef} code=${error.code} path=${
          shape.data?.path ?? "?"
        } message=${error.message} cause=${cause}`,
      );
    }

    let sanitizedMessage: string;

    if (process.env.NODE_ENV === "production") {
      if (isSafeError) {
        // Sanitize even safe errors to remove technical details
        sanitizedMessage = sanitizeErrorMessage(error.message);
      } else {
        // Generic message for internal errors (with a ref id for log correlation)
        sanitizedMessage = `An unexpected error occurred. Please try again later. (ref: ${errorRef})`;
      }
    } else {
      // Development: show full error for debugging
      sanitizedMessage = error.message;
    }

    return {
      ...shape,
      message: sanitizedMessage,
      data: {
        ...shape.data,
        errorRef,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Proper auth middleware without development bypasses
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  return next({
    ctx: {
      ...ctx,
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

// Admin-only middleware for protected admin routes
// Accepts both ADMIN and SUPER_ADMIN roles via isAdminRole helper
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  if (!isAdminRole(ctx.session.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }

  return next({
    ctx: {
      ...ctx,
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

// Super admin middleware -- strictly requires SUPER_ADMIN role.
const isSuperAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  if (ctx.session.user.role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Super admin access required" });
  }

  return next({
    ctx: {
      ...ctx,
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

// Coach middleware -- accepts COACH, ADMIN, or SUPER_ADMIN roles.
// Looks up the Coach record and passes it into the context.
const isCoach = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  if (!isCoachRole(ctx.session.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
  }

  const coach = await ctx.prisma.coach.findUnique({
    where: { userId: ctx.session.user.id },
  });

  if (!coach) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Coach profile not found" });
  }

  return next({
    ctx: {
      ...ctx,
      coach,
    },
  });
});

// Rate-limiting middleware for public procedures (password reset, signup, etc.)
const isRateLimited = t.middleware(({ ctx, next }) => {
  if (!authRateLimiter.isAllowed(ctx.clientIP)) {
    logSecurityEvent("RATE_LIMIT_EXCEEDED", {
      endpoint: "trpc-public",
      ip: ctx.clientIP,
    });
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again later.",
    });
  }
  return next({ ctx });
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const rateLimitedPublicProcedure = t.procedure.use(isRateLimited);
export const protectedProcedure = t.procedure.use(isAuthed);
export const adminProcedure = t.procedure.use(isAdmin);
export const superAdminProcedure = t.procedure.use(isSuperAdmin);
export const coachProcedure = t.procedure.use(isCoach);
