import { createTRPCRouter } from "@/lib/trpc";
import { dashboardRouter } from "./dashboardQueries";
import { earningsRouter } from "./earningsQueries";
import { profileRouter } from "./profileQueries";
import { proposalRouter } from "./proposalQueries";
import { scheduleRouter } from "./scheduleQueries";
import { coachStudentsRouter } from "./studentQueries";

export const coachRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  profile: profileRouter,
  earnings: earningsRouter,
  students: coachStudentsRouter,
  proposals: proposalRouter,
  schedule: scheduleRouter,
});
