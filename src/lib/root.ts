// Primary router definition
import { createTRPCRouter } from "@/lib/trpc";
import { adminRouter } from "@/features/admin/api/queries/index";
import { studentRouter } from "@/features/student/api/queries/index";
import { notificationsRouter } from "@/features/notifications/api/queries/index";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  student: studentRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
