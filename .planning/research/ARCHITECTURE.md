# Architecture Patterns: Multi-Coach Scheduling

**Domain:** Multi-coach scheduling platform (extending single-coach)
**Researched:** 2026-03-14
**Confidence:** HIGH (based on thorough codebase analysis + verified patterns)

---

## Current Architecture Summary

Before designing the multi-coach extension, here is what currently exists and where the seams are.

### Current Database Schema (Coach-Relevant Entities)

```
User (id, email, name, password, role[ADMIN|COACH|STUDENT])
  |-- Student (1:1, userId -> User.id)
  |     |-- Lesson[] (studentId -> Student.id)
  |     |-- Payment[] (studentId -> Student.id)
  |-- Notification[] (userId -> User.id)
  |-- BlockedDateRange[] (createdById -> User.id)
  |-- StudentNote[] (createdById -> User.id)

Rink (id, name, timezone, address)
  |-- RinkTimeSlot[] (rinkId -> Rink.id)
  |     |-- Lesson[] (timeSlotId -> RinkTimeSlot.id)
  |-- Lesson[] (rinkId -> Rink.id)

Lesson (studentId, rinkId, timeSlotId, type, price, status, googleCalendarEventId)
  |-- Payment (1:1, lessonId -> Lesson.id)

DefaultPricing (single global row: privateLessonPrice, groupLessonPrice, etc.)
Settings (key-value store for operational/payment/rinkAreas)
```

### Current TRPC Router Tree

```
appRouter
  |-- admin
  |     |-- analytics (getOverview, getStudentActivity, getRevenueReport, getStudentAttendance)
  |     |-- payment (getPayments, verifyPayment, sendPaymentReminder, getPaymentStats)
  |     |-- schedule
  |     |     |-- getRinks, createRink, updateRink, deleteRink
  |     |     |-- getTimeSlots, createTimeSlot, deleteTimeSlot, updateTimeSlot
  |     |     |-- createBulkTimeSlots, deleteBulkTimeSlots
  |     |     |-- createLesson, cancelLesson, getLessonsByDate
  |     |     |-- assignStudentToTimeSlot, updateLessonType, unassignStudent
  |     |     |-- getStudents (for assignment dialog)
  |     |     |-- getBlockedDates, createBlockedDate, updateBlockedDate, deleteBlockedDate
  |     |     |-- createRecurringPattern
  |     |-- student (getStudents, getStudentStats, approveStudent, etc.)
  |     |-- settings (getSettings, saveSettings, resetSettings)
  |     |-- auth (changePassword, verifyResetToken, resetPassword, requestReset)
  |-- student
  |     |-- booking (bookLesson, cancelLesson)
  |     |-- profile (getProfile, updateProfile)
  |     |-- lessons (getLessons, getLessonById)
  |     |-- availability (getAvailability)
  |-- notifications (getNotifications, markAsRead, markAllAsRead)
  |-- passwordReset
```

### Current Auth Architecture

```
middleware.ts:
  - Checks JWT token via getToken()
  - Valid roles: ["ADMIN", "STUDENT"] (line 75)
  - /admin/* requires role === "ADMIN"
  - /student/* requires role === "STUDENT"
  - Strict: admins CANNOT access /student routes and vice versa

src/lib/trpc.ts:
  - protectedProcedure: requires any authenticated user
  - adminProcedure: requires role === "ADMIN"
  - (no coachProcedure exists)

src/lib/auth.ts:
  - JWT strategy with role in token
  - Credentials provider only
  - Role stored as single string on User.role
```

### Current Google Calendar Architecture

```
src/lib/google/calendar.ts:
  - Service account authentication (JWT, not OAuth)
  - Single set of env vars: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY
  - Hardcoded calendar: GOOGLE_CALENDAR_ID || "yuraxmin@gmail.com"
  - All events go to ONE calendar
  - INSTRUCTOR_EMAIL env var used for attendee
```

### Current Page Structure

```
(protected)/
  admin/
    dashboard/    - OverviewCards, RevenueChart, StudentActivityChart, PendingApprovals
    schedule/     - ScheduleManager (calendar with time slot management)
    students/     - Student list, approval, notes, custom pricing
    payments/     - Payment list, verify, reminders
    reports/      - Revenue, attendance, export
    settings/     - Operational, payment, rink area settings
    guide/        - Admin user guide
  student/
    dashboard/    - Upcoming lessons, stats
    book/         - Browse available slots, book lessons
    schedule/     - My lessons list + [lessonId] detail
    payments/     - Payment history
    policies/     - Lesson policies
    profile/      - Edit profile
    settings/     - Change password
    guide/        - Student user guide
```

