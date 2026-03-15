# Phase 1: Auth, Schema, and Data Migration - Research

**Researched:** 2026-03-14
**Domain:** Database schema migration, role-based auth, Prisma + NextAuth.js + TRPC middleware
**Confidence:** HIGH

## Summary

Phase 1 introduces the Coach entity, adds SUPER_ADMIN to the Role enum, backfills all existing data to associate with Yura as the first coach, and updates auth middleware across three layers (Next.js middleware, TRPC procedures, frontend role checks) to support the new role hierarchy -- all without breaking existing functionality.

The existing codebase is well-structured for this extension. The Role enum already includes COACH (added in the init migration but never used). Only SUPER_ADMIN needs to be added. The TRPC layer has a clean middleware pattern (`isAuthed`, `isAdmin`) that can be extended additively. The main risk is the JWT session caching problem: existing logged-in users have `role: "ADMIN"` cached in their JWT token. If we update the database role to SUPER_ADMIN before updating middleware to accept both, Yura gets locked out. The middleware must accept both ADMIN and SUPER_ADMIN before the schema migration runs.

**Primary recommendation:** Deploy middleware and auth changes that accept both ADMIN and SUPER_ADMIN first, then run the schema migration that adds Coach table + coachId columns + backfill data, then update Yura's role to SUPER_ADMIN. Use `--create-only` for the Prisma migration to customize the SQL and include data backfill in the same migration file.

## Standard Stack

No new libraries are needed. This phase works entirely within the existing stack.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^6.19.0 | ORM + migrations | Already the project's ORM; handles schema changes and migrations |
| NextAuth.js | ^4.24.13 | Authentication | JWT strategy with role in token; callbacks handle role injection |
| @trpc/server | ^11.8.1 | API middleware | Existing middleware pattern for role-based procedure guards |
| Zod | (bundled) | Input validation | Used for all TRPC input schemas |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | (devDep) | TypeScript script runner | Run data migration scripts via `npx tsx scripts/...` |
| @prisma/client | ^6.19.0 | Generated DB client | All database operations |

### No New Dependencies Required
This phase is purely schema + auth changes. No additional npm packages needed.

## Architecture Patterns

### Database Migration Strategy: Expand and Contract

The migration must follow the expand-and-contract pattern to avoid downtime and preserve backward compatibility.

**Phase 1a - Expand (Additive Only):**
1. Add `SUPER_ADMIN` to the Role enum
2. Create Coach table
3. Create CoachStudent junction table
4. Add nullable `coachId` columns to Lesson, RinkTimeSlot, BlockedDateRange
5. Add indexes for coachId queries

**Phase 1b - Data Migration (Backfill):**
1. Create Coach record for Yura linked to her User
2. Update Yura's role from ADMIN to SUPER_ADMIN
3. Backfill all Lessons with Yura's coachId
4. Backfill all RinkTimeSlots with Yura's coachId
5. Backfill all BlockedDateRanges with Yura's coachId
6. Create CoachStudent records linking Yura to all existing students

**No Contract Phase in Phase 1:** coachId columns remain nullable. Making them required is deferred until all code paths populate them (Phase 4+).

### Recommended Schema Changes

```prisma
// Add to Role enum (COACH already exists)
enum Role {
  SUPER_ADMIN
  ADMIN       // Keep for backward compat during JWT cache window
  COACH
  STUDENT
}

// New Coach model (parallel to Student)
model Coach {
  id                    String    @id @default(cuid())
  userId                String    @unique
  bio                   String?
  photoUrl              String?
  skills                String[]
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

  // Revenue split (Phase 7 uses this)
  revenueSplitPercent   Float     @default(70)

  // Google Calendar OAuth (Phase 6 uses this)
  googleCalendarId      String?
  googleAccessToken     String?
  googleRefreshToken    String?
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

// New CoachStudent junction table
model CoachStudent {
  id        String   @id @default(cuid())
  coachId   String
  studentId String
  isPrimary Boolean  @default(false)
  createdAt DateTime @default(now())

  Coach     Coach    @relation(fields: [coachId], references: [id], onDelete: Cascade)
  Student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([coachId, studentId])
  @@index([coachId])
  @@index([studentId])
}
```

