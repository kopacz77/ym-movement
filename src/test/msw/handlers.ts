import { HttpResponse, http } from "msw";
import {
  adminOverview,
  revenueBreakdown,
  revenueReportData,
  studentActivity,
} from "./fixtures/admin";
import { todayTimeSlots } from "./fixtures/scheduling";

// TRPC uses batched HTTP requests to /api/trpc/<procedure>
// MSW intercepts these at the HTTP level

function trpcQuery(procedure: string, data: unknown) {
  return http.get(`*/api/trpc/${procedure}`, () => {
    return HttpResponse.json([{ result: { data } }]);
  });
}

export const adminHandlers = [
  trpcQuery("admin.analytics.getOverview", adminOverview),
  trpcQuery("admin.analytics.getRevenueReport", revenueReportData),
  trpcQuery("admin.analytics.getRevenueBreakdown", revenueBreakdown),
  trpcQuery("admin.analytics.getStudentActivity", studentActivity),
  trpcQuery("admin.schedule.getTimeSlots", todayTimeSlots),
];

export const handlers = [...adminHandlers];