---

## Recommended Architecture for Multi-Coach

### Design Principle: Additive Extension, Not Rewrite

The current architecture is well-structured for single-coach. The multi-coach extension should:

1. **Add a Coach entity** parallel to Student (Coach -> User, like Student -> User)
2. **Add coachId foreign keys** to existing entities that need coach scoping
3. **Add new router namespaces** rather than modifying existing ones
4. **Extend middleware** to handle new roles, not restructure it
5. **Keep existing admin routes working** during migration

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Coach entity** | Profile, skills, rates, calendar tokens | User, Lesson, RinkTimeSlot, CoachRevenue |
| **SUPER_ADMIN role** | Platform-wide management, coach management | All entities via superAdmin router |
| **COACH role** | Own schedule, own students, own earnings | Coach-scoped data via coach router |
| **CoachRevenue** | Per-coach revenue split, payout tracking | Coach, Payment, Lesson |
| **Google Calendar (per-coach)** | OAuth tokens per coach, event management | Coach, Lesson |
| **Coach Dashboard** | UI for coach self-service | coach.* TRPC routes |
| **Super Admin Dashboard** | Extended admin UI with coach oversight | superAdmin.* TRPC routes |

---

## Database Schema Changes

### New Tables

```prisma
model Coach {
  id                    String    @id @default(cuid())
  userId                String    @unique
  bio                   String?
  photoUrl              String?
  skills                String[]  // e.g., ["ice_dance", "dry_land", "conditioning"]
  certifications        String?
  yearsExperience       Int?
  isApproved            Boolean   @default(false)
  isActive              Boolean   @default(true)
  approvedAt            DateTime?
  approvedById          String?

  // Per-coach pricing (overrides global DefaultPricing)
  privateLessonPrice    Float?
  groupLessonPrice      Float?
  choreographyPrice     Float?
  competitionPrepPrice  Float?

  // Revenue split
  revenueSplitPercent   Float     @default(70)  // Coach keeps 70%, platform keeps 30%

  // Google Calendar OAuth (per-coach)
  googleCalendarId      String?
  googleAccessToken     String?   // Encrypted
  googleRefreshToken    String?   // Encrypted
  googleTokenExpiresAt  DateTime?

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  User                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  Lesson                Lesson[]
  RinkTimeSlot          RinkTimeSlot[]
  BlockedDateRange      BlockedDateRange[]
  CoachStudent          CoachStudent[]

  @@index([userId])
  @@index([isApproved, isActive])
}

// Many-to-many: which students are assigned to which coaches
model CoachStudent {
  id        String   @id @default(cuid())
  coachId   String
  studentId String
  isPrimary Boolean  @default(false)  // Primary coach for this student
  createdAt DateTime @default(now())

  Coach     Coach    @relation(fields: [coachId], references: [id], onDelete: Cascade)
  Student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([coachId, studentId])
  @@index([coachId])
  @@index([studentId])
}

model CoachPayout {
  id          String        @id @default(cuid())
  coachId     String
  periodStart DateTime
  periodEnd   DateTime
  totalEarned Float         // Total lesson revenue for period
  coachShare  Float         // Coach's portion based on split
  platformShare Float       // Platform's portion
  status      PayoutStatus  @default(PENDING)
  paidAt      DateTime?
  notes       String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  Coach       Coach         @relation(fields: [coachId], references: [id])

  @@index([coachId])
  @@index([coachId, status])
  @@index([periodStart, periodEnd])
}

enum PayoutStatus {
  PENDING
  PAID
  DISPUTED
}
```

### Modified Existing Tables

