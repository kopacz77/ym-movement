# Phase 3: Query Scoping and Super Admin Dashboard - Research

**Researched:** 2026-03-15
**Domain:** TRPC query scoping, multi-tenant data isolation, admin dashboard aggregation
**Confidence:** HIGH

## Summary

This phase addresses two interconnected concerns: (1) scoping all existing admin/student queries by `coachId` so coaches only see their own data, and (2) building a super admin dashboard with cross-coach visibility, per-coach drill-down, and revenue reporting with payout calculations.

The codebase has **four tables with coachId columns** added in Phase 1: `Lesson`, `RinkTimeSlot`, `BlockedDateRange`, and `Payment` (indirectly via Lesson). Phase 2 built properly scoped coach queries using `coachProcedure` middleware with `ctx.coach.id`. The existing admin and student queries were built for a single-coach model and have **zero coachId filtering** -- they return all data across all coaches.

**Primary recommendation:** Add an optional `coachId` filter to all admin queries (for drill-down) and make the admin dashboard a super admin view that aggregates cross-coach data. For student-facing queries, scope time slot visibility to show which coach owns a slot but do NOT restrict student access to only one coach's slots (students can book from any coach). The existing admin queries should be converted from `protectedProcedure` to `adminProcedure` where they use `protectedProcedure` currently.

## Standard Stack

No new libraries needed. This phase uses the existing stack:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TRPC v11 | existing | API layer, middleware, procedures | Already established |
| Prisma ORM | existing | Database queries with coachId filtering | Already established |
| React/Next.js 15 | existing | Super admin dashboard UI | Already established |
| shadcn/ui | existing | Dashboard cards, tables, charts | Already established |
| Recharts | existing | Revenue charts (already used in RevenueChart) | Already used in reports |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | existing | Date range calculations for reports | Already used in analytics |
| Lucide React | existing | Dashboard icons | Already used throughout |

**Installation:** No new packages required.

## Architecture Patterns

### Pattern 1: Admin Query Scoping Strategy

**What:** Add optional `coachId` input parameter to admin queries. When present, filter by it; when absent (super admin overview mode), return all data.

**When to use:** Every admin query that touches Lesson, RinkTimeSlot, Payment, or BlockedDateRange.

**Example:**
```typescript
// BEFORE (current - no scoping)
getTimeSlots: protectedProcedure
  .input(z.object({ rinkId: z.string().optional() }))
  .query(async ({ ctx, input }) => {
    return ctx.prisma.rinkTimeSlot.findMany({
      where: { rinkId: input.rinkId, isActive: true },
    });
  }),

// AFTER (scoped - with optional coachId)
getTimeSlots: adminProcedure
  .input(z.object({
    rinkId: z.string().optional(),
    coachId: z.string().optional(), // <-- NEW: optional coach filter
  }))
  .query(async ({ ctx, input }) => {
    return ctx.prisma.rinkTimeSlot.findMany({
      where: {
        rinkId: input.rinkId,
        isActive: true,
        ...(input.coachId && { coachId: input.coachId }), // <-- NEW
      },
    });
  }),
```

**Why optional, not mandatory:** The super admin needs to see ALL data when no coachId is provided (overview mode). When drilling into a specific coach, the UI passes the coachId. This is simpler than creating duplicate query sets.

### Pattern 2: Procedure Security Upgrade

**What:** Many existing admin queries use `protectedProcedure` (any authenticated user) instead of `adminProcedure` (ADMIN/SUPER_ADMIN only). This is a security gap.

