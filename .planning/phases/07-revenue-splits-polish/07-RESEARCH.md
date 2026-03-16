# Phase 7: Revenue Splits, Notifications, and Polish - Research

**Researched:** 2026-03-16
**Domain:** Revenue split calculation, notification routing, dual-role UX
**Confidence:** HIGH

## Summary

Phase 7 is primarily an integration and polish phase. The codebase already has significant infrastructure in place: the `Coach.revenueSplitPercent` field exists (default 70, Yura's at 100), the `getRevenueBreakdown` super admin query already computes per-coach payouts/platform revenue, the `createNotification` helper works with the `Notification` model, and both admin and coach layouts are fully functional. The main gaps are: (1) coach-specific notification triggers in booking/cancellation/payment flows, (2) a dedicated payout report page for the super admin, (3) a revenue split configuration UI on the coach management page, and (4) dual-role navigation for Yura (SUPER_ADMIN who is also a Coach).

This phase is smaller than prior phases because much of the heavy lifting was done in Phases 1-6. The risk areas are: notification delivery to the right users (coach vs admin), ensuring revenue split math is consistent everywhere, and making dual-role switching feel natural.

**Primary recommendation:** Build on existing infrastructure -- add notification triggers to existing mutation flows, enhance existing admin/coach pages with revenue split UI, and add a sidebar link for admin-to-coach switching.

## Standard Stack

### Core (Already in Codebase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TRPC v11 | 11.x | API layer | Already used for all queries/mutations |
| Prisma | Current | Database ORM | Already manages Coach, Payment, Notification models |
| Next.js 15 | 15.x | App Router | Already handles /admin/* and /coach/* routes |
| shadcn/ui | Current | UI Components | Already used for Cards, Tables, Badges, Dialogs |
| Sonner | Current | Toast notifications | Already the app-wide toast system |
| date-fns | Current | Date formatting | Already used in reports and booking |
| Lucide React | Current | Icons | Already used throughout |

### Supporting (No New Dependencies Needed)

This phase requires NO new npm packages. Everything builds on existing infrastructure:

- `createNotification()` from `@/features/notifications/utils/notificationHelpers`
- `sendLessonConfirmationEmail()` pattern from `@/lib/email`
- `formatCurrency()` from `@/lib/utils`
- `export-utils.ts` patterns for CSV/PDF export
- `coachProcedure` and `superAdminProcedure` from `@/lib/trpc`

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-app notifications only | Email + in-app | Email already works via Resend; add coach email notifications as stretch goal only |
| New payout report page | Extend existing reports page | Existing reports page structure is good; add a "Payouts" tab |
| Custom role switcher component | Simple sidebar link | Yura already can access both /admin/* and /coach/* per middleware; a link is sufficient |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Existing Notification Flow (to extend)
```
User action (booking/cancel/payment)
  -> TRPC mutation handler
  -> createNotification({ userId, title, message, type, link })
  -> Notification record in DB
  -> NotificationsPopover auto-refreshes (60s polling)
```

**Gap:** Currently only creates notifications for students and admin users. Coach userId must be looked up via `Coach.userId` and passed to `createNotification`.

### Revenue Split Calculation (already implemented)
```
Payment.amount (gross amount)
  * (Coach.revenueSplitPercent / 100)
  = coachPayout

Payment.amount - coachPayout
  = platformRevenue
```

**Already working in:**
- `earningsQueries.ts` -- coach sees their split-adjusted earnings
- `superAdminQueries.ts getRevenueBreakdown` -- admin sees per-coach breakdown
- `CoachOverviewCards.tsx` -- admin dashboard shows monthly coach earnings

**Gap:** No dedicated payout report with date range filtering, no export of payout data.

### Dual-Role Navigation Pattern
```
middleware.ts routing:
  SUPER_ADMIN -> can access /admin/* AND /coach/*
  ADMIN -> can access /admin/* AND /coach/*
  COACH -> can access /coach/* only

useCurrentUser.ts:
  For ADMIN/SUPER_ADMIN, fetches Coach profile and sets coachId
  -> isAdmin: true, isCoach: true (both flags set)

coachProcedure middleware:
  isCoachRole() accepts COACH, ADMIN, SUPER_ADMIN
  Looks up Coach record by session userId
  -> ctx.coach available for all coach routes
```

**Gap:** No visible UI for switching between admin and coach views. The user must manually navigate to `/coach/dashboard` or `/admin/dashboard`. Need a sidebar link or header button.

### Recommended Project Structure (changes only)
```
src/
  features/
    admin/
      components/
        coaches/
          management/
            CoachRevenueSplitEditor.tsx    # NEW: inline split % editor
        analytics/
          PayoutReport.tsx                 # NEW: payout report component
      api/
        queries/
          superAdminQueries.ts            # EXTEND: add getPayoutReport query
    coach/
      components/
        earnings/
          EarningsOverview.tsx            # EXISTS: already shows split-adjusted earnings
    notifications/
      utils/
        notificationHelpers.ts           # EXISTS: add createCoachNotification helper
  components/
    layout/
      AppSidebar.tsx                     # EXTEND: add role-switch link for dual-role users
      RoleSwitcher.tsx                   # NEW: small component for admin<->coach switch
```

### Pattern 1: Coach Notification in Booking Flow
**What:** After a lesson is booked, notify the coach whose time slot was used
**When to use:** In bookingQueries.ts bookLesson mutation, after the existing student + admin notification blocks
**Example:**
```typescript
// After step 9 (admin notifications) in bookingQueries.ts
// Step 10: Notify the coach
if (timeSlot.coachId) {
  try {
    const coach = await ctx.prisma.coach.findUnique({
      where: { id: timeSlot.coachId },
      select: { userId: true },
    });
    if (coach) {
      await createNotification({
        userId: coach.userId,
        title: "New Lesson Booked",
        message: `${student.User.name || "A student"} booked a ${input.type} lesson on ${format(timeSlot.startTime, "MMM d 'at' h:mm a")}`,
        type: "SUCCESS",
        link: "/coach/schedule",
      });
    }
  } catch (coachNotifError) {
    console.error("[BOOKING] Error creating coach notification:", coachNotifError);
  }
}
```

### Pattern 2: Revenue Split Configuration in Coach Management
**What:** Inline editable split percentage on the coach management page
**When to use:** In the existing CoachList or a coach detail dialog
**Example:**
```typescript
// Uses existing updateCoachPricing mutation which already accepts revenueSplitPercent
const updateSplit = api.admin.coach.management.updateCoachPricing.useMutation({
  onSuccess: () => {
    toast.success("Revenue split updated");
    utils.admin.coach.management.getAllCoaches.invalidate();
  },
});

// UI: Simple number input with % suffix, or a slider 0-100
<Input
  type="number"
  min={0}
  max={100}
  value={splitPercent}
  onChange={(e) => setSplitPercent(Number(e.target.value))}
/>
```

### Pattern 3: Payout Report with Date Range
**What:** Super admin can view per-coach earnings for a selected period
**When to use:** New tab on Reports page or dedicated Payouts page
**Example:**
```typescript
// Reuse getRevenueBreakdown query which already accepts startDate/endDate
// Add CSV export using existing export-utils pattern
const { data } = api.admin.superAdmin.getRevenueBreakdown.useQuery({
  startDate: periodStart,
  endDate: periodEnd,
});
```

### Anti-Patterns to Avoid
- **Storing computed revenue split amounts in the database:** The split percentage is on the Coach model; calculations should always be derived at query time. Storing computed values creates staleness when the split % changes.
- **Creating a separate PayoutRecord table:** Over-engineering for this use case. The revenue split is a read-time calculation over existing Payment + Coach data.
- **Notifying coaches via a different system than students:** Use the same `createNotification` helper and `Notification` model. Coaches already see the `NotificationsPopover` in their header.
- **Building a complex role-switching state machine:** The middleware already allows SUPER_ADMIN to access both /admin and /coach routes. A simple navigation link is sufficient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coach notification delivery | Custom notification system | Existing `createNotification()` + `Notification` model | Already works for students/admins, just needs coach userId |
| Revenue split math | New calculation engine | `Coach.revenueSplitPercent / 100` multiplier | Already implemented in earningsQueries.ts and superAdminQueries.ts |
| Payout CSV export | Custom CSV generator | Existing `export-utils.ts` patterns | `downloadCSV()` helper already handles blob creation and download |
| Revenue split config UI | Custom form system | Existing `updateCoachPricing` mutation | Already accepts `revenueSplitPercent` as optional parameter |
| Role switching | Session manipulation / re-auth | Simple `<Link href="/coach/dashboard">` | Middleware already allows access; no auth changes needed |
| Payout date range picker | Custom date picker | Existing period selector pattern from Reports page | `period` state + month navigation already built |

**Key insight:** This phase is 80% wiring existing systems together and 20% new UI. The existing codebase already has the building blocks; the task is connecting them.

## Common Pitfalls

### Pitfall 1: Notification to Wrong User ID
**What goes wrong:** Using `coachId` (Coach record ID) instead of `coach.userId` (User record ID) when creating notifications
**Why it happens:** The notification system keys on `userId` (User model), but coach-scoped code works with `coachId` (Coach model). They are different IDs.
**How to avoid:** Always look up `Coach.userId` before calling `createNotification`. The coach procedure context has `ctx.coach` which includes `userId`.
**Warning signs:** Notifications created but never appearing in the coach's popover; orphaned Notification records with invalid userId.

### Pitfall 2: Revenue Split Applied Twice
**What goes wrong:** Split applied in both the query and the display layer, resulting in double-reduction
**Why it happens:** The `earningsRouter.getEarningsSummary` already multiplies by `splitMultiplier`. If the frontend also multiplies, the number is wrong.
**How to avoid:** Follow the existing convention: apply the split in the TRPC query, return the already-split amount. Frontend displays as-is.
**Warning signs:** Coach sees earnings that are much lower than expected (e.g., 49% of gross instead of 70%).

### Pitfall 3: Payment Has No Direct coachId
**What goes wrong:** Trying to filter `Payment.where({ coachId: ... })` which does not exist
**Why it happens:** The Payment model has no `coachId` column. Coach filtering must go through the Lesson relation.
**How to avoid:** Always use `Payment.where({ Lesson: { coachId: ... } })` for coach-scoped payment queries.
**Warning signs:** Prisma type error during compilation; runtime "Unknown arg coachId" error. This is a known decision from Phase 3 (decision [03-02]).

### Pitfall 4: Middleware Blocks Admin from Coach Routes
**What goes wrong:** SUPER_ADMIN user cannot access /coach/* routes
**Why it happens:** Middleware check is incorrectly exclusive rather than inclusive
**How to avoid:** The current middleware already handles this correctly (lines 97-106 of middleware.ts). Do NOT modify the middleware. SUPER_ADMIN and ADMIN are already allowed on /coach/* routes.
**Warning signs:** Redirect loop when clicking coach dashboard link from admin sidebar.

### Pitfall 5: Notification Overload from Bulk Operations
**What goes wrong:** If admin assigns multiple students or verifies multiple payments, coach gets flooded with notifications
**Why it happens:** Each individual mutation creates a notification
**How to avoid:** For this phase, individual notifications are acceptable since bulk operations are rare for a small coaching business. If it becomes an issue later, batch notifications using `createNotificationForMultipleUsers` or debouncing.
**Warning signs:** Coach inbox with 20+ notifications in rapid succession.

### Pitfall 6: Sidebar Navigation Array Duplication
**What goes wrong:** Navigation items defined in both `AppSidebar.tsx` and `AppLayout.tsx` get out of sync
**Why it happens:** The navigation arrays are duplicated between the two files (desktop sidebar vs mobile sidebar)
**How to avoid:** When adding a role-switch link, add it to BOTH `AppSidebar.tsx` (lines 20-49) AND `AppLayout.tsx` (lines 40-69). Consider extracting to a shared constant.
**Warning signs:** Desktop shows the switch link but mobile does not (or vice versa).

## Code Examples

### Creating Coach Notification on Booking
```typescript
// In bookingQueries.ts, after existing admin notification block
// Source: Extending existing pattern from lines 373-418

if (timeSlot.coachId) {
  try {
    const coachRecord = await ctx.prisma.coach.findUnique({
      where: { id: timeSlot.coachId },
      select: { userId: true },
    });
    if (coachRecord) {
      await createNotification({
        userId: coachRecord.userId,
        title: "New Lesson Booked",
        message: `${student.User.name || "A student"} booked a ${lessonType} lesson${
          coachName ? "" : ""
        } on ${format(timeSlot.startTime, "MMM d, yyyy 'at' h:mm a")}`,
        type: "SUCCESS",
        link: "/coach/schedule",
      });
    }
  } catch (coachNotifError) {
    console.error("[BOOKING] Error creating coach notification:", coachNotifError);
  }
}
```

### Creating Coach Notification on Cancellation
```typescript
// In bookingQueries.ts cancelLesson mutation, after existing admin notification block
// Source: Extending existing pattern from lines 531-550

if (lesson.coachId) {
  try {
    const coachRecord = await ctx.prisma.coach.findUnique({
      where: { id: lesson.coachId },
      select: { userId: true },
    });
    if (coachRecord) {
      await createNotification({
        userId: coachRecord.userId,
        title: "Lesson Cancelled",
        message: `${studentName} cancelled their ${lessonType} lesson on ${lessonDate} at ${lessonTime}${lateTag}`,
        type: "WARNING",
        link: "/coach/schedule",
      });
    }
  } catch (coachNotifError) {
    console.error("[CANCEL] Error creating coach notification:", coachNotifError);
  }
}
```

### Creating Coach Notification on Payment Verification
```typescript
// In paymentQueries.ts verifyPayment mutation, after payment update
// Source: Extending existing pattern

if (payment.Lesson?.coachId) {
  try {
    const coachRecord = await ctx.prisma.coach.findUnique({
      where: { id: payment.Lesson.coachId },
      select: { userId: true },
    });
    if (coachRecord) {
      await createNotification({
        userId: coachRecord.userId,
        title: "Payment Verified",
        message: `Payment of $${payment.amount.toFixed(2)} from ${
          payment.Student.User.name || "a student"
        } has been verified`,
        type: "SUCCESS",
        link: "/coach/earnings",
      });
    }
  } catch (coachNotifError) {
    console.error("[PAYMENT] Error creating coach notification:", coachNotifError);
  }
}
```

### Revenue Split Editor Component
```typescript
// Source: Uses existing updateCoachPricing mutation from coachManagementQueries.ts
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface RevenueSplitEditorProps {
  coachId: string;
  currentSplit: number;
}

export function RevenueSplitEditor({ coachId, currentSplit }: RevenueSplitEditorProps) {
  const [split, setSplit] = useState(currentSplit);
  const utils = api.useUtils();

  const updateSplit = api.admin.coach.management.updateCoachPricing.useMutation({
    onSuccess: () => {
      utils.admin.coach.management.getAllCoaches.invalidate();
      utils.admin.superAdmin.getRevenueBreakdown.invalidate();
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        max={100}
        value={split}
        onChange={(e) => setSplit(Number(e.target.value))}
        className="w-20"
      />
      <span className="text-sm text-muted-foreground">%</span>
      <Button
        size="sm"
        variant="outline"
        disabled={split === currentSplit}
        onClick={() => updateSplit.mutate({ coachId, revenueSplitPercent: split })}
      >
        Save
      </Button>
    </div>
  );
}
```

### Sidebar Role Switch Link
```typescript
// Source: Extending existing AppSidebar.tsx pattern

// Add to adminNavigation array in AppSidebar.tsx:
// (conditionally, only for users who have a Coach record)
// The component needs to know if the current user has isCoach capability

// Option: Add a divider + link at the bottom of admin nav
{role === "admin" && (
  <div className="mt-auto pt-4 border-t border-gray-200">
    <Link
      href="/coach/dashboard"
      className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
    >
      <ArrowLeftRight className="h-5 w-5 shrink-0" />
      <span>Coach View</span>
    </Link>
  </div>
)}

// Similarly in coachNavigation, add link back to admin:
{role === "coach" && userIsAdmin && (
  <Link href="/admin/dashboard" ...>
    <span>Admin View</span>
  </Link>
)}
```

### Payout Report CSV Export
```typescript
// Source: Extending existing export-utils.ts pattern

export const exportPayoutReportToCSV = (
  coaches: Array<{
    name: string | null;
    revenueSplitPercent: number;
    totalRevenue: number;
    coachPayout: number;
    platformRevenue: number;
    lessonCount: number;
  }>,
  totals: { totalRevenue: number; totalCoachPayouts: number; totalPlatformRevenue: number },
  periodLabel: string,
): void => {
  const csvHeaders = ["Coach", "Split %", "Gross Revenue", "Coach Payout", "Platform Share", "Lessons"];
  const csvRows = coaches.map((c) => [
    c.name ?? "Unknown",
    c.revenueSplitPercent.toString(),
    c.totalRevenue.toFixed(2),
    c.coachPayout.toFixed(2),
    c.platformRevenue.toFixed(2),
    c.lessonCount.toString(),
  ]);

  // Add totals row
  csvRows.push([
    "TOTAL",
    "",
    totals.totalRevenue.toFixed(2),
    totals.totalCoachPayouts.toFixed(2),
    totals.totalPlatformRevenue.toFixed(2),
    "",
  ]);

  const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
  downloadCSV(csvContent, `payout-report-${periodLabel}.csv`);
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No coach notifications | Notifications only for students and admins | Pre-Phase 7 | Coaches miss booking/cancellation events |
| Revenue split computed but not configurable in UI | Split % stored on Coach model, editable via mutation | Phase 2 | UI for editing exists in createCoach, but not inline for existing coaches |
| Single-role navigation | SUPER_ADMIN can access both /admin and /coach routes | Phase 1 | No visible UI switch; user must type URL |
| No payout reports | getRevenueBreakdown query exists | Phase 3 | Data is available on admin dashboard; no dedicated report with export |

**Already implemented (do NOT rebuild):**
- `Coach.revenueSplitPercent` field with default 70 (schema)
- `getRevenueBreakdown` query with per-coach payout calculations (superAdminQueries.ts)
- `getEarningsSummary` for coach-facing split-adjusted earnings (earningsQueries.ts)
- `RevenueBreakdownChart` showing per-coach table on admin dashboard
- `CoachOverviewCards` showing per-coach monthly earnings
- `EarningsOverview` showing coach's own earnings after split
- `updateCoachPricing` mutation accepting `revenueSplitPercent` (coachManagementQueries.ts)
- Notification model, createNotification helper, NotificationsPopover
- Middleware allowing SUPER_ADMIN to access /coach/* routes
- useCurrentUser hook setting coachId for ADMIN/SUPER_ADMIN users

## Open Questions

1. **Payout Report Location**
   - What we know: Admin dashboard already shows revenue breakdown. Reports page has revenue + attendance tabs.
   - What's unclear: Should the payout report be a new tab on the Reports page, a section on the admin dashboard, or a new page?
   - Recommendation: Add a "Payouts" tab to the existing Reports page. This reuses the period selector and export dropdown infrastructure.

2. **Coach Email Notifications**
   - What we know: Email system exists (Resend), sends lesson confirmations to students. Coach notification currently only in-app.
   - What's unclear: Should coaches also receive email notifications for bookings/cancellations?
   - Recommendation: Start with in-app only (consistent with INTG-03 requirement which says "notifications" not "email notifications"). Email can be added later using the existing `sendEmail` helper pattern.

3. **Role Switcher Visibility**
   - What we know: Only Yura (SUPER_ADMIN) needs dual-role switching. Regular coaches do not see admin views.
   - What's unclear: Should the switch link appear for both ADMIN and SUPER_ADMIN, or only SUPER_ADMIN?
   - Recommendation: Show for any user whose role is ADMIN or SUPER_ADMIN AND who has a Coach record in the database. This covers Yura and any future owner-coaches.

4. **Revenue Split Change Notification**
   - What we know: When super admin changes a coach's split %, the coach should probably know.
   - What's unclear: Is this required for Phase 7?
   - Recommendation: Yes, add a notification to the coach when their split % is updated via `updateCoachPricing`.

## Sources

### Primary (HIGH confidence)
- Prisma schema at `prisma/schema.prisma` -- Coach.revenueSplitPercent, Notification model
- `src/features/notifications/utils/notificationHelpers.ts` -- createNotification API
- `src/features/student/api/queries/bookingQueries.ts` -- existing booking + notification flow
- `src/features/coach/api/queries/earningsQueries.ts` -- existing split calculation
- `src/features/admin/api/queries/superAdminQueries.ts` -- getRevenueBreakdown, getCoachesOverview
- `src/features/admin/api/queries/coach/coachManagementQueries.ts` -- updateCoachPricing mutation
- `src/features/admin/components/analytics/RevenueBreakdownChart.tsx` -- existing payout table
- `middleware.ts` -- role-based route access (SUPER_ADMIN -> /admin/* + /coach/*)
- `src/hooks/useCurrentUser.ts` -- dual-role coachId resolution
- `src/components/layout/AppSidebar.tsx` -- navigation arrays
- `src/lib/export-utils.ts` -- CSV/PDF export patterns

### Secondary (MEDIUM confidence)
- Prior phase STATE.md decisions -- consistent patterns for coach notifications, payment scoping

### Tertiary (LOW confidence)
- None -- all findings are from direct codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in codebase, no new dependencies
- Architecture: HIGH -- extending existing patterns, no new architectural decisions
- Pitfalls: HIGH -- all identified from actual codebase inspection and prior phase decisions
- Revenue split math: HIGH -- already implemented in two places (earningsQueries, superAdminQueries)
- Notification routing: HIGH -- createNotification pattern clear, coach userId lookup straightforward
- Dual-role UX: HIGH -- middleware and useCurrentUser already support it; just needs UI

**Research date:** 2026-03-16
**Valid until:** 60 days (very stable -- no external dependencies, all internal codebase)