```prisma
// User: Add Coach relation + new role values
model User {
  // ... existing fields ...
  role    Role    @default(STUDENT)
  Coach   Coach?  // NEW: optional 1:1 relation (like Student)
}

// Role enum: Add SUPER_ADMIN and COACH
enum Role {
  SUPER_ADMIN
  ADMIN       // Keep for backward compatibility during migration
  COACH
  STUDENT
}

// Lesson: Add coachId foreign key
model Lesson {
  // ... existing fields ...
  coachId   String?  // NEW: nullable initially for migration
  Coach     Coach?   @relation(fields: [coachId], references: [id])

  @@index([coachId])
  @@index([coachId, startTime])
  @@index([coachId, status, startTime])
}

// RinkTimeSlot: Add coachId (who owns this slot)
model RinkTimeSlot {
  // ... existing fields ...
  coachId   String?  // NEW: which coach owns this slot
  Coach     Coach?   @relation(fields: [coachId], references: [id])

  @@index([coachId])
  @@index([coachId, isActive, startTime])
}

// BlockedDateRange: Add optional coachId
model BlockedDateRange {
  // ... existing fields ...
  coachId   String?  // NEW: if set, blocks for this coach only
  Coach     Coach?   @relation(fields: [coachId], references: [id])

  @@index([coachId])
}

// Student: Add CoachStudent relation
model Student {
  // ... existing fields ...
  CoachStudent  CoachStudent[]  // NEW
}

// DefaultPricing: Stays global (coach-level pricing is on Coach model)
// Settings: Stays global (super admin controls)
// Payment: No direct coachId needed (derive via Lesson.coachId)
```

### Migration Strategy for Existing Data

This is a critical path item. The migration must:

1. Create the Coach table
2. Add nullable `coachId` columns to Lesson, RinkTimeSlot, BlockedDateRange
3. Create a Coach record for Yura linked to her existing ADMIN User
4. Update Yura's User.role from ADMIN to SUPER_ADMIN
5. Backfill all existing Lessons with coachId = Yura's Coach.id
6. Backfill all existing RinkTimeSlots with coachId = Yura's Coach.id
7. Backfill all existing BlockedDateRanges with coachId = Yura's Coach.id
8. Create CoachStudent records linking Yura to all existing students
9. Validate no orphaned records

```sql
-- Step-by-step migration (Prisma migration + seed script)

-- After schema migration adds nullable coachId columns:

-- Create Yura as Coach
INSERT INTO "Coach" (id, "userId", bio, "isApproved", "isActive", "approvedAt", "revenueSplitPercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'Head Coach & Founder', true, true, NOW(), 100, NOW(), NOW()
FROM "User" WHERE role = 'ADMIN' LIMIT 1;

-- Update Yura's role
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';

-- Backfill coachId on Lessons
UPDATE "Lesson" SET "coachId" = (SELECT id FROM "Coach" LIMIT 1) WHERE "coachId" IS NULL;

-- Backfill coachId on RinkTimeSlots
UPDATE "RinkTimeSlot" SET "coachId" = (SELECT id FROM "Coach" LIMIT 1) WHERE "coachId" IS NULL;

-- Backfill BlockedDateRanges
UPDATE "BlockedDateRange" SET "coachId" = (SELECT id FROM "Coach" LIMIT 1) WHERE "coachId" IS NULL;

-- Create CoachStudent records for all existing students
INSERT INTO "CoachStudent" (id, "coachId", "studentId", "isPrimary", "createdAt")
SELECT gen_random_uuid(), (SELECT id FROM "Coach" LIMIT 1), id, true, NOW()
FROM "Student";
```

**CRITICAL:** coachId columns should remain nullable in schema even after backfill. This provides safety during rollback and allows for edge cases (platform-level time slots, unassigned lessons during onboarding).

---

## TRPC Router Restructuring

### New Router Tree

