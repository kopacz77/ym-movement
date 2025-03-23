// src/server/api/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * DEVELOPMENT CONFIGURATION
 *
 * This is a simplified tRPC configuration for development purposes.
 * TODO: Before production:
 * - Implement proper session validation
 * - Add proper user context handling
 * - Implement role-based access control
 * - Add proper error handling
 */
const t = initTRPC.context().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;

// Development-only public procedure
// In production, this should check session and permissions
export const publicProcedure = t.procedure;

// Development-only protected procedure
// In production, this will need proper auth checks
export const protectedProcedure = t.procedure;

// When ready for auth, uncomment and modify this:
/*
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: { session: { ...ctx.session, user: ctx.session.user } },
  });
});
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
*/
