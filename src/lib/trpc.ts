import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export type TRPCContext = { 
  prisma: typeof prisma;
  session: any | null;
};

export const createTRPCContext = async (
  opts: CreateNextContextOptions
): Promise<TRPCContext> => {
  const session = await getServerSession(opts.req, opts.res, authOptions);
  return { 
    prisma,
    session,
  };
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Don't expose internal errors in production
    const isSafeError = 
      error.code === 'BAD_REQUEST' || 
      error.code === 'UNAUTHORIZED' || 
      error.code === 'FORBIDDEN';
      
    const sanitizedMessage = process.env.NODE_ENV === 'production' && !isSafeError
      ? 'An unexpected error occurred' 
      : error.message;
    
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

export const createTRPCRouter = t.router;

// Regular public procedure - no auth needed
export const publicProcedure = t.procedure;

// This implementation maintains backward compatibility by keeping the same behavior
// in development but adding real auth checks in production
export const protectedProcedure = process.env.NODE_ENV === 'development' 
  ? t.procedure // Keep existing behavior in development
  : t.procedure.use(({ ctx, next }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }
      return next({
        ctx: { 
          ...ctx,
          // Include user in context for downstream consumers
          session: { ...ctx.session, user: ctx.session.user },
        },
      });
    });