```
appRouter
  |-- admin          (RENAMED: becomes alias for backward compat during migration)
  |-- superAdmin     (NEW: platform-wide management)
  |     |-- coaches
  |     |     |-- getCoaches, getCoachById
  |     |     |-- approveCoach, deactivateCoach
  |     |     |-- updateRevenueSplit
  |     |     |-- inviteCoach (create User + send invite email)
  |     |-- analytics (extended: per-coach breakdowns)
  |     |     |-- getOverview (platform-wide)
  |     |     |-- getCoachPerformance (per-coach metrics)
  |     |     |-- getRevenueByCoach
  |     |-- payouts
  |     |     |-- getPayouts, calculatePayout, markAsPaid
  |     |-- schedule (cross-coach visibility)
  |     |     |-- getAllTimeSlots (all coaches)
  |     |     |-- approveTimeSlot (coach-proposed slots)
  |     |-- students (platform-wide student management)
  |     |-- payments (platform-wide payments)
  |     |-- settings (global settings)
  |-- coach          (NEW: coach self-service)
  |     |-- profile
  |     |     |-- getMyProfile, updateMyProfile
  |     |     |-- connectGoogleCalendar, disconnectGoogleCalendar
  |     |-- schedule
  |     |     |-- getMyTimeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot
  |     |     |-- createBulkTimeSlots
  |     |     |-- getMyLessons, assignStudent, unassignStudent, updateLessonType
  |     |     |-- getMyBlockedDates, createBlockedDate
  |     |-- students
  |     |     |-- getMyStudents (students assigned to this coach)
  |     |-- earnings
  |     |     |-- getMyEarnings, getMyPayouts
  |-- student        (MODIFIED: add coach browsing)
  |     |-- booking
  |     |     |-- bookLesson (now requires coachId context)
  |     |     |-- cancelLesson
  |     |-- coaches  (NEW)
  |     |     |-- browseCoaches (public coach profiles)
  |     |     |-- getCoachAvailability (specific coach's open slots)
  |     |-- profile, lessons, availability (mostly unchanged)
  |-- notifications  (unchanged, works for all roles)
  |-- passwordReset  (unchanged)
```

### New TRPC Middleware

```typescript
// src/lib/trpc.ts - Extended middleware

// Existing
const isAuthed = t.middleware(/* ... */);
const isAdmin = t.middleware(/* ... */);  // Keep for backward compat

// NEW: Super admin only
const isSuperAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  // SUPER_ADMIN can do everything ADMIN could
  if (ctx.session.user.role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Super admin access required" });
  }
  return next({ ctx: { ...ctx, session: { ...ctx.session, user: ctx.session.user } } });
});

// NEW: Coach only (includes super admin acting as coach)
const isCoach = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const role = ctx.session.user.role;
  if (role !== "COACH" && role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
  }

  // Resolve coachId from session user
  const coach = await ctx.prisma.coach.findUnique({
    where: { userId: ctx.session.user.id },
  });
  if (!coach) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Coach profile not found" });
  }

  return next({
    ctx: {
      ...ctx,
      coach,  // Inject coach into context for downstream use
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

// NEW: Super admin OR admin (backward compat during migration)
const isAdminOrSuperAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const role = ctx.session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx: { ...ctx, session: { ...ctx.session, user: ctx.session.user } } });
});

export const superAdminProcedure = t.procedure.use(isSuperAdmin);
export const coachProcedure = t.procedure.use(isCoach);
export const adminOrSuperAdminProcedure = t.procedure.use(isAdminOrSuperAdmin);
```

### Coach Data Scoping Pattern

Every coach router procedure must scope queries to the authenticated coach. This is enforced at the middleware level (coach object injected into context) and at the query level.

```typescript
// Pattern: Coach-scoped query
// src/features/coach/api/queries/scheduleQueries.ts

export const coachScheduleRouter = createTRPCRouter({
  getMyTimeSlots: coachProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // ctx.coach is injected by isCoach middleware
      return ctx.prisma.rinkTimeSlot.findMany({
        where: {
          coachId: ctx.coach.id,  // ALWAYS scope to this coach
          isActive: true,
          startTime: input.startDate ? { gte: input.startDate } : undefined,
        },
        include: {
          Rink: true,
          Lesson: { include: { Student: { include: { User: true } } } },
        },
        orderBy: { startTime: "asc" },
      });
    }),
});
```

**Anti-pattern to avoid:** Never pass coachId as client input for coach's own data. Always derive from session via middleware. Client-provided coachId is only for student-facing routes (browsing coaches) and super admin routes.

---

## Route/Page Structure for Coach Dashboard

### New Route Groups

```
(protected)/
  admin/          -- EXISTING: becomes super admin pages (Yura's view)
    dashboard/    -- Extended with coach overview cards
    schedule/     -- Extended with coach filter dropdown
    students/     -- Extended with coach assignment column
    payments/     -- Extended with coach column
    reports/      -- Extended with per-coach breakdowns
    settings/     -- Extended with coach management section
    coaches/      -- NEW: coach management page
      page.tsx              -- Coach list, approval queue
      [coachId]/page.tsx    -- Individual coach detail/edit
    payouts/      -- NEW: payout management
      page.tsx              -- Payout overview, calculate, mark paid

  coach/          -- NEW ROUTE GROUP
    dashboard/    -- Coach-specific overview (today's lessons, earnings summary)
    schedule/     -- Coach's own calendar (same ScheduleManager, scoped to coach)
    students/     -- Coach's assigned students
    earnings/     -- Revenue breakdown, payout history
    profile/      -- Edit bio, skills, rates, photo
    settings/     -- Password, Google Calendar connection
    guide/        -- Coach user guide

  student/        -- EXISTING: modified
    book/         -- Modified: browse by coach first, then see slots
    dashboard/    -- Minor: show coach name on upcoming lessons
    schedule/     -- Minor: show coach name on lesson details
```

