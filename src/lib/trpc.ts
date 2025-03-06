import { initTRPC, TRPCError } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export type TRPCContext = {
  prisma: typeof prisma;
  session: any | null;
};

export const createTRPCContext = async (
  opts: CreateNextContextOptions | { headers: Headers }
): Promise<TRPCContext> => {
  let session = null;
  
  // Handle both Next.js Pages Router and App Router
  if ('req' in opts && 'res' in opts) {
    session = await getServerSession(opts.req, opts.res, authOptions);
  } else {
    session = await getServerSession(authOptions);
  }
  
  return {
    prisma,
    session,
  };
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Don't expose internal errors in production
    const isSafeError = error.code === 'BAD_REQUEST' || error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN';
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

// Proper auth middleware without development bypasses
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
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