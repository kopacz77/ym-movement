# Phase 2: Coach Dashboard, Profile, and Onboarding - Research

**Researched:** 2026-03-15
**Domain:** TRPC API design, Next.js App Router pages, Prisma schema extension, role-based UI patterns
**Confidence:** HIGH

## Summary

Phase 2 builds the coach-facing experience and the super admin's coach management capabilities. The codebase already contains all the necessary patterns -- the Student model's signup flow, approval queue, profile management, and dashboard serve as direct blueprints. The Coach model already exists in the database with the right fields (bio, photoUrl, skills[], certifications, pricing fields, isApproved, isActive). The coachProcedure middleware is already exported. No new libraries are required.

The work breaks down into four distinct areas: (1) schema additions -- a `suspendedAt`/`suspendedById` pair for CMGT-04 suspension and a `ProposedTimeSlot` model for CDSH-02 proposals, (2) TRPC routers -- a `coach` namespace with profile, dashboard, earnings, students, and proposals sub-routers, plus admin-side coach management queries, (3) Next.js pages and layouts -- `/coach/*` routes with their own layout, sidebar, and header following the exact same AppLayout pattern, (4) admin-side UI -- a Coaches tab in the admin area mirroring the Students management page.

**Primary recommendation:** Follow the existing Student feature's architecture exactly -- feature-based folder structure under `src/features/coach/`, TRPC routers using the existing `coachProcedure`, and mirror the AppLayout pattern for the coach role. The Coach model already has 90% of the fields needed; add only `suspendedAt`/`suspendedById` for CMGT-04 and a new `ProposedTimeSlot` model for CDSH-02.

## Standard Stack

No new libraries are needed. This phase works entirely within the existing stack.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^6.19.0 | ORM + migrations | Coach model already exists; minor additions needed |
| @trpc/server | ^11.8.1 | API layer | coachProcedure already exported for coach-scoped endpoints |
| NextAuth.js | ^4.24.13 | Authentication | COACH role already in JWT token, middleware routing done |
| React Hook Form | (installed) | Form management | Existing pattern for profile forms |
| Zod | (bundled) | Validation | All TRPC input schemas use Zod |
| Sonner | (installed) | Toast notifications | Unified toast system already in place |
| Lucide React | (installed) | Icons | Consistent icon library throughout app |
| date-fns | (installed) | Date formatting | Used in all date display components |

### No New Dependencies Required
Every capability needed is already available in the project's dependency tree.

## Architecture Patterns

### Recommended Project Structure

```
src/
  features/
    coach/                            # NEW -- mirrors src/features/student/
      api/
        queries/
          index.ts                    # coachRouter aggregating sub-routers
          dashboardQueries.ts         # CDSH-01: upcoming/past lessons
          profileQueries.ts           # CMGT-02: get/update coach profile
          earningsQueries.ts          # CDSH-03: earnings/payment history
          studentQueries.ts           # CDSH-04: students list
          proposalQueries.ts          # CDSH-02: propose time slots
      components/
        layout/
          CoachSidebar.tsx            # Mirrors AdminSidebar/StudentSidebar
          CoachHeader.tsx             # Mirrors AdminHeader/StudentHeader
          CoachCommandPalette.tsx     # Cmd+K palette for coach routes
        dashboard/
          CoachOverviewCards.tsx       # Summary stats
          CoachUpcomingLessons.tsx     # Upcoming lessons list
          CoachPastLessons.tsx         # Past lessons list
        profile/
          CoachProfileForm.tsx        # Bio, photo, skills, certifications
        earnings/
          EarningsOverview.tsx        # Revenue summary
          PaymentHistory.tsx          # Lesson payment table
        students/
          CoachStudentList.tsx        # Students who booked with coach
        proposals/
          ProposeAvailability.tsx     # Time slot proposal form
          ProposalsList.tsx           # Coach's pending proposals
  app/
    (protected)/
      coach/
        layout.tsx                    # AppLayout role="coach"
        dashboard/
          page.tsx                    # Coach dashboard
        profile/
          page.tsx                    # Coach profile edit
        schedule/
          page.tsx                    # Coach schedule view
        earnings/
          page.tsx                    # Coach earnings
        students/
          page.tsx                    # Coach's students
    auth/
      coach-signup/
        page.tsx                      # Coach self-registration (AUTH-04)
    api/
      auth/
        coach-signup/
          route.ts                    # Coach signup API endpoint

  features/
    admin/
      api/
        queries/
          coach/                      # NEW -- admin-side coach management
            index.ts                  # coachManagementRouter
            coachApprovalQueries.ts   # CMGT-01: pending approvals
            coachQueries.ts           # CMGT-03/04: CRUD + status
      components/
        coaches/                      # NEW -- admin coach management UI
          management/
            CoachPendingApprovals.tsx  # CMGT-01: approval queue
            CoachList.tsx             # Coach list with status
            NewCoachDialog.tsx        # CMGT-03: manual creation
          profile/
            CoachProfile.tsx          # Admin view of coach profile
```

