import { adminRouter } from "@/features/admin/api/queries/index";
import { notificationsRouter } from "@/features/notifications/api/queries/index";
import { studentRouter } from "@/features/student/api/queries/index";
// src/lib/root.ts
import { createTRPCRouter } from "@/lib/trpc";
import { passwordResetRouter } from "@/server/api/routers/passwordReset";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  student: studentRouter,
  notifications: notificationsRouter,
  passwordReset: passwordResetRouter, // Added passwordResetRouter
});

export type AppRouter = typeof appRouter;
