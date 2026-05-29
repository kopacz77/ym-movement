import { authRouter } from "@/features/auth/api/queries/authQueries";
// src/features/admin/api/queries/index.ts
import { createTRPCRouter } from "@/lib/trpc";
import { analyticsRouter } from "./analyticsQueries";
import { adminCoachRouter } from "./coach";
import { paymentRouter } from "./paymentQueries";
//import { progressRouter } from "./progressQueries";
import { scheduleRouter } from "./schedule"; // Updated import
import { settingsRouter } from "./settingsQueries";
import { studentRouter } from "./student"; // Updated import
import { superAdminDashboardRouter } from "./superAdminQueries";
import { wardrobeDressRouter } from "./wardrobeDressQueries";
import { wardrobeRentalRouter, wardrobeRequestRouter } from "./wardrobeRequestQueries";
import { wardrobeSettingsRouter } from "./wardrobeSettingsQueries";

export const adminRouter = createTRPCRouter({
  analytics: analyticsRouter,
  coach: adminCoachRouter,
  payment: paymentRouter,
  //progress: progressRouter,
  schedule: scheduleRouter, // Using the refactored schedule router
  settings: settingsRouter,
  wardrobe: wardrobeDressRouter,
  wardrobeSettings: wardrobeSettingsRouter,
  wardrobeRequests: wardrobeRequestRouter,
  wardrobeRentals: wardrobeRentalRouter,
  student: studentRouter, // Using the refactored student router
  superAdmin: superAdminDashboardRouter,
  auth: authRouter,
});