### Layout Architecture

The coach dashboard follows the exact same AppLayout pattern as admin/student per CLAUDE.md immutable requirements.

```typescript
// src/components/layout/AppLayout.tsx - Extended

const coachNavigation = [
  { name: "Dashboard", href: "/coach/dashboard", icon: LayoutDashboard },
  { name: "Schedule", href: "/coach/schedule", icon: Calendar },
  { name: "Students", href: "/coach/students", icon: Users },
  { name: "Earnings", href: "/coach/earnings", icon: DollarSign },
  { name: "Profile", href: "/coach/profile", icon: User },
  { name: "Settings", href: "/coach/settings", icon: Settings },
  { name: "Guide", href: "/coach/guide", icon: BookOpen },
];

interface AppLayoutProps {
  role: "admin" | "coach" | "student";  // Extended
  children: React.ReactNode;
}
```

### Middleware Changes

```typescript
// middleware.ts - Extended role routing

// Updated valid roles
if (!["SUPER_ADMIN", "ADMIN", "COACH", "STUDENT"].includes(role)) {
  return NextResponse.redirect(loginUrl);
}

// Super admin can access admin routes AND coach routes
if (path.startsWith("/admin") && role !== "ADMIN" && role !== "SUPER_ADMIN") {
  return NextResponse.redirect(dashboardForRole(role));
}

// Coach routes
if (path.startsWith("/coach") && role !== "COACH" && role !== "SUPER_ADMIN") {
  return NextResponse.redirect(dashboardForRole(role));
}

// Student routes
if (path.startsWith("/student") && role !== "STUDENT") {
  return NextResponse.redirect(dashboardForRole(role));
}

// Role-to-dashboard mapping
function dashboardForRole(role: string): string {
  switch (role) {
    case "SUPER_ADMIN": return "/admin/dashboard";
    case "ADMIN": return "/admin/dashboard";
    case "COACH": return "/coach/dashboard";
    case "STUDENT": return "/student/dashboard";
    default: return "/auth/login";
  }
}
```

**CRITICAL DESIGN DECISION:** SUPER_ADMIN accesses `/admin/*` routes (the super admin dashboard IS the admin dashboard, extended). When Yura wants to manage her own coaching schedule, she navigates to `/coach/*` routes. This is handled by adding a "Switch to Coach View" button in the admin header that navigates to `/coach/dashboard`. The middleware allows SUPER_ADMIN to access both `/admin/*` and `/coach/*`.

---

## Data Flow for Multi-Coach Booking

### Student Books a Lesson (New Flow)

```
Student → /student/book
  |
  |-- 1. Browse Coaches
  |     student.coaches.browseCoaches()
  |     Returns: Coach[] with profile info, skills, rates
  |
  |-- 2. Select Coach → View Coach Availability
  |     student.coaches.getCoachAvailability({ coachId })
  |     Returns: RinkTimeSlot[] where coachId = selected AND isActive AND future
  |
  |-- 3. Select Time Slot → Booking Dialog
  |     Shows: coach name, lesson type options, coach's rates, slot time
  |     Price calculated using coach's custom pricing (Coach model) first,
  |     then student custom pricing (Student model) if enabled,
  |     then DefaultPricing fallback
  |
  |-- 4. Confirm Booking
  |     student.booking.bookLesson({
  |       studentId, timeSlotId, type, paymentMethod,
  |       // coachId derived from timeSlot.coachId (not client-provided)
  |     })
  |
  |-- 5. Backend Processing (inside bookLesson mutation)
  |     a. Validate slot belongs to a coach
  |     b. Get coach's pricing → calculate price
  |     c. Create Lesson with coachId from slot
  |     d. Create Payment record
  |     e. Create Google Calendar event on COACH's calendar (using coach's OAuth tokens)
  |     f. Notify student (in-app + email)
  |     g. Notify coach (in-app + email)
  |     h. Notify super admin (in-app)
```

