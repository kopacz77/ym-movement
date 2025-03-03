import { createTRPCRouter } from '@/lib/trpc';
import { analyticsRouter } from '@/features/admin/api/queries/analyticsQueries';
import { scheduleRouter } from '@/features/admin/api/queries/scheduleQueries';
import { studentRouter } from '@/features/admin/api/queries/studentQueries';
import { paymentRouter } from '@/features/admin/api/queries/paymentQueries';
import { settingsRouter } from '@/features/admin/api/queries/settingsQueries';

/* Instead of flattening the routers via the spread operator, we now nest them under distinct namespaces */
export const adminRouter = createTRPCRouter({
  analytics: analyticsRouter,
  schedule: scheduleRouter,
  student: studentRouter,
  payments: paymentRouter,
  settings: settingsRouter,
});

export const appRouter = createTRPCRouter({
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;