**Current state of procedure usage in admin queries:**
- `analyticsQueries.ts`: Uses `publicProcedure` for getOverview, getStudentActivity, getRevenueReport (SECURITY ISSUE)
- `timeSlotQueries.ts`: Uses `protectedProcedure` for all queries
- `lessonQueries.ts`: Uses `protectedProcedure` for all queries
- `blockedDateQueries.ts`: Uses `protectedProcedure` for all queries
- `rinkQueries.ts`: Uses `protectedProcedure` for all queries
- `recurringPatternQueries.ts`: Uses `protectedProcedure` for all queries
- `studentQueries.ts`: Uses `protectedProcedure` for all queries
- `approvalQueries.ts`: Uses `protectedProcedure` for all queries
- `noteQueries.ts`: Uses `protectedProcedure` for all queries
- `pricingQueries.ts`: Uses `protectedProcedure` for all queries
- `settingsQueries.ts`: Uses `protectedProcedure` for all queries
- `paymentQueries.ts`: Uses `adminProcedure` (CORRECT)
- `coachManagementQueries.ts`: Uses `superAdminProcedure` (CORRECT)
- `coachApprovalQueries.ts`: Uses `superAdminProcedure` (CORRECT)
- `proposalApprovalQueries.ts`: Uses `superAdminProcedure` (CORRECT)

**Action:** Convert admin queries from `protectedProcedure` to `adminProcedure`. The `publicProcedure` analytics queries are a significant security vulnerability.

### Pattern 3: Super Admin Dashboard Structure

**What:** New dashboard page that shows coaches overview, with drill-down capability.

**Recommended structure:**
```
src/
  app/(protected)/admin/dashboard/page.tsx    # Enhanced with coach overview (super admin sees coaches, regular admin sees own data)
  features/admin/api/queries/
    superAdminQueries.ts                       # NEW: Cross-coach aggregation queries
  features/admin/components/
    analytics/
      CoachOverviewCards.tsx                    # NEW: Coaches grid with stats
      CoachDetailView.tsx                      # NEW: Drill-down into individual coach
      RevenueBreakdownChart.tsx                # NEW: Per-coach revenue with payout calculations
```

**Why reuse existing admin dashboard:** Rather than creating a separate `/super-admin/dashboard` route, enhance the existing `/admin/dashboard` page. The super admin IS an admin -- they should see the same dashboard with additional coach-specific widgets. The existing OverviewCards, RevenueChart, and StudentActivityChart can be enhanced with coach filtering.

### Pattern 4: Revenue Aggregation with Payout Calculations

**What:** Cross-coach revenue queries that include per-coach breakdowns with `revenueSplitPercent` applied.

**Example:**
```typescript
// In superAdminQueries.ts
getCoachRevenueBreakdown: superAdminProcedure
  .input(z.object({
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  }))
  .query(async ({ ctx, input }) => {
    const coaches = await ctx.prisma.coach.findMany({
      where: { isActive: true },
      include: {
        User: { select: { name: true } },
        Lesson: {
          where: {
            Payment: {
              status: "COMPLETED",
              ...(input.startDate && { lesson_date: { gte: input.startDate } }),
              ...(input.endDate && { lesson_date: { lte: input.endDate } }),
            },
          },
          include: { Payment: true },
        },
      },
    });

    return coaches.map(coach => {
      const totalRevenue = coach.Lesson.reduce(
        (sum, lesson) => sum + (lesson.Payment?.amount ?? 0), 0
      );
      const coachPayout = totalRevenue * (coach.revenueSplitPercent / 100);
      const platformRevenue = totalRevenue - coachPayout;

      return {
        coachId: coach.id,
        coachName: coach.User.name,
        revenueSplitPercent: coach.revenueSplitPercent,
        totalRevenue,
        coachPayout,
        platformRevenue,
        lessonCount: coach.Lesson.length,
      };
    });
  }),
```

### Anti-Patterns to Avoid

- **Duplicating queries for admin vs. super admin:** Use optional `coachId` parameter, not separate query endpoints
- **Middleware-level automatic scoping for admin queries:** Unlike coachProcedure (which always scopes), admin queries need flexibility to see all OR filter by coach
- **Creating a separate `/super-admin` route tree:** Admin IS super admin in this system; extend the existing admin pages
- **Joining Payment.coachId:** Payment does NOT have a direct coachId column. Coach association flows through `Payment -> Lesson -> coachId`. Always join through Lesson.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Revenue split calculation | Custom formula engine | Simple `amount * (revenueSplitPercent / 100)` | Formula is trivial; complexity is in the aggregation query, not the math |
| Coach overview stats | Complex SQL aggregations | Prisma `_count` and `aggregate` | Prisma handles this efficiently with proper indexes already in place |
| Per-coach drill-down routing | Separate page per coach | Query parameter or dynamic route `?coachId=xxx` | Reuses existing admin pages with coach context |
| Data isolation testing | Manual QA each query | Systematic audit checklist + typed coachId in where clauses | 179 queries is too many to validate manually |