### Pattern 1: Coach TRPC Router Registration

**What:** Register the coach router in the app router, parallel to student and admin routers.
**When to use:** All coach-facing API endpoints.

```typescript
// src/lib/root.ts -- ADD coach router
import { coachRouter } from "@/features/coach/api/queries/index";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  student: studentRouter,
  coach: coachRouter,       // NEW
  notifications: notificationsRouter,
  passwordReset: passwordResetRouter,
});
```

```typescript
// src/features/coach/api/queries/index.ts
import { createTRPCRouter } from "@/lib/trpc";
import { dashboardRouter } from "./dashboardQueries";
import { profileRouter } from "./profileQueries";
import { earningsRouter } from "./earningsQueries";
import { studentRouter } from "./studentQueries";
import { proposalRouter } from "./proposalQueries";

export const coachRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  profile: profileRouter,
  earnings: earningsRouter,
  students: studentRouter,
  proposals: proposalRouter,
});
```

### Pattern 2: Coach Dashboard Queries Using coachProcedure

**What:** All coach-facing queries use the existing `coachProcedure` which auto-loads the Coach record into context.
**When to use:** Every query in `src/features/coach/api/queries/`.

```typescript
// src/features/coach/api/queries/dashboardQueries.ts
import { z } from "zod";
import { createTRPCRouter, coachProcedure } from "@/lib/trpc";

export const dashboardRouter = createTRPCRouter({
  getUpcomingLessons: coachProcedure
    .input(z.object({ limit: z.number().min(1).max(50).optional() }))
    .query(async ({ ctx, input }) => {
      const lessons = await ctx.prisma.lesson.findMany({
        where: {
          coachId: ctx.coach.id,  // ctx.coach populated by coachProcedure middleware
          startTime: { gte: new Date() },
          status: "SCHEDULED",
        },
        include: {
          Student: { include: { User: { select: { name: true, email: true } } } },
          Rink: { select: { name: true, timezone: true } },
        },
        orderBy: { startTime: "asc" },
        take: input.limit ?? 10,
      });
      return lessons;
    }),
});
```

**Critical note:** The `coachProcedure` middleware (src/lib/trpc.ts:153-176) already:
1. Checks user is authenticated
2. Verifies role via `isCoachRole()` (accepts COACH, ADMIN, SUPER_ADMIN)
3. Looks up the Coach record by `userId`
4. Passes `ctx.coach` (the full Coach row) into the handler

### Pattern 3: Coach Layout (Extending AppLayout)

**What:** The coach layout follows the identical pattern to admin and student layouts.
**When to use:** The `src/app/(protected)/coach/layout.tsx` file.

```typescript
// src/app/(protected)/coach/layout.tsx
"use client";

import { AppLayout } from "@/components/layout/AppLayout";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout role="coach">{children}</AppLayout>;
}
```

This requires extending AppLayout.tsx and AppSidebar.tsx to accept `role="coach"` with a coach navigation array and CoachHeader component.

### Pattern 4: Admin Coach Management (Mirroring Student Management)

**What:** Admin-side coach management follows the identical pattern to admin student management.
**When to use:** The admin Coaches page and TRPC queries.

