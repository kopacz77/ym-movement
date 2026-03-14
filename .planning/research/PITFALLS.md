# Domain Pitfalls: Single-Coach to Multi-Coach Migration

**Domain:** Multi-coach scheduling platform (evolving from single-coach)
**Researched:** 2026-03-14
**Overall Confidence:** HIGH (based on direct codebase analysis + verified patterns)

---

## Critical Pitfalls

Mistakes that cause data loss, security breaches, or require rewrites.

---

### CRITICAL-1: Unscoped Queries Leak Data Between Coaches

**What goes wrong:** After adding a `coachId` column, existing queries continue to return ALL data across all coaches. A new coach logs in and sees Yura's students, payments, and lesson history. This is the single most common multi-tenant failure mode.

**Why it happens in THIS codebase:** The current query pattern has zero tenant scoping. Every query operates on the full dataset:

- `analyticsQueries.ts` line 43: `ctx.prisma.student.count()` -- counts ALL students globally
- `analyticsQueries.ts` line 45: `ctx.prisma.lesson.count(...)` -- counts ALL lessons globally
- `paymentQueries.ts` line 81: `ctx.prisma.payment.findMany(...)` -- returns ALL payments with no coach filter
- `timeSlotQueries.ts` line 36: `ctx.prisma.rinkTimeSlot.findMany(...)` -- returns ALL time slots
- `lessonQueries.ts` line 207: `ctx.prisma.lesson.findMany(...)` -- returns ALL lessons
- `studentQueries.ts` line 75: `ctx.prisma.student.findMany(...)` -- returns ALL students
- `bookingQueries.ts` line 296: `ctx.prisma.user.findMany({ where: { role: "ADMIN" }})` -- notifies ALL admins

There are **179 total occurrences** of `findMany`, `findFirst`, and `findUnique` across 13 admin query files. Each one is a potential data leak point.