## Common Pitfalls

### Pitfall 1: Forgetting Indirect Coach Scoping for Payments

**What goes wrong:** Payment table has no `coachId` column. If you add `where: { coachId }` to a Payment query, it fails.
**Why it happens:** Payment connects to coach through `Payment -> Lesson -> coachId`.
**How to avoid:** Always scope payments through `Lesson: { coachId }` in the where clause.
**Warning signs:** TypeScript error "Property coachId does not exist on type PaymentWhereInput"

```typescript
// WRONG
ctx.prisma.payment.findMany({
  where: { coachId: input.coachId },
});

// RIGHT
ctx.prisma.payment.findMany({
  where: { Lesson: { coachId: input.coachId } },
});
```

### Pitfall 2: Breaking Student Booking Flow

**What goes wrong:** Over-scoping student queries so students can only see one coach's time slots.
**Why it happens:** Blindly adding coachId filters to student availability queries.
**How to avoid:** Student availability queries should NOT be coachId-filtered in Phase 3. Phase 5 (Student Multi-Coach Booking) will add coach-browsing UI. For now, students see all available time slots regardless of coach.
**Warning signs:** Student booking page shows no available slots after scoping changes.

### Pitfall 3: Analytics publicProcedure Security Hole

**What goes wrong:** `analyticsQueries.ts` uses `publicProcedure` for `getOverview`, `getStudentActivity`, and `getRevenueReport`. This means ANY unauthenticated visitor can query revenue data.
**Why it happens:** Was likely set this way during early development for convenience and never tightened.
**How to avoid:** Change these to `adminProcedure` as part of the security upgrade in this phase.
**Warning signs:** Revenue data visible at `/api/trpc/admin.analytics.getOverview` without authentication.

### Pitfall 4: Overlap Detection Without Coach Scoping

**What goes wrong:** Time slot overlap detection (in createTimeSlot, updateTimeSlot, createBulkTimeSlots) currently checks ALL time slots at a rink. With multiple coaches, different coaches should be able to have overlapping time slots at the same rink.
**Why it happens:** Overlap detection was designed for single-coach (Yura owns all slots at a rink).
**How to avoid:** Add coachId to overlap detection queries: slots should only conflict with slots from the SAME coach at the same rink.
**Warning signs:** Coach B cannot create a 10am-11am slot because Coach A already has one at that rink.

### Pitfall 5: BlockedDateRange Scoping vs. Rink-Level Blocking

**What goes wrong:** Blocked dates were originally a single-admin feature (Yura blocks her own travel dates). With multi-coach, a coach's blocked dates should only affect their own availability.
**Why it happens:** BlockedDateRange now has coachId, but the admin time slot creation validation still checks ALL blocked dates globally.
**How to avoid:** When checking if a date is blocked during slot creation, filter by coachId. Super admin blocked dates (coachId=null) should still block everyone.
**Warning signs:** Coach B can't create slots because Coach A is traveling.

### Pitfall 6: Student Queries Already Have Own Scoping

**What goes wrong:** Student profile/lesson queries (in `src/features/student/api/queries/profileQueries.ts`) already scope by `studentId` and verify ownership. Adding coachId here would be redundant and potentially break the authorization model.
**Why it happens:** Confusion between "coach scoping" and "student data ownership."
**How to avoid:** Student-facing queries that look up by `studentId` (getStudentProfile, getStudentLessons, getStudentLessonStats) do NOT need coachId scoping. The student owns their own data across all coaches.
**Warning signs:** Students can't see their lessons with Coach B because query is filtered to Coach A.

## Code Examples

### Complete Query Audit: Files Needing coachId Scoping

**Category 1: Admin queries touching Lesson/RinkTimeSlot/Payment/BlockedDateRange (MUST scope)**

