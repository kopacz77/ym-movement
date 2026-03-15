// src/features/admin/api/queries/coach/index.ts
import { createTRPCRouter } from "@/lib/trpc";
import { coachApprovalRouter } from "./coachApprovalQueries";
import { coachManagementRouter } from "./coachManagementQueries";

export const adminCoachRouter = createTRPCRouter({
  approval: coachApprovalRouter,
  management: coachManagementRouter,
});
