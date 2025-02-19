import { createTRPCRouter } from '@/server/api/trpc';
import { adminRouter } from '@/features/admin/api/queries/index'; // Update path to include /index

export const appRouter = createTRPCRouter({
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