| File | Queries | Current Procedure | Scoping Needed |
|------|---------|-------------------|----------------|
| `admin/api/queries/schedule/timeSlotQueries.ts` | getTimeSlots, createTimeSlot, deleteTimeSlot, updateTimeSlot, deleteBulkTimeSlots, createBulkTimeSlots | protectedProcedure | Add optional coachId filter to reads; set coachId on creates |
| `admin/api/queries/schedule/lessonQueries.ts` | createLesson, cancelLesson, getLessonsByDate, getStudents, assignStudentToTimeSlot, updateLessonType, unassignStudent | protectedProcedure | Add optional coachId filter to reads; set coachId on creates |
| `admin/api/queries/schedule/blockedDateQueries.ts` | getBlockedDates, createBlockedDate, updateBlockedDate, deleteBlockedDate | protectedProcedure | Add optional coachId filter to reads; set coachId on creates |
| `admin/api/queries/schedule/recurringPatternQueries.ts` | createRecurringPattern | protectedProcedure | Set coachId on created RinkTimeSlots |
| `admin/api/queries/paymentQueries.ts` | getPayments, getPaymentById, verifyPayment, addPaymentNote, sendPaymentReminder, getPaymentStats | adminProcedure | Add optional coachId via Lesson relation |
| `admin/api/queries/analyticsQueries.ts` | getOverview, getStudentActivity, getRevenueReport, getStudentAttendance | publicProcedure/protectedProcedure | SECURITY FIX + add optional coachId |
| `admin/api/queries/schedule/rinkQueries.ts` | getRinks (read), deleteRink (counts lessons/slots) | protectedProcedure | getRinks: no scoping (shared resource); deleteRink: needs awareness of per-coach slots |

**Category 2: Admin queries NOT needing coachId scoping (operate on coach-independent entities)**

| File | Queries | Reason Not Scoped |
|------|---------|-------------------|
| `admin/api/queries/student/studentQueries.ts` | getStudents, getStudent, createStudent, updateStudent, toggleStatus, deleteStudent, resendInvitation, getStudentStats | Students are a shared resource (CoachStudent junction table handles coach-student relationships) |
| `admin/api/queries/student/approvalQueries.ts` | getPendingApprovals, approveStudent, rejectStudent, approveAllStudents | Student approval is a super admin concern, not coach-scoped |
| `admin/api/queries/student/noteQueries.ts` | getStudentNotes, addStudentNote, deleteStudentNote | Notes are per-student, created by any admin |
| `admin/api/queries/student/pricingQueries.ts` | getDefaultPricing, updateDefaultPricing, getStudentPricing, updateStudentPricing | Pricing is global defaults + per-student overrides |
| `admin/api/queries/settingsQueries.ts` | getSettings, saveSettings, resetSettings | Platform-level settings |
| `admin/api/queries/coach/*.ts` | All coach management | Already uses superAdminProcedure, operates on Coach entity directly |

**Category 3: Student queries -- special handling**

| File | Queries | Scoping Strategy |
|------|---------|-----------------|
| `student/api/queries/availabilityQueries.ts` | getAvailableTimeSlots, getRinks | NO coachId scoping now; Phase 5 adds coach-browsing UI |
| `student/api/queries/bookingQueries.ts` | bookLesson, cancelLesson | bookLesson should SET coachId from the time slot's coachId; cancelLesson fine as-is |
| `student/api/queries/profileQueries.ts` | getStudentProfile, updateStudentProfile, getStudentLessons, getStudentPricing, getStudentLessonStats | Already student-scoped, no coachId needed |
| `student/api/queries/lessonQueries.ts` | getLesson | Already scoped by lessonId with ownership check |

**Category 4: Other queries**

| File | Queries | Status |
|------|---------|--------|
| `notifications/api/queries/notificationsQueries.ts` | getNotifications, markAsRead, markAllAsRead | Already scoped by userId, no change needed |
| `server/api/routers/passwordReset.ts` | password reset | No coach relevance |
| `lib/cache-wrapper.ts` | Various cached queries | Needs same scoping as the queries it wraps |
| `app/(protected)/student/schedule/[lessonId]/page.tsx` | Direct Prisma lesson lookup | Already has ownership check; no change needed |

