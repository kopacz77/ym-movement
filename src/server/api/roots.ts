import { createTRPCRouter } from '@/server/api/trpc';
import { adminRouter } from '@/features/admin/api/queries/index'; // Ensure the correct path

export const appRouter = createTRPCRouter({
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