```typescript
// Admin-side coach management uses superAdminProcedure (or adminProcedure)
// Not coachProcedure -- admin manages ALL coaches
import { createTRPCRouter, superAdminProcedure } from "@/lib/trpc";

export const coachApprovalQueries = createTRPCRouter({
  getPendingCoachApprovals: superAdminProcedure.query(async ({ ctx }) => {
    const pendingCoaches = await ctx.prisma.coach.findMany({
      where: { isApproved: false },
      include: { User: true },
      orderBy: { createdAt: "desc" },
    });
    return { coaches: pendingCoaches };
  }),

  approveCoach: superAdminProcedure
    .input(z.object({ coachId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Similar pattern to student approval with email notification
    }),
});
```

### Pattern 5: Coach Signup API (Mirroring Student Signup)

**What:** Coach self-registration uses the same pattern as student signup -- a Next.js API route (not TRPC) with Turnstile CAPTCHA.
**When to use:** AUTH-04 implementation.

The signup creates a User with `role: "COACH"` and a Coach record with `isApproved: false`. The flow is:
1. Coach fills out `/auth/coach-signup` form (name, email, bio, skills, certifications)
2. POST to `/api/auth/coach-signup` creates User + Coach records
3. Coach record starts with `isApproved: false`
4. Super admin sees pending coach in approval queue (CMGT-01)
5. On approval, email sent with registration completion link (password set)

### Pattern 6: Time Slot Proposals (CDSH-02)

**What:** Coaches propose time slots; super admin approves or overrides.
**When to use:** CDSH-02 implementation.

This requires a new `ProposedTimeSlot` model (or a `status` field on RinkTimeSlot). Using a separate model is cleaner because proposals have different lifecycle than actual time slots.

```prisma
model ProposedTimeSlot {
  id          String               @id @default(cuid())
  coachId     String
  rinkId      String
  startTime   DateTime
  endTime     DateTime
  maxStudents Int                  @default(1)
  status      ProposalStatus       @default(PENDING)
  adminNotes  String?
  reviewedAt  DateTime?
  reviewedById String?
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  Coach       Coach                @relation(fields: [coachId], references: [id], onDelete: Cascade)
  Rink        Rink                 @relation(fields: [rinkId], references: [id])

  @@index([coachId])
  @@index([status])
  @@index([coachId, status])
}

enum ProposalStatus {
  PENDING
  APPROVED
  DENIED
}
```

When approved, the super admin action creates a real `RinkTimeSlot` from the proposal data.

### Anti-Patterns to Avoid

- **Do not duplicate AppLayout:** Extend the existing `AppLayout` component to accept `role="coach"` rather than creating a separate layout system. The immutable sidebar architecture must be preserved.
- **Do not use `protectedProcedure` for coach queries:** Always use `coachProcedure` which provides `ctx.coach` with the coach's database ID for scoping.
- **Do not create a separate auth flow for coaches:** Reuse the existing NextAuth.js credentials provider. The signup endpoint creates the User+Coach, but login goes through the same `/api/auth/[...nextauth]` flow.
- **Do not add photo upload to Prisma:** Store `photoUrl` as a string URL. Actual file upload (to S3/Cloudinary/etc.) is a separate concern and can be deferred -- a URL field is sufficient for Phase 2.
- **Do not mix admin coach management with coach self-service:** Admin management endpoints use `superAdminProcedure`; coach self-service endpoints use `coachProcedure`. Keep them in separate router files under separate feature directories.

## Schema Changes Required

### Additions to Coach Model

The existing Coach model already has: `bio`, `photoUrl`, `skills[]`, `certifications`, `yearsExperience`, `isApproved`, `isActive`, `approvedAt`, `approvedById`, all four lesson pricing fields, `revenueSplitPercent`, and Google Calendar OAuth fields.

**Missing for CMGT-04 (suspend):**
```prisma
// Add to Coach model
suspendedAt     DateTime?
suspendedById   String?
suspendedReason String?
```

The suspension concept is distinct from deactivation:
- **Deactivated** (`isActive: false`): Coach voluntarily inactive or admin-disabled, no new bookings
- **Suspended** (`suspendedAt != null`): Disciplinary/administrative hold, different visual treatment, may reactivate

This mirrors the existing Student model which has `isActive`, `deactivatedAt`, and `deactivatedById`.

### New Model: ProposedTimeSlot

For CDSH-02 (coaches propose availability, admin approves/overrides).

