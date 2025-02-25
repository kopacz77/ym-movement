import { createTRPCRouter } from '@/lib/trpc';
import { adminRouter } from '@/features/admin/api/queries/index';

export const appRouter = createTRPCRouter({
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;