// src/features/admin/api/queries/index.ts 
import { createTRPCRouter } from '@/lib/trpc';
import { analyticsRouter } from './analyticsQueries';
import { studentRouter } from './studentQueries';
import { scheduleRouter } from './scheduleQueries';
import { paymentRouter } from './paymentQueries';
import { settingsRouter } from './settingsQueries';
import { authRouter } from '@/features/auth/api/queries/authQueries';

export const adminRouter = createTRPCRouter({
  analytics: analyticsRouter,
  student: studentRouter,
  schedule: scheduleRouter,
  payment: paymentRouter,
  settings: settingsRouter,
  auth: authRouter, // Add this line
});