```prisma
model ProposedTimeSlot {
  id           String         @id @default(cuid())
  coachId      String
  rinkId       String
  startTime    DateTime
  endTime      DateTime
  maxStudents  Int            @default(1)
  status       ProposalStatus @default(PENDING)
  adminNotes   String?
  reviewedAt   DateTime?
  reviewedById String?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  Coach        Coach          @relation(fields: [coachId], references: [id], onDelete: Cascade)
  Rink         Rink           @relation(fields: [rinkId], references: [id])

  @@index([coachId])
  @@index([status])
  @@index([coachId, status])
}

enum ProposalStatus {
  PENDING
  APPROVED
  DENIED
}
```

Also add reverse relations:
- `Coach` model: `ProposedTimeSlot ProposedTimeSlot[]`
- `Rink` model: `ProposedTimeSlot ProposedTimeSlot[]`

### /api/auth/me Endpoint Update

The TODO comment at line 37 of `src/app/api/auth/me/route.ts` explicitly calls this out:
```typescript
// TODO (Phase 1, Plan 03): Include Coach profile for SUPER_ADMIN/COACH roles after Coach model exists
```

This must be updated to include Coach data when the user's role is COACH or SUPER_ADMIN:
```typescript
Coach: ["COACH", "SUPER_ADMIN", "ADMIN"].includes(session.user.role)
  ? { select: { id: true, isApproved: true, isActive: true, suspendedAt: true } }
  : undefined,
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coach approval queue | Custom approval system | Mirror existing `approvalQueries.ts` pattern | Student approval is identical workflow; copy and adapt |
| Coach signup security | Custom bot protection | Existing Turnstile + honeypot + rate limiting from student signup | Battle-tested security layers already in production |
| Coach layout/sidebar | New layout system | Extend existing `AppLayout` + `AppSidebar` components | Immutable sidebar architecture per CLAUDE.md; just add `role="coach"` support |
| Toast notifications | Custom notification UI | Existing Sonner toast system | Already standardized across 57+ components |
| Form validation | Custom validation logic | Zod schemas with React Hook Form | Project standard; used in all existing forms |
| Password flow | New password creation flow | Existing `complete-registration` flow with `createPasswordResetToken` | Identical pattern to student onboarding |
| Coach data fetching hook | New auth context | Extend `useCurrentUser` to handle COACH role | Same `/api/auth/me` pattern as student |
| Role-based redirects | Custom routing | Existing `dashboardForRole()` in `src/lib/roles.ts` | Already handles COACH -> /coach/dashboard |

**Key insight:** This phase is almost entirely pattern replication. The Student feature provides a complete blueprint for every aspect of the Coach feature. The existing architecture was designed to support this multi-role expansion.

## Common Pitfalls

### Pitfall 1: PascalCase Prisma Relations
**What goes wrong:** Accessing `coach.user` instead of `coach.User`, causing undefined errors at runtime.
**Why it happens:** The codebase uses PascalCase relation names per CLAUDE.md standards (`User`, `Coach`, `Student`, `Lesson`, `Rink`).
**How to avoid:** Always use PascalCase when accessing relations: `coach.User.name`, `lesson.Student.User`, `coach.CoachStudent`.
**Warning signs:** "Cannot read properties of undefined" errors in production that don't appear in TypeScript compilation.

### Pitfall 2: Forgetting to Scope Queries by coachId
**What goes wrong:** A coach endpoint returns data for ALL coaches instead of just the logged-in coach.
**Why it happens:** Using `protectedProcedure` instead of `coachProcedure`, or forgetting to include `coachId: ctx.coach.id` in the where clause.
**How to avoid:** Every coach-facing query MUST use `coachProcedure` and filter by `ctx.coach.id`.
**Warning signs:** Coach dashboard showing more lessons/students than expected during testing.

### Pitfall 3: AppLayout Not Supporting "coach" Role
**What goes wrong:** Coach layout renders without sidebar navigation or with wrong navigation items.
**Why it happens:** `AppLayout` currently only accepts `role: "admin" | "student"`. Adding "coach" requires updating the type, navigation arrays, and header component selection.
**How to avoid:** Update `AppLayout.tsx`, `AppSidebar.tsx`, and the mobile sidebar in `AppLayout` to handle `role="coach"` with appropriate navigation and header components.
**Warning signs:** TypeScript errors on `<AppLayout role="coach">`, or runtime fallback to admin/student navigation.

### Pitfall 4: Coach Signup vs Login Confusion
**What goes wrong:** The coach signup creates a User with `role: COACH` but the complete-registration flow doesn't know how to handle COACH users.
**Why it happens:** The existing `/auth/complete-registration` page may have student-specific logic.
**How to avoid:** Verify that `complete-registration` is role-agnostic -- it should work for any user who needs to set a password, regardless of role. The existing implementation likely works since it just sets a password on the User record.
**Warning signs:** New coaches can sign up but can't complete their registration after approval.

### Pitfall 5: Missing useCurrentUser Coach Support
**What goes wrong:** The `useCurrentUser` hook doesn't fetch Coach data, leaving coach-facing components without the coach ID.
**Why it happens:** The hook currently only handles STUDENT and ADMIN/SUPER_ADMIN roles (src/hooks/useCurrentUser.ts:14,42).
**How to avoid:** Update `useCurrentUser` to also handle COACH role, fetching Coach profile data from `/api/auth/me` (which must also be updated to include Coach data).
**Warning signs:** Coach dashboard components can't access `coachId`, queries fail with empty/undefined IDs.

### Pitfall 6: Duplicate Router Name Collision
**What goes wrong:** The coach feature's student queries router conflicts with the existing student router namespace.
**Why it happens:** Both `src/features/coach/api/queries/studentQueries.ts` and `src/features/student/api/queries/index.ts` might export a `studentRouter`.
**How to avoid:** Use unique names: `coachStudentsRouter` for the coach-side, or scope via the parent router (e.g., `api.coach.students.getMyStudents`).
**Warning signs:** TypeScript "duplicate identifier" errors or wrong router being called.

### Pitfall 7: Suspension Status Not Checked in Login Flow
**What goes wrong:** A suspended coach can still log in and access the dashboard.
**Why it happens:** The NextAuth authorize callback doesn't check Coach suspension status.
**How to avoid:** After adding suspension, update the authorize callback or add a guard in the coach layout that checks for suspension and shows an appropriate message.
**Warning signs:** Suspended coaches accessing the platform normally.

## Code Examples

### Coach Profile Update (CMGT-02)

```typescript
// src/features/coach/api/queries/profileQueries.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, coachProcedure } from "@/lib/trpc";