**Modified existing tables (add nullable coachId):**
- Lesson: add `coachId String?` + `Coach Coach? @relation(...)` + `@@index([coachId])`
- RinkTimeSlot: add `coachId String?` + `Coach Coach? @relation(...)` + `@@index([coachId])`
- BlockedDateRange: add `coachId String?` + `Coach Coach? @relation(...)` + `@@index([coachId])`
- User: add `Coach Coach?` relation
- Student: add `CoachStudent CoachStudent[]` relation

### TRPC Middleware Extension Pattern

The existing TRPC middleware in `src/lib/trpc.ts` has two procedures:
- `protectedProcedure` (any authenticated user)
- `adminProcedure` (role === "ADMIN")

**Add three new middleware/procedures:**

```typescript
// Accept both ADMIN and SUPER_ADMIN (backward compat)
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

// SUPER_ADMIN only (for future super-admin-exclusive features)
const isSuperAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.session.user.role !== "SUPER_ADMIN" && ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Super admin access required" });
  }
  return next({ ctx: { ...ctx, session: { ...ctx.session, user: ctx.session.user } } });
});

// Coach middleware (COACH or SUPER_ADMIN with Coach record)
const isCoach = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const role = ctx.session.user.role;
  if (role !== "COACH" && role !== "SUPER_ADMIN" && role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
  }
  const coach = await ctx.prisma.coach.findUnique({
    where: { userId: ctx.session.user.id },
  });
  if (!coach) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Coach profile not found" });
  }
  return next({
    ctx: { ...ctx, coach, session: { ...ctx.session, user: ctx.session.user } },
  });
});

export const superAdminProcedure = t.procedure.use(isSuperAdmin);
export const coachProcedure = t.procedure.use(isCoach);
```

**Critical:** Update the existing `isAdmin` middleware to accept SUPER_ADMIN too:

```typescript
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  // Accept both ADMIN (cached JWT) and SUPER_ADMIN (new role)
  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({
    ctx: { ...ctx, session: { ...ctx.session, user: ctx.session.user } },
  });
});
```

### Next.js Middleware Update Pattern

File: `/middleware.ts` (root level)

**Current problems to fix:**
1. Line 75: Only accepts `["ADMIN", "STUDENT"]` -- must add `SUPER_ADMIN` and `COACH`
2. Line 65: Redirect for authenticated users on public pages only handles ADMIN -> /admin/dashboard
3. Line 82-93: Role-based route protection is strict ADMIN/STUDENT -- must support SUPER_ADMIN and COACH

**Updated pattern:**

```typescript
// Line 75: Valid roles
if (!["ADMIN", "SUPER_ADMIN", "COACH", "STUDENT"].includes(role)) {
  return NextResponse.redirect(loginUrl);
}

// Line 65: Dashboard redirect for authenticated users on public pages
function dashboardForRole(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return "/admin/dashboard";
    case "COACH":
      return "/coach/dashboard";
    case "STUDENT":
      return "/student/dashboard";
    default:
      return "/auth/login";
  }
}

// Line 82-93: Route protection
// SUPER_ADMIN can access /admin/* and /coach/*
if (path.startsWith("/admin") && role !== "ADMIN" && role !== "SUPER_ADMIN") {
  return NextResponse.redirect(new URL(dashboardForRole(role), request.url));
}
if (path.startsWith("/coach") && role !== "COACH" && role !== "SUPER_ADMIN" && role !== "ADMIN") {
  return NextResponse.redirect(new URL(dashboardForRole(role), request.url));
}
if (path.startsWith("/student") && role !== "STUDENT") {
  return NextResponse.redirect(new URL(dashboardForRole(role), request.url));
}
```