### Pricing Waterfall (Multi-Coach)

```
1. Student has custom pricing enabled?
   YES → Use student's per-type prices
   NO  → Continue to step 2

2. Coach has per-type pricing set?
   YES → Use coach's per-type prices
   NO  → Continue to step 3

3. DefaultPricing table has values?
   YES → Use global defaults
   NO  → Use hardcoded DEFAULT_HOURLY_PRICES

Final: Apply duration proration via calculateProratedPrice()
```

The existing `calculateLessonPrice()` function signature needs extension:

```typescript
export function calculateLessonPrice(
  lessonType: LessonType,
  durationMinutes: number,
  student: { customPricingEnabled: boolean; privateLessonPrice?: number | null; /* ... */ },
  coach: { privateLessonPrice?: number | null; /* ... */ } | null,  // NEW parameter
  defaultPricing?: { /* ... */ } | null,
): number {
  // 1. Check student custom pricing (highest priority)
  // 2. Check coach pricing (NEW)
  // 3. Check global defaults
  // 4. Hardcoded fallback
}
```

### Google Calendar (Per-Coach)

Current architecture uses a service account with domain-wide delegation. Multi-coach requires per-coach OAuth tokens.

```typescript
// src/lib/google/calendar.ts - Extended

// OLD: Single service account (keep as fallback for super admin)
const getAuthClient = () => { /* existing service account logic */ };

// NEW: Per-coach OAuth client
const getCoachAuthClient = (coach: {
  googleAccessToken: string;
  googleRefreshToken: string;
  googleTokenExpiresAt: Date;
  googleCalendarId: string;
}) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  oauth2Client.setCredentials({
    access_token: coach.googleAccessToken,
    refresh_token: coach.googleRefreshToken,
    expiry_date: coach.googleTokenExpiresAt.getTime(),
  });

  // Handle token refresh
  oauth2Client.on("tokens", async (tokens) => {
    // Update coach's tokens in database
    await prisma.coach.update({
      where: { id: coach.id },
      data: {
        googleAccessToken: tokens.access_token,
        googleTokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : undefined,
        ...(tokens.refresh_token && { googleRefreshToken: tokens.refresh_token }),
      },
    });
  });

  return oauth2Client;
};

// NEW: Calendar operations with coach context
export const coachCalendar = {
  createEvent: async (coach: CoachWithTokens, eventData: CalendarEventData) => {
    if (!coach.googleAccessToken || !coach.googleCalendarId) {
      console.warn(`Coach ${coach.id} has no calendar connected`);
      return null;
    }

    const auth = getCoachAuthClient(coach);
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.insert({
      calendarId: coach.googleCalendarId,
      requestBody: { /* ... */ },
      sendUpdates: "all",
    });

    return response.data.id || null;
  },
  // deleteEvent, updateEvent follow same pattern
};
```

**OAuth Flow for Coach Calendar Connection:**

```
Coach → /coach/settings → "Connect Google Calendar" button
  |
  |-- 1. Frontend: Opens popup/redirect to /api/auth/google-calendar
  |-- 2. Backend: Generates OAuth URL with calendar scope
  |       const url = oauth2Client.generateAuthUrl({
  |         access_type: "offline",
  |         scope: ["https://www.googleapis.com/auth/calendar"],
  |         state: coachId,  // Track which coach is connecting
  |         prompt: "consent",  // Force consent to get refresh token
  |       });
  |-- 3. Google: User consents
  |-- 4. Callback: /api/auth/google-calendar/callback
  |       const { tokens } = await oauth2Client.getToken(code);
  |       // Store tokens encrypted on Coach record
  |       // Detect primary calendar ID
  |-- 5. Coach record updated with tokens + calendarId
```

