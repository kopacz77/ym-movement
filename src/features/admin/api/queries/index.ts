import { createTRPCRouter } from '@/lib/trpc';
import { analyticsRouter } from './analyticsQueries';
import { scheduleRouter } from './scheduleQueries';
import { studentRouter } from './studentQueries';
import { paymentRouter } from './paymentQueries';
import { settingsRouter } from './settingsQueries';

export const adminRouter = createTRPCRouter({
  analytics: analyticsRouter,
  schedule: scheduleRouter,
  student: studentRouter,
  payments: paymentRouter,
  settings: settingsRouter,
});