**Consequences:**
- Coach A sees Coach B's student contact info, payment amounts, lesson notes
- Revenue reports show combined numbers (coaches see each other's income)
- A coach could modify or cancel another coach's lessons
- Students see time slots from coaches they don't train with

**Warning signs:**
- Any query file that does not include a `coachId` in its `where` clause
- Analytics that show suspiciously high numbers after adding the second coach
- Students receiving notifications from coaches they don't know

**Prevention strategy:**
1. Create a `coachScopedProcedure` middleware in TRPC that extracts the coach's ID from the session and injects it into context
2. Build a `withCoachScope(coachId)` Prisma helper that wraps all `where` clauses with the coach filter
3. Audit every single query file systematically -- do not rely on "finding them as you go"
4. For super-admin queries, explicitly opt OUT of scoping with a separate procedure
5. Consider PostgreSQL Row-Level Security (RLS) as a database-level safety net for the `coachId` column

**Detection:** Write an integration test that creates data for Coach A, then queries as Coach B. If Coach B sees anything, the test fails.

**Phase mapping:** Must be addressed in the SAME phase as adding `coachId` to the database. Never deploy the schema change without the query scoping.

**Confidence:** HIGH -- directly verified by reading every query file in the codebase.

---

### CRITICAL-2: JWT Sessions Contain Stale Roles After Migration

**What goes wrong:** Yura's existing JWT token has `role: "ADMIN"`. After the migration changes her role to `SUPER_ADMIN` (or adds a dual role), her existing session still says `ADMIN`. The `isAdmin` middleware in `trpc.ts` line 112 checks `ctx.session.user.role !== "ADMIN"` -- if the role value changes, Yura gets locked out of her own app immediately upon deploy.

**Why it happens in THIS codebase:**

The auth system uses JWT strategy (not database sessions):
```typescript
// src/lib/auth.ts line 11
session: { strategy: "jwt" }
```

The JWT callback stores the role at login time:
```typescript
// src/lib/auth.ts line 123
async jwt({ token, user }) {
  if (user) {
    token.role = user.role;  // Set ONCE at login, never refreshed
  }
}
```

The admin middleware does a strict equality check:
```typescript
// src/lib/trpc.ts line 112
if (ctx.session.user.role !== "ADMIN") {
  throw new TRPCError({ code: "FORBIDDEN" });
}
```

This means:
- If Yura's role changes from `ADMIN` to `SUPER_ADMIN` in the database, her JWT still says `ADMIN`
- If the middleware is updated to check for `SUPER_ADMIN` before Yura logs out and back in, she is locked out
- If the middleware is updated AFTER deploy but BEFORE Yura logs out, she keeps the old `ADMIN` role in her token which no longer passes the new check
- JWT sessions last 7 days (`maxAge: 7 * 24 * 60 * 60`) -- the stale role persists for up to a week

**Consequences:**
- Yura (the only admin) gets locked out of the production app
- Active students may lose access if their sessions are also affected
- Requires manual database intervention or emergency deploy to fix

**Warning signs:**
- "FORBIDDEN" errors immediately after deploying role changes
- Users reporting "Admin access required" when they are admins

**Prevention strategy:**
1. Update the middleware FIRST to accept BOTH old and new roles: `if (!["ADMIN", "SUPER_ADMIN", "COACH"].includes(role))`
2. Add role refresh in the JWT callback -- on each request, re-read the role from the database (with caching to avoid N+1):
   ```typescript
   async jwt({ token }) {
     // Refresh role from DB periodically
     const user = await prisma.user.findUnique({
       where: { id: token.id },
       select: { role: true }
     });
     if (user) token.role = user.role;
     return token;
   }
   ```
3. Keep the `ADMIN` role value in the database during transition -- add `SUPER_ADMIN` and `COACH` as NEW values, don't rename `ADMIN`
4. Deploy the middleware change BEFORE the database migration
5. Test the full login flow in staging with actual JWT tokens

**Phase mapping:** Must be the FIRST thing addressed -- before any schema changes. A backwards-compatible auth layer is the foundation.

**Confidence:** HIGH -- directly verified from `auth.ts` and `trpc.ts` source code.

---

### CRITICAL-3: Google Calendar Becomes Single Point of Failure for All Coaches

**What goes wrong:** The current Google Calendar integration uses a single hardcoded service account and calendar ID. Adding more coaches without refactoring this means: (a) all coaches' lessons appear on Yura's personal calendar, (b) new coaches cannot see their own lessons in their own Google Calendar, or (c) the system breaks entirely if the single service account quota is exceeded.

**Why it happens in THIS codebase:**

The calendar module in `src/lib/google/calendar.ts` is a singleton with hardcoded credentials:
```typescript
// Line 26: Single service account impersonating a single user
subject: process.env.GOOGLE_CALENDAR_ID || "yuraxmin@gmail.com"

// Line 121: Single calendar for all events
calendarId: process.env.GOOGLE_CALENDAR_ID || "yuraxmin@gmail.com"
```

The `INSTRUCTOR_EMAIL` environment variable is used as the attendee for ALL lessons:
```typescript
// bookingQueries.ts line 181
{ email: process.env.INSTRUCTOR_EMAIL || "yuraxmin@gmail.com" }

// lessonQueries.ts line 91
{ email: process.env.INSTRUCTOR_EMAIL || "" }
```

There are **4 references** to `GOOGLE_CALENDAR_ID` and **4 references** to `INSTRUCTOR_EMAIL` across the codebase -- all assuming a single coach.

**Consequences:**
- All lesson events for all coaches land on Yura's calendar
- New coaches have no calendar integration
- Google Calendar API has per-user quotas; a single impersonated user hitting the quota breaks calendar sync for everyone
- If Yura's Google account credentials expire, ALL calendar integration stops

**Warning signs:**
- New coach reports they cannot see their lessons in Google Calendar
- Yura's calendar becomes cluttered with lessons from other coaches
- Google API 429 (rate limit) errors in logs

**Prevention strategy:**
1. Refactor `googleCalendar` from a singleton to a factory: `getCalendarForCoach(coachId)` that looks up the coach's calendar credentials
2. Store per-coach Google Calendar configuration in the database (calendar ID, optional service account)
3. Make calendar integration OPTIONAL per coach -- not every coach will have Google Workspace
4. Keep the existing integration working for Yura during the transition
5. Handle the case where a coach has NO calendar configured (graceful degradation, not crash)
6. Consider using Google Calendar API's `quotaUser` parameter to avoid per-user quota limits

**Phase mapping:** This should be a LATER phase. The calendar integration currently works and is non-critical for multi-coach data isolation. Prioritize database scoping first, calendar per-coach second.

**Confidence:** HIGH -- directly verified from `src/lib/google/calendar.ts`.

---

### CRITICAL-4: Existing Production Data Has No Coach Association

**What goes wrong:** The database has real lessons, payments, time slots, and students with no `coachId` column. When you add `coachId` as a required foreign key, existing rows violate the constraint and the migration fails. If you make it optional, queries without coach scoping silently return orphaned data.

**Why it happens in THIS codebase:**

Looking at the schema, these tables need a `coachId` but currently lack one:
- `Lesson` -- 54 lines of schema, no coach reference
- `RinkTimeSlot` -- no coach reference (time slots are rink-scoped, not coach-scoped)
- `Payment` -- no coach reference (payments are lesson-scoped)
- `Student` -- no coach reference (students belong to "the system")
- `BlockedDateRange` -- has `createdById` (user who created it) but no coach association
- `DefaultPricing` -- single global pricing, no per-coach pricing
- `RecurringPattern` -- no coach reference
- `Settings` -- key-value store, no coach scoping

**Consequences:**
- Migration fails if `coachId` is `NOT NULL` (existing rows have no value)
- Migration succeeds but leaves orphaned data if `coachId` is nullable
- Backfill script assigns wrong coach to existing data
- Existing students lose their lesson history if the backfill is botched
- Payment records become detached from lessons if foreign keys break

**Warning signs:**
- Prisma migration fails with "null value in column coachId violates not-null constraint"
- After migration, dashboard shows 0 students / 0 lessons for Yura
- Reports show revenue as $0 because payments have no coach association

**Prevention strategy:**
1. Add `coachId` as NULLABLE first: `coachId String?`
2. Write and TEST a backfill migration script that assigns Yura's coach ID to ALL existing records
3. Run the backfill in a transaction with rollback capability
4. Verify the backfill: `SELECT COUNT(*) FROM "Lesson" WHERE "coachId" IS NULL` should return 0
5. Only THEN add the NOT NULL constraint in a separate migration
6. Use Prisma's two-step approach: `prisma migrate dev` for the nullable column, then a custom SQL migration for the constraint
7. Test the backfill against a copy of production data, not just dev data
8. PostgreSQL note: adding a NOT NULL constraint requires a full table scan but does NOT lock the table for writes if done via `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` followed by `VALIDATE CONSTRAINT`

**Phase mapping:** This is the FIRST database change. Everything else depends on having `coachId` on the core tables.

**Confidence:** HIGH -- directly verified from `prisma/schema.prisma` and production data structure.

---

### CRITICAL-5: Student-Coach Relationship Is Not One-to-One

**What goes wrong:** The naive approach adds `coachId` to the `Student` table, assuming each student belongs to one coach. In figure skating (and most coaching), a student may train with multiple coaches. This wrong assumption bakes in a structural limitation that requires a schema rewrite later.

**Why it happens in THIS codebase:**

The current `Student` model has no coach relationship at all -- students implicitly belong to "the system" (Yura). The temptation is to add a simple `coachId` foreign key to `Student`. But:
- A figure skater might have a main coach (Yura) plus a choreography coach
- A student switching coaches should retain their lesson/payment history with both
- A student might take private lessons with Coach A and group lessons with Coach B
- Custom pricing (`privateLessonPrice`, `choreographyPrice`) on the Student model is currently per-student -- but in multi-coach, prices differ per coach-student pair

**Consequences:**
- If `Student.coachId` is a single FK, switching coaches means losing history
- Shared students appear only in one coach's dashboard
- Pricing breaks: Coach A charges $120/hr for privates, Coach B charges $100/hr -- but the student only has one `privateLessonPrice` field
- Reports become inaccurate when students train with multiple coaches

**Warning signs:**
- Business requirement: "Can a student see both their coaches' schedules?"
- Coach says "I can't see Student X" even though they teach them
- Price calculations are wrong for students who train with multiple coaches

**Prevention strategy:**
1. Scope ownership at the LESSON level, not the Student level: `Lesson.coachId` is the primary relationship
2. Create a junction table `CoachStudent` for coach-student relationships with per-coach pricing
3. Move custom pricing from `Student` to `CoachStudent`: each coach-student pair has its own rates
4. Keep `Student` as a user-level entity (belongs to the system, not a coach)
5. Time slots can optionally belong to a coach (coach creates their own availability)
6. Students can book with any coach whose time slots they can see

**Phase mapping:** This architectural decision must be made BEFORE the database migration. Getting this wrong means a second migration later.

**Confidence:** HIGH -- domain knowledge (figure skating coaching structure) combined with schema analysis.

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or user confusion.

---

### MODERATE-1: The Admin Middleware Becomes an Authorization Nightmare

**What goes wrong:** The current system has two roles (`ADMIN`, `STUDENT`) with a simple binary check. Multi-coach introduces at least three roles (`SUPER_ADMIN`, `COACH`, `STUDENT`) with overlapping permissions. The flat `role !== "ADMIN"` check proliferates into spaghetti conditionals across 21+ files.

**Why it happens in THIS codebase:**

The middleware in `trpc.ts` is a simple gate:
```typescript
const isAdmin = t.middleware(({ ctx, next }) => {
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  // ...
});
```

This pattern exists in BOTH `trpc.ts` and `trpc-optimized.ts` (duplicate middleware definitions). There are 21 files that reference `role.*ADMIN` checks.

New requirements:
- SUPER_ADMIN can do everything (manage coaches, see all data, configure system)
- COACH can manage their own students, time slots, lessons, payments
- COACH cannot see other coaches' data
- COACH cannot manage system settings, rinks, or approve other coaches
- STUDENT remains unchanged

**Warning signs:**
- Feature requests like "coaches should be able to X but not Y" become hard to implement
- Authorization bugs where coaches can access admin-only settings
- Code reviews catch missing permission checks

**Prevention strategy:**
1. Define a permission system, not just roles: `canManageStudents`, `canViewAllData`, `canManageSettings`
2. Create middleware per permission level: `superAdminProcedure`, `coachProcedure`, `coachOrAdminProcedure`
3. Centralize all permission logic in ONE file (not split between `trpc.ts` and `trpc-optimized.ts`)
4. Add the coach's ID to the context in the middleware so every handler has it available
5. Yura's account needs BOTH `SUPER_ADMIN` AND `COACH` capabilities simultaneously

**Phase mapping:** Must be designed in the auth refactor phase, before building coach-specific features.

**Confidence:** HIGH -- directly verified from middleware code and file count.

---

### MODERATE-2: DefaultPricing and Settings Are Global Singletons

**What goes wrong:** `DefaultPricing` is a single row in the database. `Settings` is a key-value store with no scoping. When a second coach joins, they inherit Yura's pricing and operational settings. Changing settings affects both coaches.

**Why it happens in THIS codebase:**

```prisma
model DefaultPricing {
  id                 String   @id @default(cuid())
  privateLessonPrice Float    @default(75)
  groupLessonPrice   Float    @default(45)
  choreographyPrice  Float    @default(90)
  competitionPrice   Float    @default(95)
}
```

Queried as a singleton:
```typescript
// lessonQueries.ts line 364, bookingQueries.ts line 208
const defaultPricing = await ctx.prisma.defaultPricing.findFirst();
```

Settings follow the same pattern:
```typescript
// settingsQueries.ts -- key-value with global keys: "operational", "payment", "rinkAreas"
```

**Consequences:**
- Coach B's private lesson rate is forced to be the same as Yura's
- Changing cancellation policy affects all coaches
- Payment method configuration (Venmo/Zelle handles) is shared -- Coach B's students get told to pay Yura's Venmo

**Prevention strategy:**
1. Add `coachId` to `DefaultPricing` -- each coach gets their own pricing row
2. Scope `Settings` keys with coach prefix: `coach:{coachId}:operational`
3. Keep system-level settings global (rinks, areas) and coach-level settings scoped
4. Migrate existing `DefaultPricing` row to be associated with Yura's coach ID
5. New coaches should inherit system defaults, then customize

**Phase mapping:** Can be done in a later phase after core multi-coach works. Coaches can initially use the global defaults while the scoping is built.

**Confidence:** HIGH -- directly from schema and query analysis.

---

### MODERATE-3: Revenue Split Tracking Has No Foundation

**What goes wrong:** Teams build revenue split logic before understanding the payment model. The current system uses manual Venmo/Zelle verification -- there's no automated payment processing to split. Building revenue split as a payment processing feature when it's actually a bookkeeping feature wastes significant effort.

**Why it happens in THIS codebase:**

Payments are manually verified:
```typescript
// paymentQueries.ts line 215
data: {
  status: "COMPLETED",
  verifiedBy: input.verifiedBy,
  verifiedAt: new Date(),
}
```

Payment methods are Venmo, Zelle, and Cash -- none of which have APIs for automated splitting:
```prisma
enum PaymentMethod {
  VENMO
  ZELLE
  CASH
}
```

**Consequences:**
- Over-engineering: building Stripe Connect integration when coaches just want to see "how much do I owe the rink?"
- Under-engineering: tracking gross revenue per coach without accounting for rink fees, ice time costs, or platform cuts
- Incorrect splits: not accounting for the fact that Yura (as super admin + coach) has a different arrangement than guest coaches

**Prevention strategy:**
1. Start with REPORTING, not PROCESSING: "Coach A earned $X this month, platform takes Y%"
2. Add a `coachEarnings` view/table that calculates splits AFTER payment verification
3. Keep the existing Venmo/Zelle manual flow -- don't add Stripe until there's real volume
4. Revenue split config per coach: `CoachProfile.platformFeePercent`, `CoachProfile.rinkFeePercent`
5. Track: gross lesson price, platform fee, rink fee, coach net -- all as separate fields
6. Do NOT embed split logic in the booking flow -- calculate it when generating reports

**Warning signs:**
- Scope creep: "Should we integrate Stripe?" before having a second coach
- Arguments about fee structures before the coaching agreement is defined
- Building payout automation for 2 coaches (overkill)

**Phase mapping:** Revenue split should be the LAST phase. Get multi-coach scheduling and data isolation working first. Revenue reporting can use simple calculations initially.

**Confidence:** HIGH -- based on payment model analysis and domain understanding.

---

### MODERATE-4: Notification System Broadcasts to Wrong Recipients

**What goes wrong:** The current notification system sends booking notifications to ALL admin users. When coaches are added, a booking with Coach B triggers notifications to Yura and every other admin/coach, creating noise and potentially leaking business information.

**Why it happens in THIS codebase:**

```typescript
// bookingQueries.ts line 296
const adminUsers = await ctx.prisma.user.findMany({
  where: { role: "ADMIN" },
  select: { id: true },
});
// Creates notification for EVERY admin
const notificationPromises = adminUsers.map((admin) =>
  createNotification({ userId: admin.id, ... })
);
```

Similarly in `cancelLesson`:
```typescript
// bookingQueries.ts line 444
const adminUsers = await ctx.prisma.user.findMany({
  where: { role: "ADMIN" },
  select: { id: true },
});
for (const admin of adminUsers) {
  await createNotification({ userId: admin.id, ... });
}
```

**Consequences:**
- Coach A gets notified about Coach B's student bookings and cancellations
- Email reminders for Coach B's students include Yura's payment info (Venmo handle)
- SUPER_ADMIN gets overwhelmed with notifications from all coaches

**Prevention strategy:**
1. Change notification targets: booking notifications go to the LESSON'S COACH, not all admins
2. SUPER_ADMIN can opt-in to receiving all notifications (configurable)
3. Email templates must pull payment info from the specific coach, not env vars
4. Late cancellation notifications go to the affected coach specifically

**Phase mapping:** Must be updated in the same phase as lesson-coach association. Otherwise new bookings immediately leak.

**Confidence:** HIGH -- directly verified from notification code.

---

### MODERATE-5: Frontend Route Structure Assumes Single Admin

**What goes wrong:** The entire admin UI is at `/admin/*` with a single layout. Adding a coach portal means either: (a) coaches use the same admin routes and see data they shouldn't, or (b) a new `/coach/*` route tree is needed, duplicating significant UI code.

**Why it happens in THIS codebase:**

Route structure:
```
src/app/(protected)/admin/
  dashboard/page.tsx
  schedule/page.tsx
  students/page.tsx
  payments/page.tsx
  reports/page.tsx
  settings/page.tsx
  guide/page.tsx
  layout.tsx  -- AppLayout with role="admin"
```

The layout component uses a role string for sidebar rendering:
```typescript
export default function AdminLayout({ children }) {
  return <AppLayout role="admin">{children}</AppLayout>;
}
```

**Consequences:**
- Coaches accessing `/admin/settings` can change system-wide configuration
- Building separate `/coach/*` routes duplicates the schedule, students, payments pages
- The sidebar navigation needs to show different items for admin vs coach

**Prevention strategy:**
1. Reuse `/admin/*` routes for BOTH super-admin and coach roles
2. Add permission-based UI rendering: hide Settings/Guide for coach role
3. The sidebar already supports role-based rendering via `AppLayout role` -- extend it
4. Data scoping at the API level (TRPC middleware) is MORE important than route-level protection
5. Add a `usePermissions()` hook that returns what the current user can do, used by UI components to show/hide features

**Warning signs:**
- UI duplication between admin and coach pages
- Inconsistent sidebar items when switching between roles

**Phase mapping:** Address in the coach dashboard phase. Start with shared routes + permission-based rendering, not separate route trees.

**Confidence:** HIGH -- directly verified from route structure and layout code.

---

## Minor Pitfalls

Mistakes that cause annoyance or small bugs but are fixable.

---

### MINOR-1: Overlap Detection Doesn't Account for Coach Boundaries

**What goes wrong:** The current time slot overlap detection checks if any slot at the same rink overlaps. With multi-coach, two coaches should be able to have overlapping time slots at the same rink (they teach on different parts of the ice). The existing overlap logic would prevent this.

**Why it happens in THIS codebase:**

```typescript
// timeSlotQueries.ts line 164
const overlapping = await ctx.prisma.rinkTimeSlot.findFirst({
  where: {
    rinkId: input.rinkId,  // Only checks rink, not coach
    isActive: true,
    OR: [/* overlap conditions */],
  },
});
```

**Prevention:** Add `coachId` to the overlap check -- only detect overlaps WITHIN the same coach's slots, not across coaches. Two coaches can teach at the same time on the same rink.

**Phase mapping:** Address when adding `coachId` to time slots.

---

### MINOR-2: Environment Variables Won't Scale to Multiple Coaches

**What goes wrong:** Coach-specific configuration is stored in `.env` as single values: `INSTRUCTOR_EMAIL`, `GOOGLE_CALENDAR_ID`, `GOOGLE_CLIENT_EMAIL`. These cannot represent multiple coaches.

**Prevention:** Move coach-specific configuration to the database. Create a `CoachProfile` table with fields for `email`, `googleCalendarId`, `venmoHandle`, `zelleInfo`, etc. Keep system-level env vars (`DATABASE_URL`, `NEXTAUTH_SECRET`) in `.env`.

**Phase mapping:** Address when building the coach profile system.

---

### MINOR-3: Blocked Date Ranges May Need Coach Scoping

**What goes wrong:** `BlockedDateRange` has `createdById` but no coach association. A coach blocking dates for travel shouldn't block other coaches' availability. Currently, blocked dates appear global.

**Prevention:** Add `coachId` to `BlockedDateRange`. Blocked dates should only affect the creating coach's time slots. System-wide closures (rink maintenance) should be handled separately.

**Phase mapping:** Address when refactoring blocked dates for multi-coach.

---

### MINOR-4: The `protectedProcedure` vs `adminProcedure` Inconsistency

**What goes wrong:** Some admin-only operations use `protectedProcedure` (any logged-in user) instead of `adminProcedure`. For example, `timeSlotQueries.ts` uses `protectedProcedure` for creating and deleting time slots. A student could theoretically call these endpoints.

**Why it exists:** Looking at the code:
- `paymentQueries.ts` uses `adminProcedure` (correct)
- `timeSlotQueries.ts` uses `protectedProcedure` (too permissive)
- `lessonQueries.ts` uses `protectedProcedure` (too permissive)

**Prevention:** Audit all procedures and assign correct authorization levels before adding more roles. Fixing this now prevents coaches from accidentally having student-level access (or vice versa).

**Phase mapping:** Should be cleaned up as part of the auth middleware refactor.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Severity |
|-------------|---------------|------------|----------|
| Auth/Role Refactor | JWT sessions break on role change (CRITICAL-2) | Update middleware to accept multiple roles BEFORE schema change | Critical |
| Auth/Role Refactor | Inconsistent procedure authorization (MINOR-4) | Audit all TRPC procedures for correct middleware | Minor |
| Database Migration | NOT NULL constraint fails on existing data (CRITICAL-4) | Two-step: nullable column + backfill + constraint | Critical |
| Database Migration | Student-coach modeled as 1:1 instead of M:N (CRITICAL-5) | Use junction table, scope at lesson level | Critical |
| Query Scoping | 179 queries return unscoped data (CRITICAL-1) | Build `coachScopedProcedure` middleware, audit every query | Critical |
| Query Scoping | Overlap detection blocks cross-coach slots (MINOR-1) | Add coachId to overlap where clause | Minor |
| Notifications | Broadcasts to all admins (MODERATE-4) | Route notifications to lesson's coach specifically | Moderate |
| Pricing/Settings | Global singletons shared across coaches (MODERATE-2) | Scope DefaultPricing and Settings per coach | Moderate |
| Calendar Integration | Singleton calendar breaks multi-coach (CRITICAL-3) | Factory pattern, per-coach config, graceful degradation | Critical |
| Revenue Tracking | Over-engineering payment processing (MODERATE-3) | Start with reporting, not automation | Moderate |
| Frontend | Admin routes accessible to coaches (MODERATE-5) | Permission-based rendering, shared routes | Moderate |
| Environment Config | Env vars can't represent multiple coaches (MINOR-2) | Move coach config to database | Minor |

---

## Recommended Phase Ordering (Risk-Based)

Based on pitfall severity and dependency analysis:

1. **Auth + Middleware** (CRITICAL-2, MODERATE-1, MINOR-4) -- Foundation; everything else requires this
2. **Database Schema + Backfill** (CRITICAL-4, CRITICAL-5) -- Must decide coach-student relationship model
3. **Query Scoping** (CRITICAL-1) -- Must deploy WITH or IMMEDIATELY AFTER schema change
4. **Notification Scoping** (MODERATE-4) -- Quick win, high visibility
5. **Coach Dashboard + Frontend** (MODERATE-5) -- User-facing changes
6. **Pricing + Settings Scoping** (MODERATE-2) -- Can use global defaults initially
7. **Calendar Integration** (CRITICAL-3) -- Complex but deferrable; existing integration still works for Yura
8. **Revenue Split Reporting** (MODERATE-3) -- Last; needs coaching agreements defined first

---

## Sources

### Codebase Analysis (Primary Source -- HIGH Confidence)
- `prisma/schema.prisma` -- Full schema review, all 13 models
- `src/lib/auth.ts` -- JWT session strategy, role callback
- `src/lib/trpc.ts` lines 107-130 -- Admin middleware implementation
- `src/lib/google/calendar.ts` -- Singleton calendar integration
- `src/features/admin/api/queries/` -- All 13 query files, 179 query occurrences
- `src/features/student/api/queries/bookingQueries.ts` -- Student booking flow
- `src/lib/pricing.ts` -- Global pricing calculation
- `src/features/admin/api/queries/settingsQueries.ts` -- Global settings store

### External Research (Supporting Sources -- MEDIUM Confidence)
- [Multi-Tenant Database Architecture Patterns](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/)
- [Row Level Security in PostgreSQL with Prisma](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35)
- [Multi-Tenant Leakage: When Row-Level Security Fails](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
- [Zero-Downtime Postgres Migrations](https://gocardless.com/blog/zero-downtime-postgres-migrations-the-hard-parts/)
- [Safe PostgreSQL Database Migrations](https://retool.com/blog/running-safe-database-migrations-using-postgres)
- [NextAuth.js Session Management](https://clerk.com/articles/nextjs-session-management-solving-nextauth-persistence-issues)
- [Auth.js Role-Based Access Control](https://authjs.dev/guides/role-based-access-control)
- [Google Calendar API Domain-Wide Delegation](https://support.google.com/a/answer/162106?hl=en)
- [Google Calendar API Quotas](https://developers.google.com/workspace/calendar/api/guides/quota)
- [Data Isolation in Multi-Tenant SaaS](https://redis.io/blog/data-isolation-multi-tenant-saas/)
- [Multi-Tenancy Implementation with Prisma and ZenStack](https://zenstack.dev/blog/multi-tenant)