**New env vars needed:**
```
GOOGLE_CLIENT_ID=          # OAuth client (different from service account)
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3100/api/auth/google-calendar/callback
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Modifying Existing Admin Router In-Place
**What:** Changing `admin.*` procedures to require coachId parameters.
**Why bad:** Breaks all existing admin functionality immediately. Requires every admin component to be updated simultaneously.
**Instead:** Create new `superAdmin.*` and `coach.*` routers. Keep `admin.*` working during migration. When ready, make `admin` an alias for `superAdmin`.

### Anti-Pattern 2: Client-Side Coach Scoping
**What:** Passing coachId from client for coach's own data queries.
**Why bad:** Allows coach to query other coaches' data by changing the ID.
**Instead:** Always derive coachId from session in middleware. Inject into ctx.

### Anti-Pattern 3: Non-Nullable coachId from Day One
**What:** Making coachId required on Lesson/RinkTimeSlot immediately.
**Why bad:** Requires all existing data to be migrated in the same deployment. No rollback path. Breaks if migration script has issues.
**Instead:** Add nullable coachId, backfill, validate, then optionally make non-null in a later migration.

### Anti-Pattern 4: Single Role for Yura
**What:** Making Yura either SUPER_ADMIN or COACH but not both.
**Why bad:** Yura needs to manage the platform (super admin concerns) AND manage her own coaching schedule (coach concerns). A single role means she either loses admin features or doesn't get the coach experience.
**Instead:** Yura's User.role = SUPER_ADMIN. She also has a Coach record. The `isCoach` middleware accepts SUPER_ADMIN role and resolves their Coach record. The middleware allows SUPER_ADMIN to access both /admin and /coach routes.

### Anti-Pattern 5: Rewriting the Booking Flow
**What:** Completely rewriting the student booking page for multi-coach.
**Why bad:** High risk of regressions in a critical path.
**Instead:** Add a coach selection step BEFORE the existing slot selection. The slot selection and booking confirmation flows stay largely the same, just with coachId context flowing through.

---

## Scalability Considerations

| Concern | Current (1 coach) | At 5 coaches | At 20+ coaches |
|---------|-------------------|--------------|----------------|
| Time slot queries | Single query, all slots | Filter by coachId, indexed | Pagination + coach filter |
| Calendar events | 1 service account | 5 OAuth connections | Token refresh management, rate limiting |
| Revenue reporting | Single aggregate | GROUP BY coachId | Materialized views or caching |
| Slot overlap detection | Per-rink only | Per-rink per-coach | Composite index (rinkId, coachId, startTime) |
| Student assignment | Implicit (1 coach) | CoachStudent junction | CoachStudent with primary flag |

---

## Suggested Build Order (Dependencies)

The build order is driven by two principles: (1) database changes must come first since everything depends on them, and (2) the coach experience must be buildable independently of the student booking flow changes.

```
Phase 1: Foundation (Database + Auth)
  |-- 1a. Schema migration (Coach model, coachId columns, enums)
  |-- 1b. Data migration script (backfill Yura)
  |-- 1c. Auth updates (SUPER_ADMIN/COACH roles, middleware, JWT)
  |-- 1d. TRPC middleware (coachProcedure, superAdminProcedure)
  |
  v  Dependencies: Nothing depends on Phase 1 completion except everything else

Phase 2: Coach Dashboard (Core)
  |-- 2a. Coach router (profile, schedule queries)
  |-- 2b. Coach layout + pages (dashboard, schedule, students, profile)
  |-- 2c. Coach schedule management (reuse ScheduleManager, scoped to coach)
  |-- 2d. Coach earnings view (read-only initially)
  |
  v  Dependencies: Phase 1 complete. Independent of student changes.

Phase 3: Super Admin Coach Management
  |-- 3a. SuperAdmin coach router (list, approve, deactivate, revenue split)
  |-- 3b. Coach management pages (list, detail, approval queue)
  |-- 3c. Extended admin dashboard (coach overview cards)
  |-- 3d. Cross-coach schedule visibility
  |
  v  Dependencies: Phase 1 complete. Can parallel with Phase 2.

Phase 4: Student Multi-Coach Booking
  |-- 4a. Coach browsing API + UI (browse coaches page)
  |-- 4b. Coach-specific availability (modified booking flow)
  |-- 4c. Updated booking mutation (coachId from slot)
  |-- 4d. Coach name display on student schedule/dashboard
  |
  v  Dependencies: Phase 1 + Phase 2 (coaches must exist and have slots)

Phase 5: Google Calendar Per-Coach
  |-- 5a. OAuth flow (connect/disconnect in coach settings)
  |-- 5b. Token storage + refresh logic
  |-- 5c. Per-coach event creation/update/delete
  |-- 5d. Fallback to service account if no OAuth
  |
  v  Dependencies: Phase 2 (coach profile exists). Can start after 2a.