### Login Page Redirect Update

File: `src/app/auth/login/page.tsx` line 54

**Current:** Only handles `ADMIN` and `STUDENT` roles for post-login redirect.
**Must add:** `SUPER_ADMIN` -> `/admin/dashboard` and `COACH` -> `/coach/dashboard`.

### Frontend Role Check Updates

Multiple files check `role === "ADMIN"`. These all need to also accept `"SUPER_ADMIN"`:

| File | Line | Current Check | Updated Check |
|------|------|--------------|---------------|
| `src/hooks/useCurrentUser.ts` | 42 | `role === "ADMIN"` | `role === "ADMIN" \|\| role === "SUPER_ADMIN"` |
| `src/contexts/AuthContext.tsx` | 12 | type union `"ADMIN" \| "COACH" \| "STUDENT"` | add `"SUPER_ADMIN"` |
| `src/contexts/OptimizedAuthContext.tsx` | 14 | type union `"ADMIN" \| "COACH" \| "STUDENT"` | add `"SUPER_ADMIN"` |
| `src/types/index.ts` | 6 | type union `"ADMIN" \| "COACH" \| "STUDENT"` | add `"SUPER_ADMIN"` |
| `src/lib/enhanced-types.ts` | 36-39 | UserRole enum without SUPER_ADMIN | add `SUPER_ADMIN = "SUPER_ADMIN"` |
| `src/lib/context-utils.tsx` | 122 | type union | add `"SUPER_ADMIN"` |
| `src/app/api/auth/me/route.ts` | 25 | `role === "STUDENT"` | also load Coach profile for SUPER_ADMIN/ADMIN |
| `src/app/(protected)/student/schedule/[lessonId]/page.tsx` | 61 | `role !== "ADMIN"` | `role !== "ADMIN" && role !== "SUPER_ADMIN"` |

### Data Migration Script Pattern

Follow the established pattern in `scripts/migrate-lesson-types.ts`:

```typescript
// scripts/migrate-coach-data.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateCoachData() {
  console.log("Starting coach data migration...\n");

  // 1. Find Yura's user (the current ADMIN or SUPER_ADMIN)
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
  });
  if (!adminUser) {
    throw new Error("No admin user found");
  }

  // 2. Check if Coach record already exists (idempotent)
  const existingCoach = await prisma.coach.findUnique({
    where: { userId: adminUser.id },
  });
  if (existingCoach) {
    console.log("Coach record already exists, skipping creation");
  } else {
    // 3. Create Coach record for Yura
    await prisma.coach.create({
      data: {
        userId: adminUser.id,
        bio: "Head Coach & Founder",
        isApproved: true,
        isActive: true,
        approvedAt: new Date(),
        revenueSplitPercent: 100,
      },
    });
  }

  // 4. Get the Coach record
  const coach = await prisma.coach.findUniqueOrThrow({
    where: { userId: adminUser.id },
  });

  // 5. Update Yura's role to SUPER_ADMIN
  if (adminUser.role === "ADMIN") {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { role: "SUPER_ADMIN" },
    });
  }

  // 6. Backfill coachId on all Lessons
  const lessonResult = await prisma.lesson.updateMany({
    where: { coachId: null },
    data: { coachId: coach.id },
  });

  // 7. Backfill coachId on all RinkTimeSlots
  const slotResult = await prisma.rinkTimeSlot.updateMany({
    where: { coachId: null },
    data: { coachId: coach.id },
  });

  // 8. Backfill coachId on all BlockedDateRanges
  const blockedResult = await prisma.blockedDateRange.updateMany({
    where: { coachId: null },
    data: { coachId: coach.id },
  });

  // 9. Create CoachStudent records for all students
  const students = await prisma.student.findMany({ select: { id: true } });
  for (const student of students) {
    await prisma.coachStudent.upsert({
      where: {
        coachId_studentId: { coachId: coach.id, studentId: student.id },
      },
      create: {
        coachId: coach.id,
        studentId: student.id,
        isPrimary: true,
      },
      update: {},
    });
  }

  console.log(`Migration complete:
    - Lessons updated: ${lessonResult.count}
    - Time slots updated: ${slotResult.count}
    - Blocked dates updated: ${blockedResult.count}
    - CoachStudent records: ${students.length}
    - Yura's role: SUPER_ADMIN`);
}

