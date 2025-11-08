import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import superjson from "superjson";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type TRPCContext = {
  prisma: typeof prisma;
  session: Session | null;
};

export const createTRPCContext = async (
  opts: CreateNextContextOptions | { headers: Headers },
): Promise<TRPCContext> => {
  let session = null;

  // Handle both Next.js Pages Router and App Router
  if ("req" in opts && "res" in opts) {
    session = await getServerSession(opts.req, opts.res, authOptions);
  } else {
    session = await getServerSession(authOptions);
  }

  return {
    prisma,
    session,
  };
};

/**
 * Sanitize error messages to prevent information leakage
 * Removes file paths, database details, and other sensitive information
 */
function sanitizeErrorMessage(message: string): string {
  return message
    // Remove file paths (Unix and Windows)
    .replace(/\/[^\s]+\.(ts|js|tsx|jsx)/gi, '[file]')
    .replace(/[A-Z]:\\[^\s]+\.(ts|js|tsx|jsx)/gi, '[file]')
    // Remove database errors
    .replace(/prisma[^\s]*/gi, 'database')
    .replace(/postgres[^\s]*/gi, 'database')
    // Remove stack traces
    .replace(/at\s+[^\n]+/g, '')
    // Remove sensitive paths
    .replace(/node_modules[^\s]*/gi, '[package]');
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

    let sanitizedMessage: string;

    if (process.env.NODE_ENV === "production") {
      if (isSafeError) {
        // Sanitize even safe errors to remove technical details
        sanitizedMessage = sanitizeErrorMessage(error.message);
      } else {
        // Generic message for internal errors
        sanitizedMessage = "An unexpected error occurred. Please try again later.";
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
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  if (ctx.session.user.role !== "ADMIN") {
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

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
export const adminProcedure = t.procedure.use(isAdmin);