Phase 6: Revenue + Payouts
  |-- 6a. Pricing waterfall (student -> coach -> default)
  |-- 6b. Revenue split calculation
  |-- 6c. Payout management (super admin)
  |-- 6d. Per-coach revenue reports
  |
  v  Dependencies: Phase 3 + Phase 4 (need lessons with coachId + split config)

Phase 7: Polish + Migration Cleanup
  |-- 7a. Make coachId non-nullable (if desired)
  |-- 7b. Remove ADMIN role (alias to SUPER_ADMIN)
  |-- 7c. Coach self-registration flow
  |-- 7d. Coach invitation flow
```

### Dependency Graph (Visual)

```
Phase 1 (Foundation)
   |
   +-- Phase 2 (Coach Dashboard) ----+
   |                                  |
   +-- Phase 3 (Super Admin) --------+-- Phase 4 (Student Booking)
   |                                  |
   +-- Phase 5 (Google Calendar) -----+-- Phase 6 (Revenue)
                                      |
                                      +-- Phase 7 (Polish)
```

Phases 2, 3, and 5 can be developed in parallel after Phase 1. Phase 4 requires Phases 2 and 3. Phase 6 requires Phase 4. Phase 7 is cleanup.

---

## Key Files That Need Modification

| File | Change Type | Risk |
|------|-------------|------|
| `prisma/schema.prisma` | Add Coach, CoachStudent, CoachPayout models; add coachId to Lesson, RinkTimeSlot, BlockedDateRange | HIGH - database migration |
| `src/lib/trpc.ts` | Add coachProcedure, superAdminProcedure middleware | MEDIUM - auth changes |
| `src/lib/auth.ts` | Add COACH, SUPER_ADMIN to JWT/session callbacks | MEDIUM - auth changes |
| `middleware.ts` | Extend role routing for COACH, SUPER_ADMIN | MEDIUM - routing |
| `src/lib/root.ts` | Add coach, superAdmin router namespaces | LOW - additive |
| `src/lib/pricing.ts` | Add coach pricing tier to waterfall | LOW - additive |
| `src/lib/google/calendar.ts` | Add OAuth client, per-coach operations | MEDIUM - new OAuth flow |
| `src/components/layout/AppLayout.tsx` | Add "coach" role option, coach navigation | LOW - additive |
| `src/components/layout/AppSidebar.tsx` | Coach sidebar items | LOW - additive |
| `src/features/admin/api/queries/schedule/lessonQueries.ts` | Include coachId in lesson creation | MEDIUM - existing flow |
| `src/features/student/api/queries/bookingQueries.ts` | Derive coachId from slot | MEDIUM - existing flow |

### Files That Should NOT Change (Initially)

| File | Reason |
|------|--------|
| `TimeSlotDialogAdapter.tsx` | IMMUTABLE per CLAUDE.md data flow architecture |
| `AppSidebar.tsx` (desktop structure) | IMMUTABLE per CLAUDE.md sidebar architecture |
| `AppLayout.tsx` (desktop structure) | IMMUTABLE per CLAUDE.md layout architecture |
| `DefaultPricing` model | Stays global, coach pricing lives on Coach model |
| `Settings` model | Stays global, super admin only |

---

## Sources

- Codebase analysis: direct reading of all files listed above (HIGH confidence)
- [Auth.js Role-Based Access Control guide](https://authjs.dev/guides/role-based-access-control) (MEDIUM confidence)
- [NextAuth.js multiple roles discussion](https://github.com/nextauthjs/next-auth/discussions/805) (MEDIUM confidence)
- [Multi-Tenant SaaS Architecture 2025](https://www.ideadope.com/roadmaps/how-to-build-multi-tenant-saas-2025) (MEDIUM confidence - pattern validation)
- [Prisma Row-Level Security patterns](https://medium.com/@francolabuschagne90/securing-multi-tenant-applications-using-row-level-security-in-postgresql-with-prisma-orm-4237f4d4bd35) (LOW confidence - RLS not recommended for this use case)
- [Google OAuth2 documentation](https://developers.google.com/identity/protocols/oauth2) (HIGH confidence - official docs)
- [Google Calendar API scopes](https://developers.google.com/workspace/calendar/api/auth) (HIGH confidence - official docs)