migrateCoachData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Anti-Patterns to Avoid
- **Updating Yura's role before middleware accepts SUPER_ADMIN:** This locks her out. Middleware must accept both ADMIN and SUPER_ADMIN first.
- **Making coachId non-nullable in Phase 1:** This requires all code paths to set coachId immediately, which is Phase 4 work.
- **Removing the ADMIN enum value:** Existing JWT tokens have `role: "ADMIN"`. The ADMIN value must remain in the enum for the duration of the JWT max age (7 days), and realistically should stay until all old sessions expire.
- **Modifying the TimeSlotDialogAdapter.tsx:** Per CLAUDE.md, this is immutable architecture. The adapter already handles unknown fields gracefully via casting -- no changes needed in Phase 1.
- **Changing the existing `adminProcedure` export name:** Other files import it. Just update the middleware logic inside `isAdmin` to accept SUPER_ADMIN.
- **Using separate Prisma migrations for schema and data:** Combine the schema migration with data backfill SQL in a single customized migration to ensure atomicity. Or use a separate TypeScript script (like the established pattern) for complex data transforms.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database migration | Custom SQL scripts outside Prisma | `prisma migrate dev --create-only` + customized migration SQL | Prisma tracks migration history; custom scripts lose that |
| Role hierarchy checking | Nested if/else chains scattered in code | Centralized TRPC middleware (isAdmin, isCoach, isSuperAdmin) | Single point of truth for role authorization |
| JWT session refresh | Manual token invalidation | NextAuth JWT callback with DB role lookup | NextAuth handles token lifecycle; add `trigger === "update"` handling |
| Data backfill | Raw SQL via psql | Prisma Client in TypeScript migration script | Type safety, error handling, idempotency via upsert |

**Key insight:** The TRPC middleware layer is the RIGHT place for role enforcement. The Next.js middleware.ts is a coarse navigation guard only. Never rely on frontend role checks for security.

## Common Pitfalls

### Pitfall 1: JWT Token Caching Causes Lockout
**What goes wrong:** Yura's JWT has `role: "ADMIN"`. After DB migration changes her role to `SUPER_ADMIN`, her JWT still says ADMIN. If middleware only accepts SUPER_ADMIN, she's locked out until the token expires (7 days) or she re-logs.
**Why it happens:** NextAuth v4 JWT strategy caches role at login time. The role is not re-fetched from DB on each request.
**How to avoid:** Update all middleware to accept BOTH "ADMIN" and "SUPER_ADMIN" BEFORE running the migration. The `isAdmin` TRPC middleware should check `role !== "ADMIN" && role !== "SUPER_ADMIN"`. The Next.js middleware.ts must include both in its valid roles list.
**Warning signs:** Yura can't access admin pages after migration. TRPC returns FORBIDDEN errors.

### Pitfall 2: PostgreSQL Enum ADD VALUE in Transaction
**What goes wrong:** Prisma migration fails with "ALTER TYPE ... ADD cannot run inside a transaction block" or "New enum values must be committed before they can be used."
**Why it happens:** PostgreSQL has transaction restrictions on ALTER TYPE ADD VALUE. Prisma wraps migrations in transactions.
**How to avoid:** Neon uses PostgreSQL 16+ which supports ALTER TYPE ADD VALUE inside transactions. However, the new enum value cannot be used in DEFAULT clauses or INSERT statements within the SAME transaction. Split the migration: first transaction adds the enum value, second part uses it for data updates. Use `prisma migrate dev --create-only` to generate the migration, then customize the SQL to ensure enum addition happens before any data that references the new value.
**Warning signs:** Migration fails during `prisma migrate deploy` with enum-related errors.

