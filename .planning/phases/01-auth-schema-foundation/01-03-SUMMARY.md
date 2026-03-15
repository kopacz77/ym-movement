---
phase: 01-auth-schema-foundation
plan: 03
subsystem: database
tags: [prisma, postgresql, coach, schema-migration, data-migration, multi-coach]

# Dependency graph
requires:
  - phase: 01-auth-schema-foundation (01-01)
    provides: "Role hierarchy helpers, coachProcedure with @ts-expect-error for prisma.coach"
  - phase: 01-auth-schema-foundation (01-02)
    provides: "Frontend auth layer accepting SUPER_ADMIN and COACH roles"
provides:
  - "Coach model in Prisma schema with pricing, Google Calendar, and approval fields"
  - "CoachStudent junction table for many-to-many coach-student relationships"
  - "SUPER_ADMIN value in PostgreSQL Role enum"
  - "Nullable coachId on Lesson, RinkTimeSlot, BlockedDateRange tables"
  - "Idempotent data migration script for backfilling Yura as first coach"
  - "migrate:coach-data npm script"
affects: [02-coach-dashboard, 03-query-scoping, 06-google-calendar-per-coach]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive-only schema migration (nullable coachId) for backward compatibility"
    - "Idempotent data migration script using updateMany(where: coachId=null) and upsert"

key-files:
  created:
    - "prisma/migrations/20260315023706_add_coach_and_super_admin/migration.sql"
    - "scripts/migrate-coach-data.ts"
  modified:
    - "prisma/schema.prisma"
    - "package.json"
    - "src/lib/trpc.ts"

key-decisions:
  - "Coach model placed after BlockedDateRange following alphabetical ordering convention"
  - "revenueSplitPercent defaults to 70% for new coaches; Yura's migration sets 100% (owner)"
  - "Data migration script NOT auto-run -- requires manual execution after verification"
  - "Removed @ts-expect-error from coachProcedure now that Coach model exists"

patterns-established:
  - "Data migration scripts in scripts/ directory with idempotent patterns"
  - "Coach-scoped entities use nullable coachId with SetNull onDelete strategy"

# Metrics
duration: 6min
completed: 2026-03-15
---

# Phase 1 Plan 3: Schema Migration Summary

**Coach and CoachStudent Prisma models with SUPER_ADMIN role, nullable coachId on Lesson/RinkTimeSlot/BlockedDateRange, and idempotent data backfill script**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-15T02:35:55Z
- **Completed:** 2026-03-15T02:41:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Coach model with 20+ fields (pricing, Google Calendar OAuth, approval workflow, revenue split)
- CoachStudent junction table with unique constraint and isPrimary flag
- SUPER_ADMIN added to Role enum; nullable coachId columns on Lesson, RinkTimeSlot, BlockedDateRange
- Idempotent data migration script ready to backfill Yura as first coach with 100% revenue split
- Resolved @ts-expect-error from Plan 01 coachProcedure (Coach model now exists in Prisma client)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Prisma schema and generate migration** - `222c7da` (feat)
2. **Task 2: Create data migration script and add npm script** - `9e8ab62` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added Coach model, CoachStudent model, SUPER_ADMIN role, coachId columns
- `prisma/migrations/20260315023706_add_coach_and_super_admin/migration.sql` - Generated migration SQL
- `scripts/migrate-coach-data.ts` - Idempotent data backfill script for Yura as first coach
- `package.json` - Added migrate:coach-data npm script
- `src/lib/trpc.ts` - Removed @ts-expect-error on coachProcedure (Coach model now exists)

## Decisions Made
- Coach model placed after BlockedDateRange in schema following alphabetical convention
- Data migration script is NOT auto-run; requires manual `pnpm migrate:coach-data` after user verification
- Yura's Coach record sets revenueSplitPercent to 100% (owner keeps all), while default for new coaches is 70%
- Removed the @ts-expect-error on coachProcedure that was added in Plan 01 as a temporary placeholder

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed @ts-expect-error from coachProcedure in trpc.ts**
- **Found during:** Task 1 (after Prisma client regeneration)
- **Issue:** Plan 01 added `@ts-expect-error` on `ctx.prisma.coach.findUnique()` because Coach model did not exist yet. After this migration, the model exists and the @ts-expect-error itself becomes a TypeScript error ("Unused @ts-expect-error directive")
- **Fix:** Removed the comment, leaving the now-valid `prisma.coach.findUnique()` call
- **Files modified:** src/lib/trpc.ts
- **Verification:** pnpm type-check passes
- **Committed in:** 222c7da (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Expected cleanup from Plan 01 placeholder. No scope creep.

## Issues Encountered
None

## User Setup Required

**The data migration script must be run manually when ready:**

```bash
pnpm migrate:coach-data
```

This will:
1. Create a Coach record for the existing ADMIN user (Yura)
2. Update the user's role from ADMIN to SUPER_ADMIN
3. Backfill coachId on all existing Lessons, RinkTimeSlots, and BlockedDateRanges
4. Create CoachStudent records linking Yura to all existing students

The script is idempotent -- safe to run multiple times.

## Next Phase Readiness
- Database schema fully supports multi-coach architecture
- Coach model ready for dashboard development (Phase 2)
- coachId columns ready for query scoping (Phase 3)
- Data migration script ready for manual execution
- All application builds and type-checks pass with new schema

---
*Phase: 01-auth-schema-foundation*
*Completed: 2026-03-15*
