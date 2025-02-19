import { createTRPCRouter } from '@/lib/trpc';
import { analyticsRouter } from '@/features/admin/api/queries/analyticsQueries';
import { scheduleRouter } from '@/features/admin/api/queries/scheduleQueries';
import { studentRouter } from '@/features/admin/api/queries/studentQueries';

// First combine all admin routers into a single router
const combinedAdminRouter = createTRPCRouter({
  // Analytics routes
  getOverview: analyticsRouter.getOverview,
  getRevenueReport: analyticsRouter.getRevenueReport,
  getStudentActivity: analyticsRouter.getStudentActivity,
  // Student routes
  getStudents: studentRouter.getStudents,
  getPendingApprovals: studentRouter.getPendingApprovals,
  createStudent: studentRouter.createStudent,
  updateStudent: studentRouter.updateStudent,
  deleteStudent: studentRouter.deleteStudent,
  // Schedule routes
  getRinks: scheduleRouter.getRinks,
  getTimeSlots: scheduleRouter.getTimeSlots,
  createTimeSlot: scheduleRouter.createTimeSlot,
  createRecurringPattern: scheduleRouter.createRecurringPattern,
  createLesson: scheduleRouter.createLesson,
  cancelLesson: scheduleRouter.cancelLesson,
  createBulkTimeSlots: scheduleRouter.createBulkTimeSlots,
});

// Then create the app router with the combined admin router
export const appRouter = createTRPCRouter({
  admin: combinedAdminRouter,
});

export type AppRouter = typeof appRouter;