export const profileRouter = createTRPCRouter({
  getProfile: coachProcedure.query(async ({ ctx }) => {
    const coach = await ctx.prisma.coach.findUnique({
      where: { id: ctx.coach.id },
      include: {
        User: { select: { name: true, email: true, createdAt: true } },
      },
    });

    if (!coach) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Coach profile not found" });
    }

    return coach;
  }),

  updateProfile: coachProcedure
    .input(z.object({
      bio: z.string().max(500).optional(),
      photoUrl: z.string().url().optional().nullable(),
      skills: z.array(z.string()).optional(),
      certifications: z.string().max(1000).optional().nullable(),
      yearsExperience: z.number().int().min(0).max(99).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.prisma.coach.update({
        where: { id: ctx.coach.id },
        data: input,
        include: {
          User: { select: { name: true, email: true } },
        },
      });
      return updated;
    }),
});
```

### Coach Earnings Query (CDSH-03)

```typescript
// src/features/coach/api/queries/earningsQueries.ts
import { createTRPCRouter, coachProcedure } from "@/lib/trpc";
import { z } from "zod";

export const earningsRouter = createTRPCRouter({
  getEarningsSummary: coachProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalEarnings, monthEarnings, pendingPayments] = await Promise.all([
      ctx.prisma.payment.aggregate({
        where: {
          Lesson: { coachId: ctx.coach.id },
          status: "COMPLETED",
        },
        _sum: { amount: true },
      }),
      ctx.prisma.payment.aggregate({
        where: {
          Lesson: { coachId: ctx.coach.id },
          status: "COMPLETED",
          lesson_date: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      ctx.prisma.payment.aggregate({
        where: {
          Lesson: { coachId: ctx.coach.id },
          status: "PENDING",
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const splitPercent = ctx.coach.revenueSplitPercent / 100;

    return {
      totalEarnings: (totalEarnings._sum.amount ?? 0) * splitPercent,
      monthEarnings: (monthEarnings._sum.amount ?? 0) * splitPercent,
      pendingAmount: (pendingPayments._sum.amount ?? 0) * splitPercent,
      pendingCount: pendingPayments._count ?? 0,
      revenueSplitPercent: ctx.coach.revenueSplitPercent,
    };
  }),
});
```

### Admin Coach Status Management (CMGT-04)

```typescript
// src/features/admin/api/queries/coach/coachQueries.ts
import { createTRPCRouter, superAdminProcedure } from "@/lib/trpc";
import { z } from "zod";

export const coachQueries = createTRPCRouter({
  toggleCoachStatus: superAdminProcedure
    .input(z.object({
      coachId: z.string(),
      action: z.enum(["activate", "deactivate", "suspend"]),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {};

      switch (input.action) {
        case "activate":
          updateData.isActive = true;
          updateData.suspendedAt = null;
          updateData.suspendedById = null;
          updateData.suspendedReason = null;
          break;
        case "deactivate":
          updateData.isActive = false;
          break;
        case "suspend":
          updateData.isActive = false;
          updateData.suspendedAt = new Date();
          updateData.suspendedById = ctx.session.user.id;
          updateData.suspendedReason = input.reason ?? null;
          break;
      }

      return ctx.prisma.coach.update({
        where: { id: input.coachId },
        data: updateData,
        include: { User: { select: { name: true, email: true } } },
      });
    }),
});
```

### Extending AppLayout for Coach Role

```typescript
// Changes to src/components/layout/AppLayout.tsx

// 1. Add coach navigation array
const coachNavigation = [
  { name: "Dashboard", href: "/coach/dashboard", icon: LayoutDashboard },
  { name: "Schedule", href: "/coach/schedule", icon: Calendar },
  { name: "Students", href: "/coach/students", icon: Users },
  { name: "Earnings", href: "/coach/earnings", icon: CreditCard },
  { name: "Profile", href: "/coach/profile", icon: User },
];

// 2. Update the interface
interface AppLayoutProps {
  role: "admin" | "student" | "coach";  // Add "coach"
  children: React.ReactNode;
}

// 3. Update HeaderComponent selection
const HeaderComponent =
  role === "admin" ? AdminHeader :
  role === "coach" ? CoachHeader :
  StudentHeader;

// 4. Update navigation selection in mobile sidebar
const navigation =
  role === "admin" ? adminNavigation :
  role === "coach" ? coachNavigation :
  studentNavigation;

// 5. Update subtitle in mobile sidebar header
const subtitle =
  role === "admin" ? "Admin Dashboard" :
  role === "coach" ? "Coach Portal" :
  "Student Portal";
```

### Extending useCurrentUser for Coach Role

```typescript
// Changes to src/hooks/useCurrentUser.ts
// Add coach-specific state
const [coachId, setCoachId] = useState("");

// In the useEffect, handle COACH role
if (session?.user?.role === "COACH") {
  fetch("/api/auth/me")
    .then(res => res.json())
    .then(userData => {
      if (userData.Coach?.id) {
        setCoachId(userData.Coach.id);
        setIsApproved(userData.Coach.isApproved ?? false);
        setIsActive(userData.Coach.isActive ?? true);
      }
    });
}

// Return coachId alongside existing fields
return {
  id: studentId || coachId || "",
  coachId: coachId || "",
  // ... existing fields
  isCoach: session?.user?.role === "COACH",
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single admin user | Multi-role (SUPER_ADMIN/ADMIN/COACH/STUDENT) | Phase 1 (just completed) | AppLayout, middleware, TRPC all support COACH role |
| No Coach model | Coach model in Prisma schema | Phase 1 (just completed) | All Coach fields available, coachProcedure working |
| Student-only signup | Student signup with Turnstile | Existing | Pattern ready to replicate for coach signup |
| Admin-only management | Admin manages students (approval, create, toggle) | Existing | Pattern ready to replicate for coach management |

**Already done in Phase 1 (no re-work needed):**
- `COACH` value in Role enum
- Coach model with all profile/pricing/calendar fields
- `coachProcedure` middleware with Coach lookup
- `isCoachRole()` helper in roles.ts
- `dashboardForRole()` returns `/coach/dashboard` for COACH
- Middleware routes COACH to `/coach/*`
- Login redirects COACH to `/coach/dashboard`
- CoachStudent junction table exists

## Open Questions

### 1. Photo Upload Strategy
- **What we know:** Coach model has `photoUrl` (String?) field for profile photo
- **What's unclear:** How should photos be uploaded? Options: (a) external URL only, (b) upload to Cloudinary/S3, (c) base64 in database
- **Recommendation:** For Phase 2, accept a URL string only (paste a link). File upload to cloud storage can be added later. This avoids introducing new infrastructure dependencies now.

### 2. Coach Pricing Display vs Edit
- **What we know:** Coach model has `privateLessonPrice`, `groupLessonPrice`, `choreographyPrice`, `competitionPrepPrice` fields
- **What's unclear:** Should coaches edit their own rates, or is that super-admin-only? The out-of-scope section in REQUIREMENTS.md says "Coach-set pricing" is out of scope ("Super admin controls pricing; coaches don't set their own rates")
- **Recommendation:** Coaches can VIEW their rates on their profile (read-only). Only the super admin can SET rates through the admin coach management interface. The profile form should display rates as read-only fields.

### 3. Complete Registration Flow for Coaches
- **What we know:** Students go through: signup (no password) -> admin approval -> email with token -> complete-registration (set password)
- **What's unclear:** Does the existing `/auth/complete-registration` page work for COACH users without modification?
- **Recommendation:** Verify the complete-registration flow is role-agnostic. It likely is since it just sets a password on the User record. If it has student-specific UI, add conditional rendering based on role.

### 4. Skills Field Data Format
- **What we know:** Coach model has `skills String[]` (PostgreSQL array)
- **What's unclear:** What are valid skills? Free-form text? Predefined list?
- **Recommendation:** Use free-form text tags (comma-separated input -> array). Examples: "Ice Dance", "Freestyle", "Dry Land Training", "Choreography", "Spinning". No enum -- keep it flexible for now.

## Sources

### Primary (HIGH confidence)
- **Prisma schema** (`prisma/schema.prisma`) -- Coach model fields verified at lines 359-406
- **TRPC setup** (`src/lib/trpc.ts`) -- coachProcedure verified at lines 153-183
- **Middleware** (`middleware.ts`) -- COACH routing verified at lines 97-106
- **Roles helper** (`src/lib/roles.ts`) -- isCoachRole and dashboardForRole verified
- **Student approval pattern** (`src/features/admin/api/queries/student/approvalQueries.ts`) -- blueprint for coach approval
- **Student signup API** (`src/app/api/auth/signup/route.ts`) -- blueprint for coach signup
- **Student signup page** (`src/app/auth/signup/page.tsx`) -- blueprint for coach signup UI
- **AppLayout** (`src/components/layout/AppLayout.tsx`) -- layout pattern to extend
- **AppSidebar** (`src/components/layout/AppSidebar.tsx`) -- sidebar pattern to extend
- **useCurrentUser** (`src/hooks/useCurrentUser.ts`) -- hook to extend for coach role
- **/api/auth/me** (`src/app/api/auth/me/route.ts`) -- TODO comment at line 37 explicitly calls for Coach profile inclusion
- **Phase 1 verification** (`01-VERIFICATION.md`) -- 18/18 must-haves passed, all foundations in place

### Secondary (MEDIUM confidence)
- **REQUIREMENTS.md** -- Requirement definitions for AUTH-04, CMGT-01 through CMGT-04, CDSH-01 through CDSH-04
- **ROADMAP.md** -- Phase 2 scope and success criteria
- **STATE.md** -- Prior decisions and accumulated context

### Tertiary (LOW confidence)
- **Suspension model design** -- Based on the existing Student deactivation pattern (`isActive`/`deactivatedAt`/`deactivatedById`). The addition of `suspendedAt`/`suspendedById`/`suspendedReason` is a recommendation, not verified against any external source. Alternative: use a single `status` enum field instead of boolean flags.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing tools verified in codebase
- Architecture: HIGH -- direct pattern replication from existing Student and Admin features, verified against source files
- Schema changes: HIGH for suspension fields (mirrors existing pattern), MEDIUM for ProposedTimeSlot (new concept, clean design)
- Pitfalls: HIGH -- all identified from actual code inspection of existing patterns and edge cases

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable -- existing codebase patterns unlikely to change)