### Super Admin Dashboard: Coaches Overview Query

```typescript
// src/features/admin/api/queries/superAdminQueries.ts
import { z } from "zod";
import { createTRPCRouter, superAdminProcedure } from "@/lib/trpc";

export const superAdminRouter = createTRPCRouter({
  getCoachesOverview: superAdminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const coaches = await ctx.prisma.coach.findMany({
      where: { isApproved: true },
      include: {
        User: { select: { name: true, email: true } },
        _count: {
          select: {
            Lesson: true,
            CoachStudent: true,
            RinkTimeSlot: { where: { isActive: true } },
          },
        },
      },
    });

    // Get per-coach earnings for current month
    const earningsPromises = coaches.map(async (coach) => {
      const [totalHours, monthEarnings] = await Promise.all([
        // Total hours booked (all time)
        ctx.prisma.lesson.aggregate({
          where: { coachId: coach.id, status: "SCHEDULED" },
          _sum: { duration: true },
        }),
        // This month completed earnings
        ctx.prisma.payment.aggregate({
          where: {
            Lesson: { coachId: coach.id },
            status: "COMPLETED",
            lesson_date: { gte: startOfMonth },
          },
          _sum: { amount: true },
        }),
      ]);

      return {
        coachId: coach.id,
        totalHoursBooked: (totalHours._sum.duration ?? 0) / 60,
        monthEarnings: (monthEarnings._sum.amount ?? 0) * (coach.revenueSplitPercent / 100),
        totalRevenue: monthEarnings._sum.amount ?? 0,
      };
    });

    const earnings = await Promise.all(earningsPromises);

    return coaches.map((coach, i) => ({
      id: coach.id,
      name: coach.User.name,
      email: coach.User.email,
      isActive: coach.isActive,
      suspendedAt: coach.suspendedAt,
      revenueSplitPercent: coach.revenueSplitPercent,
      lessonCount: coach._count.Lesson,
      studentCount: coach._count.CoachStudent,
      activeSlots: coach._count.RinkTimeSlot,
      ...earnings[i],
    }));
  }),
});
```

### Lesson Creation with coachId Assignment

When the admin assigns a student to a time slot, the lesson should inherit the coachId from the time slot:

```typescript
// In assignStudentToTimeSlot mutation
const timeSlot = await ctx.prisma.rinkTimeSlot.findUnique({
  where: { id: input.timeSlotId },
  include: { Rink: true, Lesson: true },
});

// Create the lesson with coachId from the time slot
const lesson = await prisma.lesson.create({
  data: {
    // ... existing fields ...
    coachId: timeSlot.coachId, // <-- Inherit from time slot
  },
});

// Create payment - no coachId field, but Lesson association handles it
const payment = await prisma.payment.create({
  data: {
    lessonId: lesson.id,
    // ... existing fields ...
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-coach: no coachId filtering | Multi-coach: optional coachId on reads, mandatory on creates | Phase 3 | All admin queries gain coach awareness |
| publicProcedure for analytics | adminProcedure for analytics | Phase 3 | Security vulnerability fixed |
| protectedProcedure for admin operations | adminProcedure for admin operations | Phase 3 | Authorization hardened |
| Global overlap detection | Per-coach overlap detection | Phase 3 | Multiple coaches can use same rink/times |
| Single admin dashboard | Enhanced dashboard with coach overview | Phase 3 | Super admin cross-coach visibility |

## Open Questions

1. **Should the admin schedule calendar show all coaches' slots simultaneously or have a coach filter dropdown?**
   - Recommendation: Add a coach filter dropdown to the schedule page. Default to "All Coaches" for super admin, or "My Slots" for admin-who-is-also-coach. Each coach's slots could be color-coded.
   - Impact: Affects how `getTimeSlots` is called from the frontend.

2. **Should Payment have a direct coachId column for simpler querying?**
   - What we know: Currently, coach association for payments goes through `Payment -> Lesson -> coachId`. This requires a join for every payment-by-coach query.
   - Recommendation: Do NOT add a coachId column to Payment in Phase 3. The Lesson join is sufficient and avoids data duplication. If performance becomes an issue later, it can be added as a denormalized field.

3. **Cache wrapper (`lib/cache-wrapper.ts`) -- does it need scoping too?**
   - What we know: `cache-wrapper.ts` has its own Prisma queries for lessons, payments, and time slots. These appear to be used for server-side caching/optimization.
   - Recommendation: Yes, add coachId awareness, but this may be a lower priority if the cache wrapper is not actively used in current routing.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all 22 TRPC query files
- Prisma schema: `prisma/schema.prisma` -- Coach model with revenueSplitPercent, Lesson/RinkTimeSlot/BlockedDateRange with coachId (nullable)
- TRPC middleware: `src/lib/trpc.ts` -- adminProcedure, superAdminProcedure, coachProcedure definitions
- Coach queries: `src/features/coach/api/queries/*.ts` -- established scoping pattern using `coachId: ctx.coach.id`

### Secondary (MEDIUM confidence)
- STATE.md accumulated decisions -- 179 unscoped queries figure, pricing waterfall, revenue split formula

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- using only existing libraries
- Architecture (query scoping): HIGH -- patterns directly observable in codebase
- Architecture (super admin dashboard): HIGH -- follows existing dashboard patterns
- Pitfalls: HIGH -- identified from direct code analysis
- Query audit completeness: HIGH -- systematic grep of all Prisma calls across all feature directories

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable, internal codebase patterns unlikely to change)

---

## Appendix: Complete Query Count by Table and File

### Lesson queries (unscoped in admin/student features): 28
- `analyticsQueries.ts`: 3 queries (count, findMany x2)
- `lessonQueries.ts` (admin): 8 queries (findUnique x3, create, update, findMany, delete, create-in-tx)
- `timeSlotQueries.ts`: 0 direct lesson queries (but includes Lesson in select)
- `rinkQueries.ts`: 1 query (count for delete check)
- `studentQueries.ts`: 1 query (count for delete)
- `bookingQueries.ts` (student): 4 queries (findUnique, count, create, update)
- `profileQueries.ts` (student): 2 queries (findMany x2)
- `lessonQueries.ts` (student): 1 query (findUnique)
- `student/schedule/[lessonId]/page.tsx`: 1 query (findUnique with direct Prisma)
- `cache-wrapper.ts`: 2 queries (findMany x2)

### RinkTimeSlot queries (unscoped): 18
- `timeSlotQueries.ts`: 11 queries (findMany x3, findFirst x3, create, delete, update, deleteMany, createMany)
- `lessonQueries.ts` (admin): 1 query (findUnique in assignStudent)
- `availabilityQueries.ts` (student): 2 queries (findMany x2)
- `bookingQueries.ts` (student): 1 query (findUnique)
- `rinkQueries.ts`: 1 query (count for delete check)
- `recurringPatternQueries.ts`: 1 query (createMany)
- `cache-wrapper.ts`: 1 query (findMany)

### Payment queries (unscoped): 16
- `paymentQueries.ts`: 8 queries (findMany, count, findUnique x3, update x2, aggregate x3)
- `analyticsQueries.ts`: 3 queries (count, aggregate x2)
- `lessonQueries.ts` (admin): 3 queries (update, create x2 in tx)
- `bookingQueries.ts` (student): 1 query (create in tx)
- `cache-wrapper.ts`: 5 queries (findMany, aggregate x4)

### BlockedDateRange queries (unscoped): 7
- `blockedDateQueries.ts`: 7 queries (findMany, findFirst x2, create, findUnique x2, update, delete)

**Total unscoped queries across these 4 tables: ~69 direct Prisma calls** (some are mutations that need to SET coachId, others are reads that need to FILTER by coachId)

Note: The "179 identified queries" from STATE.md likely counts all Prisma calls across the entire codebase including coach-model queries, user queries, student queries, notifications, etc. The queries specifically requiring coachId scoping (on the 4 tables with coachId) are ~69.
