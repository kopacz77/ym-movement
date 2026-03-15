---
phase: 02-coach-dashboard-profile
plan: 05
subsystem: api, ui
tags: [trpc, prisma, coach-management, approval-queue, admin-dashboard, react]

# Dependency graph
requires:
  - phase: 01-auth-schema-foundation
    provides: Coach model, superAdminProcedure, role hierarchy
  - phase: 02-01
    provides: Coach schema with suspension fields, ProposedTimeSlot model
  - phase: 02-02
    provides: Coach TRPC router structure, coachProcedure middleware
provides:
  - Admin coach approval TRPC queries (approve/deny pending applications)
  - Admin coach management TRPC queries (CRUD, pricing, status toggle)
  - Admin coaches page UI at /admin/coaches with tabs
  - Coach pending approvals queue component
  - Coach list with status badges and dropdown actions
  - Manual coach creation dialog with pricing and revenue split
  - Coach status actions (activate, deactivate, suspend with reason)
  - Coaches nav item in admin sidebar
affects: [02-06, 03-query-scoping, coach-onboarding-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin coach sub-routers: approval + management pattern mirroring student queries"
    - "superAdminProcedure for all admin coach management endpoints"
    - "Cascading delete User->Coach for deny flow"
    - "GraduationCap icon differentiates Coaches from Students in sidebar"

key-files:
  created:
    - src/features/admin/api/queries/coach/coachApprovalQueries.ts
    - src/features/admin/api/queries/coach/coachManagementQueries.ts
    - src/features/admin/api/queries/coach/index.ts
    - src/app/(protected)/admin/coaches/page.tsx
    - src/features/admin/components/coaches/management/CoachPendingApprovals.tsx
    - src/features/admin/components/coaches/management/CoachList.tsx
    - src/features/admin/components/coaches/management/NewCoachDialog.tsx
    - src/features/admin/components/coaches/management/CoachStatusActions.tsx
  modified:
    - src/features/admin/api/queries/index.ts
    - src/components/layout/AppSidebar.tsx
    - src/components/layout/AppLayout.tsx

key-decisions:
  - "GraduationCap icon used for Coaches nav item to differentiate from Students (Users icon)"
  - "Deny flow deletes User (cascades to Coach) matching student rejection pattern"
  - "Coach creation uses $transaction for atomic User+Coach creation"
  - "All admin coach queries use superAdminProcedure (not protectedProcedure)"
  - "CoachStatusActions renders DropdownMenuItems directly (used inside parent DropdownMenu)"

patterns-established:
  - "Admin sub-router pattern: adminCoachRouter with approval + management sub-routers"
  - "Coach status badge logic: isApproved -> suspendedAt -> isActive chain"

# Metrics
duration: 6min
completed: 2026-03-15
---

# Phase 2 Plan 5: Admin Coach Management Summary

**Admin coach management page with TRPC approval/management queries, approval queue, coach list with status badges, manual creation dialog, and activate/deactivate/suspend status actions**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-15T15:32:27Z
- **Completed:** 2026-03-15T15:38:28Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Complete admin coach TRPC queries for approval (getPending, approve, deny) and management (getAll, getById, create, updatePricing, toggleStatus)
- Admin coaches page at /admin/coaches with tabs for All Coaches and Pending Approvals
- Manual coach creation with pricing, revenue split, and registration completion email
- Status management with activate, deactivate, and suspend (with optional reason) actions
- Coaches navigation item added to admin sidebar in both desktop and mobile layouts

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin-side coach TRPC queries** - `d3e580c` (feat)
2. **Task 2: Admin coaches page UI and sidebar navigation** - `8392cf4` (feat)

## Files Created/Modified
- `src/features/admin/api/queries/coach/coachApprovalQueries.ts` - Coach approval TRPC queries (getPending, approve, deny)
- `src/features/admin/api/queries/coach/coachManagementQueries.ts` - Coach CRUD and status management queries
- `src/features/admin/api/queries/coach/index.ts` - Admin coach router combining approval + management
- `src/features/admin/api/queries/index.ts` - Added adminCoachRouter to admin router
- `src/app/(protected)/admin/coaches/page.tsx` - Admin coaches management page with tabs
- `src/features/admin/components/coaches/management/CoachPendingApprovals.tsx` - Pending approval queue UI
- `src/features/admin/components/coaches/management/CoachList.tsx` - All coaches list with status badges
- `src/features/admin/components/coaches/management/NewCoachDialog.tsx` - Manual coach creation dialog
- `src/features/admin/components/coaches/management/CoachStatusActions.tsx` - Dropdown actions for status management
- `src/components/layout/AppSidebar.tsx` - Added Coaches nav item with GraduationCap icon
- `src/components/layout/AppLayout.tsx` - Added Coaches nav item to mobile sidebar

## Decisions Made
- Used GraduationCap icon for Coaches to visually differentiate from Students (which uses Users icon)
- Deny flow deletes the User record which cascades to Coach (matching the student rejection pattern and Coach model's onDelete: Cascade)
- Coach creation uses Prisma $transaction for atomic User + Coach record creation
- All admin coach management queries use superAdminProcedure (not protectedProcedure or adminProcedure)
- CoachStatusActions component renders DropdownMenuItems directly to be composed inside parent DropdownMenu

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- pnpm format fixed line ending issues (CRLF to LF) in newly created files -- standard WSL formatting behavior
- Pre-existing lint error in CoachOverviewCards.tsx (import ordering) unrelated to plan changes

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Admin coach management complete, ready for Plan 06 (coach settings and integration testing)
- All TRPC endpoints accessible at api.admin.coach.approval.* and api.admin.coach.management.*
- Coach approval sends registration completion email using existing sendApprovalEmail flow

---
*Phase: 02-coach-dashboard-profile*
*Completed: 2026-03-15*
