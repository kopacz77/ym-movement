import { adminRouter } from "@/features/admin/api/queries/index";
import { coachRouter } from "@/features/coach/api/queries/index";
import { notificationsRouter } from "@/features/notifications/api/queries/index";
import { studentRouter } from "@/features/student/api/queries/index";
import { wardrobeRouter } from "@/features/wardrobe/api/queries/index";
// src/lib/root.ts
import { createTRPCRouter } from "@/lib/trpc";
import { passwordResetRouter } from "@/server/api/routers/passwordReset";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  coach: coachRouter,
  student: studentRouter,
  notifications: notificationsRouter,
  passwordReset: passwordResetRouter,
  wardrobe: wardrobeRouter,
});

export type AppRouter = typeof appRouter;
