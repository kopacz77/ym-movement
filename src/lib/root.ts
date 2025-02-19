import { createTRPCRouter } from '@/lib/trpc';
import { analyticsRouter } from '@/features/admin/api/queries/analyticsQueries';
import { scheduleRouter } from '@/features/admin/api/queries/scheduleQueries';
import { studentRouter } from '@/features/admin/api/queries/studentQueries';

export const appRouter = createTRPCRouter({
  admin: createTRPCRouter({
    ...analyticsRouter,
    ...scheduleRouter,
    ...studentRouter, // Now including student queries (e.g., getPendingApprovals)
  }),
});

export type AppRouter = typeof appRouter;
