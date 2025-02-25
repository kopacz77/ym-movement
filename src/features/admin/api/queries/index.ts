import { createTRPCRouter } from '@/lib/trpc';
import { analyticsRouter } from '@/features/admin/api/queries/analyticsQueries';
import { scheduleRouter } from '@/features/admin/api/queries/scheduleQueries';
import { studentRouter } from '@/features/admin/api/queries/studentQueries';

/* Instead of flattening the routers via the spread operator, we now nest them under distinct namespaces */
export const adminRouter = createTRPCRouter({
  analytics: analyticsRouter,
  schedule: scheduleRouter,
  student: studentRouter,
});

export const appRouter = createTRPCRouter({
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;