### Pitfall 3: Inconsistent Role Checks Across Layers
**What goes wrong:** The middleware.ts accepts SUPER_ADMIN for /admin routes, but a specific page checks `role === "ADMIN"` (not SUPER_ADMIN), blocking access.
**Why it happens:** Role checks are scattered across 18+ files (see grep results: 25 occurrences of ADMIN). Missing one creates a subtle authorization gap.
**How to avoid:** Create a helper function `isAdminRole(role: string): boolean` that returns true for both ADMIN and SUPER_ADMIN. Use this everywhere instead of direct string comparison. Audit all 18 files identified in the grep results.
**Warning signs:** Some admin features work but others show "unauthorized" or redirect to login.

### Pitfall 4: Forgetting to Update the Frontend Type Definitions
**What goes wrong:** TypeScript compilation errors or runtime issues because the User role type doesn't include SUPER_ADMIN.
**Why it happens:** The role type is defined in multiple places: `src/types/next-auth.d.ts` (as `string`), `src/types/index.ts`, `src/contexts/AuthContext.tsx`, `src/contexts/OptimizedAuthContext.tsx`, `src/lib/enhanced-types.ts`, `src/lib/context-utils.tsx`.
**How to avoid:** Update ALL type definitions to include SUPER_ADMIN. The next-auth.d.ts already uses `string` type for role (good -- no change needed there). The other files use union types that must be updated.
**Warning signs:** TypeScript errors on build, or `role` values not matching expected unions.

### Pitfall 5: Data Migration Not Idempotent
**What goes wrong:** Running the migration script twice creates duplicate CoachStudent records or fails on unique constraints.
**Why it happens:** INSERT statements without upsert logic fail on second run.
**How to avoid:** Use Prisma's `upsert` for CoachStudent records. Use `findFirst` + conditional create for the Coach record. Use `updateMany` with `WHERE coachId IS NULL` for backfill (naturally idempotent).
**Warning signs:** Script crashes with unique constraint violations on re-run.

### Pitfall 6: Missing Admin Procedure Usage
**What goes wrong:** Most admin routes use `protectedProcedure` (any auth), not `adminProcedure`. After Phase 1, any authenticated student could still access these routes via TRPC.
**Why it happens:** Only `paymentQueries.ts` uses `adminProcedure`. All other admin routes (schedule, students, analytics, settings, blocked dates, notes, approvals, pricing) use `protectedProcedure` with no role check.
**How to avoid:** This is noted but is Phase 3 scope (query scoping). In Phase 1, the existing behavior is preserved -- these routes worked because students had no UI to call them. But awareness is important: 12+ admin route files have no role guard.
**Warning signs:** Not a Phase 1 concern, but should be documented for Phase 3 planning.

## Code Examples

### Prisma Migration SQL (Customized)

Source: Codebase analysis + Prisma documentation

The auto-generated migration from `prisma migrate dev --create-only` needs to be customized. The resulting SQL should look approximately like:

```sql
-- Add SUPER_ADMIN to Role enum (COACH already exists)
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- CreateTable: Coach
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,
    "skills" TEXT[],
    "certifications" TEXT,
    "yearsExperience" INTEGER,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "privateLessonPrice" DOUBLE PRECISION,
    "groupLessonPrice" DOUBLE PRECISION,
    "choreographyPrice" DOUBLE PRECISION,
    "competitionPrepPrice" DOUBLE PRECISION,
    "revenueSplitPercent" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "googleCalendarId" TEXT,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CoachStudent
CREATE TABLE "CoachStudent" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoachStudent_pkey" PRIMARY KEY ("id")
);

-- Add nullable coachId to existing tables
ALTER TABLE "Lesson" ADD COLUMN "coachId" TEXT;
ALTER TABLE "RinkTimeSlot" ADD COLUMN "coachId" TEXT;
ALTER TABLE "BlockedDateRange" ADD COLUMN "coachId" TEXT;

-- Unique and indexes
CREATE UNIQUE INDEX "Coach_userId_key" ON "Coach"("userId");
CREATE UNIQUE INDEX "CoachStudent_coachId_studentId_key" ON "CoachStudent"("coachId", "studentId");
CREATE INDEX "Coach_userId_idx" ON "Coach"("userId");
CREATE INDEX "Coach_isApproved_isActive_idx" ON "Coach"("isApproved", "isActive");
CREATE INDEX "CoachStudent_coachId_idx" ON "CoachStudent"("coachId");
CREATE INDEX "CoachStudent_studentId_idx" ON "CoachStudent"("studentId");
CREATE INDEX "Lesson_coachId_idx" ON "Lesson"("coachId");
CREATE INDEX "RinkTimeSlot_coachId_idx" ON "RinkTimeSlot"("coachId");
CREATE INDEX "BlockedDateRange_coachId_idx" ON "BlockedDateRange"("coachId");

-- Foreign keys
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachStudent" ADD CONSTRAINT "CoachStudent_coachId_fkey"
    FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachStudent" ADD CONSTRAINT "CoachStudent_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_coachId_fkey"
    FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RinkTimeSlot" ADD CONSTRAINT "RinkTimeSlot_coachId_fkey"
    FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BlockedDateRange" ADD CONSTRAINT "BlockedDateRange_coachId_fkey"
    FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### NextAuth JWT Callback Update

Source: `src/lib/auth.ts` lines 122-137

```typescript
// src/lib/auth.ts - Updated callbacks
callbacks: {
  async jwt({ token, user, trigger }) {
    if (user) {
      token.id = user.id;
      token.role = user.role;
    }
    // On session update trigger, refresh role from DB
    // This allows role changes to propagate without re-login
    if (trigger === "update") {
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { role: true },
      });
      if (dbUser) {
        token.role = dbUser.role;
      }
    }
    return token;
  },
  async session({ session, token }) {
    if (token && session.user) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
    }
    return session;
  },
},
```

### Role Helper Utility

Source: Derived from codebase analysis of 18+ files with role checks

```typescript
// src/lib/roles.ts - NEW FILE
export type AppRole = "SUPER_ADMIN" | "ADMIN" | "COACH" | "STUDENT";

