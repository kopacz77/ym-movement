---
phase: 07-revenue-splits-polish
verified: 2026-03-16T06:00:00Z
status: passed
score: 10/10 must-haves verified
---

# Phase 7: Revenue Splits, Notifications, and Polish Verification Report

**Phase Goal:** The platform tracks per-coach revenue with configurable split percentages, coaches receive relevant notifications, and the dual-role owner experience is polished.
**Verified:** 2026-03-16T06:00:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When a student books a lesson, the coach receives an in-app notification | VERIFIED | bookingQueries.ts lines 420-444: step 9b fetches coachRecord.userId via coach.findUnique, calls createNotification with SUCCESS type linking to /coach/schedule. Non-blocking try/catch. |
| 2 | When a student cancels a lesson, the coach receives a cancellation notification | VERIFIED | bookingQueries.ts lines 578-597: step 6b fetches coachRecord.userId, calls createNotification with WARNING type, reuses existing studentName/lessonType/lateTag variables. Non-blocking try/catch. |
| 3 | When an admin verifies a payment, the coach receives a notification | VERIFIED | paymentQueries.ts lines 231-252: after updatedPayment, checks payment.Lesson?.coachId, fetches coachRecord.userId, calls createNotification with SUCCESS type showing payment amount. Non-blocking try/catch. |
| 4 | When an admin changes a coach's revenue split %, the coach receives a notification | VERIFIED | coachManagementQueries.ts lines 240-256: compares input.revenueSplitPercent vs old coach.revenueSplitPercent, only notifies on actual change. Uses updatedCoach.User.id. INFO type linking to /coach/earnings. Non-blocking try/catch. |
| 5 | Super admin can edit a coach's revenue split % inline from the coach list table | VERIFIED | CoachList.tsx lines 64-134: RevenueSplitCell component with isEditing state, number input (min 0, max 100), save/cancel buttons. Calls updateCoachPricing.useMutation with revenueSplitPercent. Toast on success/error. Invalidates getAllCoaches query. |
| 6 | Super admin can view a Payouts tab on Reports page showing per-coach revenue breakdown | VERIFIED | reports/page.tsx lines 27, 281-291, 319-332: PayoutReport imported, "Payouts" tab added as third tab in TabsList (grid-cols-3), TabsContent renders PayoutReport with period/startDate/endDate props. |
| 7 | Payout report shows each coach's gross revenue, split %, coach payout, platform share, and totals | VERIFIED | PayoutReport.tsx lines 68-153: Summary cards (Total Revenue, Coach Payouts, Platform Revenue), per-coach table with columns (Coach, Split %, Gross Revenue, Coach Payout, Platform Share, Lessons), TableFooter with totals row. Data from getRevenueBreakdown query. |
| 8 | Payout report can be exported as CSV | VERIFIED | PayoutReport.tsx lines 51-66 handleExportCSV calls exportPayoutReportToCSV. export-utils.ts lines 153-193: exportPayoutReportToCSV generates CSV with headers, per-coach rows, and TOTAL row, calls downloadCSV helper. |
| 9 | Admin sidebar shows "Coach View" link when user has Coach record, and coach sidebar shows "Admin View" when user is admin | VERIFIED | AppSidebar.tsx lines 121-143: role=admin && currentUser.coachId shows "Coach View" linking to /coach/dashboard. role=coach && currentUser.isAdmin shows "Admin View" linking to /admin/dashboard. ArrowLeftRight icon. mt-auto positions at bottom. |
| 10 | Mobile sidebar mirrors role-switch links | VERIFIED | AppLayout.tsx lines 183-225: Identical role/currentUser conditionals using SidebarGroup/SidebarMenu/SidebarMenuItem/SidebarMenuButton Radix components. Coach View links to /coach/dashboard, Admin View links to /admin/dashboard. h-4 w-4 icon size. |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/student/api/queries/bookingQueries.ts` | Coach notifications in bookLesson and cancelLesson | VERIFIED (612 lines) | Step 9b (booking) and step 6b (cancellation) both use coachRecord.userId pattern with try/catch |
| `src/features/admin/api/queries/paymentQueries.ts` | Coach notification in verifyPayment | VERIFIED (403 lines) | createNotification import at line 7, coach notification at lines 231-252 |
| `src/features/admin/api/queries/coach/coachManagementQueries.ts` | Coach notification in updateCoachPricing | VERIFIED (342 lines) | createNotification import at line 4, revenue split change notification at lines 240-256 |
| `src/features/admin/components/coaches/management/CoachList.tsx` | Inline revenue split editor | VERIFIED (238 lines) | RevenueSplitCell component lines 64-134, wired to updateCoachPricing mutation |
| `src/features/admin/components/reports/PayoutReport.tsx` | Payout report with per-coach breakdown | VERIFIED (154 lines) | Summary cards, per-coach table, totals footer, CSV export button |
| `src/app/(protected)/admin/reports/page.tsx` | Payouts tab added to reports page | VERIFIED (399 lines) | PayoutReport imported line 27, Payouts TabsTrigger line 288, TabsContent lines 319-332 |
| `src/lib/export-utils.ts` | exportPayoutReportToCSV function | VERIFIED (382 lines) | Function at lines 153-193, downloadCSV exported at line 136 |
| `src/components/layout/AppSidebar.tsx` | Desktop sidebar with role-switch links | VERIFIED (155 lines) | useCurrentUser imported line 19, Coach View/Admin View links lines 121-143, flex flex-col on nav container |
| `src/components/layout/AppLayout.tsx` | Mobile sidebar with role-switch links | VERIFIED (256 lines) | useCurrentUser imported line 20, Coach View/Admin View SidebarGroups lines 183-225 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| bookingQueries.ts | notificationHelpers.ts | createNotification with coachRecord.userId | WIRED | Lines 433-438 (booking), lines 586-591 (cancellation). createNotification import at line 7. |
| paymentQueries.ts | notificationHelpers.ts | createNotification with coachRecord.userId | WIRED | Lines 239-247. createNotification import at line 7. |
| coachManagementQueries.ts | notificationHelpers.ts | createNotification with updatedCoach.User.id | WIRED | Lines 246-252. createNotification import at line 4. |
| CoachList.tsx | coachManagementQueries.ts | updateCoachPricing.useMutation | WIRED | Line 69: api.admin.coach.management.updateCoachPricing.useMutation. Line 117: mutate call with coachId and revenueSplitPercent. |
| PayoutReport.tsx | superAdminQueries.ts | getRevenueBreakdown.useQuery | WIRED | Line 27: api.admin.superAdmin.getRevenueBreakdown.useQuery({startDate, endDate}). Data consumed for summary cards and table. |
| reports/page.tsx | PayoutReport.tsx | component import and tab rendering | WIRED | Line 27: import PayoutReport. Lines 325-328: <PayoutReport period={period} startDate={dateRange.start} endDate={dateRange.end} /> |
| AppSidebar.tsx | useCurrentUser hook | hook call to get coachId and isAdmin | WIRED | Line 19: import, line 61: const currentUser = useCurrentUser(). Line 122: currentUser.coachId. Line 133: currentUser.isAdmin. |
| AppLayout.tsx | useCurrentUser hook | hook call for mobile sidebar role-switch | WIRED | Line 20: import, line 82: const currentUser = useCurrentUser(). Line 184: currentUser.coachId. Line 205: currentUser.isAdmin. |
| getRevenueBreakdown | database (Coach + Payment) | Prisma queries | WIRED | superAdminQueries.ts lines 198-240: queries coach.findMany, payment.aggregate with coachId filter, lesson.count. Calculates splitMultiplier, coachPayout, platformRevenue. Returns coaches[] and totals. |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| INTG-02: Per-coach revenue split percentages are configurable by super admin, tracking amounts owed per coach | SATISFIED | revenueSplitPercent field on Coach model (default 70%). Inline editor in CoachList via RevenueSplitCell. getRevenueBreakdown calculates per-coach payout and platform share. PayoutReport displays breakdown with totals. CSV export available. |
| INTG-03: Coaches receive booking confirmation, cancellation, and payment notifications for their lessons | SATISFIED | Four notification trigger points: bookLesson (SUCCESS), cancelLesson (WARNING), verifyPayment (SUCCESS), updateCoachPricing (INFO). All use coachRecord.userId pattern. All non-blocking with try/catch. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No TODO, FIXME, placeholder, or stub patterns found in any modified file |

**Type check:** `pnpm type-check` passes with zero errors.

### Human Verification Required

### 1. Visual inline split editor
**Test:** Navigate to Admin > Coaches. Click the pencil icon next to a coach's revenue split %. Change the value and click save.
**Expected:** Input field appears with save/cancel buttons. After save, toast says "Revenue split updated" and value updates in the table.
**Why human:** Visual interaction and toast notification need browser testing.

### 2. Payout report data accuracy
**Test:** Navigate to Admin > Reports > Payouts tab. Verify the per-coach breakdown numbers (gross revenue, coach payout %, platform share) are mathematically correct.
**Expected:** Coach Payout = Gross Revenue x Split%. Platform Share = Gross Revenue - Coach Payout. Totals row sums correctly.
**Why human:** Requires checking actual data values against known test data.

### 3. Role-switch navigation flow
**Test:** Log in as Yura (SUPER_ADMIN with Coach record). From admin dashboard, look for "Coach View" link at bottom of sidebar. Click it.
**Expected:** Navigates to /coach/dashboard. Coach sidebar should now show "Admin View" link at bottom.
**Why human:** Requires authenticated session with dual-role user account.

### 4. Mobile sidebar role-switch
**Test:** On a mobile viewport (or browser dev tools), open the hamburger menu. Verify "Coach View" / "Admin View" link appears below the main navigation with a separator.
**Expected:** Link appears in a visually separated section at the bottom, uses ArrowLeftRight icon.
**Why human:** Requires visual inspection on mobile viewport.

### 5. Coach notification delivery
**Test:** As a student, book a lesson assigned to a coach. Then log in as that coach and check notifications.
**Expected:** Coach sees "New Lesson Booked" notification with student name, lesson type, and date, linking to /coach/schedule.
**Why human:** Requires end-to-end flow across multiple user sessions.

### 6. CSV payout export content
**Test:** On Payouts tab, click "Export Payouts CSV". Open the downloaded file.
**Expected:** CSV has headers (Coach, Split %, Gross Revenue, Coach Payout, Platform Share, Lessons), per-coach rows, and a TOTAL row at the bottom.
**Why human:** Requires downloading and inspecting file content.

### Gaps Summary

No gaps found. All 10 must-haves verified across all three levels (existence, substantive, wired):

- **Plan 07-01 (Coach Notifications):** Four notification trigger points implemented in bookingQueries.ts, paymentQueries.ts, and coachManagementQueries.ts. All use the correct coachRecord.userId pattern (not coachId). All are non-blocking with try/catch.
- **Plan 07-02 (Revenue Split Config + Payout Report):** Inline RevenueSplitCell editor in CoachList.tsx wired to updateCoachPricing mutation. PayoutReport.tsx component with summary cards, per-coach table, and totals footer. Payouts tab added to Reports page. exportPayoutReportToCSV in export-utils.ts with TOTAL row.
- **Plan 07-03 (Dual-Role Navigation):** "Coach View" and "Admin View" links in both desktop (AppSidebar.tsx) and mobile (AppLayout.tsx) sidebars. Conditional on useCurrentUser().coachId and .isAdmin. ArrowLeftRight icon. Sidebar immutable standards preserved (w-64, h-24, color scheme unchanged).

The backend infrastructure (`getRevenueBreakdown` query in superAdminQueries.ts) correctly calculates per-coach splits using `coach.revenueSplitPercent / 100` multiplier against completed payment aggregates.

---

_Verified: 2026-03-16T06:00:00Z_
_Verifier: Claude (gsd-verifier)_