/** Returns true if the role has admin-level access (ADMIN or SUPER_ADMIN) */
export function isAdminRole(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Returns true if the role has coach-level access (COACH, ADMIN, or SUPER_ADMIN) */
export function isCoachRole(role: string): boolean {
  return role === "COACH" || role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Returns the appropriate dashboard URL for a given role */
export function dashboardForRole(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return "/admin/dashboard";
    case "COACH":
      return "/coach/dashboard";
    case "STUDENT":
      return "/student/dashboard";
    default:
      return "/auth/login";
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Role enum: ADMIN, COACH, STUDENT | Add SUPER_ADMIN to enum | Phase 1 | COACH already exists but unused; only SUPER_ADMIN is new |
| Single `isAdmin` middleware | isAdmin (accepts both), isSuperAdmin, isCoach | Phase 1 | Additive -- existing exports keep working |
| No Coach table | Coach model with 1:1 User relation | Phase 1 | Parallel to existing Student model pattern |
| Unscoped admin queries | Still unscoped (Phase 3) | Deferred | No change in Phase 1 -- 179 queries remain unscoped |

**Critical observation:** The COACH value already exists in the PostgreSQL "Role" enum (added in the init migration `20250822042326`). However, it has never been used in application code. The schema.prisma file confirms `enum Role { ADMIN COACH STUDENT }`. So the migration only needs to ADD `SUPER_ADMIN`, not `COACH`.

## Open Questions

1. **Prisma enum transaction behavior on Neon**
   - What we know: PostgreSQL 12+ allows ALTER TYPE ADD VALUE inside transactions. Neon runs PG 16+. The new value cannot be used in DEFAULT or INSERT in the same transaction.
   - What's unclear: Whether the Prisma-generated migration wraps the ALTER TYPE and subsequent INSERT/UPDATE in a single transaction (which would fail if we try to INSERT with the new enum value).
   - Recommendation: Use `prisma migrate dev --create-only`, inspect the generated SQL, and split if needed. The data backfill script runs separately via `npx tsx` after the schema migration, which avoids the same-transaction problem entirely.

2. **JWT session expiry window**
   - What we know: JWT maxAge is 7 days. After changing Yura's role to SUPER_ADMIN, her existing JWT still says ADMIN for up to 7 days.
   - What's unclear: Whether `updateAge: 24 * 60 * 60` (24h) triggers a JWT refresh that would pick up the new role, or only user-initiated `update()` calls do.
   - Recommendation: Keep ADMIN accepted everywhere for at least 7 days (which is fine since we keep ADMIN in the enum permanently during v1). Optionally add a `trigger === "update"` handler in the JWT callback so frontend can call `update()` to force a role refresh.

3. **Should the data backfill be in the Prisma migration SQL or a separate TypeScript script?**
   - What we know: The project has established precedent with `scripts/migrate-lesson-types.ts` for data migrations. Prisma recommends customizing migration SQL for simple data transforms.
   - What's unclear: Whether the backfill is simple enough for raw SQL or benefits from TypeScript's error handling and idempotency.
   - Recommendation: Use a separate TypeScript script (following established pattern). The schema migration adds tables/columns via Prisma. The data script uses Prisma Client for backfill. This is safer, more readable, and idempotent.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `prisma/schema.prisma` - current schema with Role enum already containing COACH
- Codebase analysis: `src/lib/trpc.ts` - current middleware with isAuthed and isAdmin
- Codebase analysis: `src/lib/auth.ts` - JWT strategy with role caching
- Codebase analysis: `middleware.ts` - Next.js middleware with hardcoded ADMIN/STUDENT roles
- Codebase analysis: `src/app/auth/login/page.tsx` - login redirect logic
- Codebase analysis: `src/hooks/useCurrentUser.ts` - frontend role checks
- Codebase analysis: `scripts/migrate-lesson-types.ts` - established data migration pattern
- Codebase analysis: `prisma/migrations/20250822042326_init/migration.sql` - confirms COACH already in Role enum
- [Prisma customizing migrations documentation](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations)
- [Prisma expand and contract pattern](https://www.prisma.io/docs/guides/data-migration)
- `.planning/research/ARCHITECTURE.md` - prior research with schema design and migration strategy

### Secondary (MEDIUM confidence)
- [NextAuth.js JWT session update handling](https://dev.to/nick/nextauth-jwt-how-to-update-the-session-after-login-2e68) - trigger === "update" for role refresh
- [NextAuth.js Role-Based Access Control guide](https://authjs.dev/guides/role-based-access-control) - role in JWT/session pattern
- Grep analysis: 25 occurrences of "ADMIN" across 18 files that need updating

### Tertiary (LOW confidence)
- PostgreSQL ALTER TYPE ADD VALUE transaction behavior on Neon - needs verification during implementation
- Whether `updateAge` in NextAuth JWT config triggers role refresh - needs testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing tools
- Architecture: HIGH - patterns derived directly from codebase analysis and prior research
- Schema design: HIGH - validated against prior ARCHITECTURE.md research and established Student model pattern
- Migration strategy: HIGH - follows established project patterns (scripts/migrate-lesson-types.ts)
- JWT caching pitfall: HIGH - verified by reading auth.ts JWT callback (role cached at login, not refreshed)
- Frontend role check locations: HIGH - verified by grep (18 files, 25 occurrences)
- Prisma enum transaction behavior: MEDIUM - PostgreSQL docs confirm, but Neon-specific behavior not directly tested

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable domain, no fast-moving dependencies)
