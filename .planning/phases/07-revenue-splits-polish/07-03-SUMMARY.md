---
phase: 07-revenue-splits-polish
plan: 03
subsystem: ui
tags: [sidebar, navigation, role-switching, lucide, useCurrentUser]

# Dependency graph
requires:
  - phase: 02-coach-dashboard-profile
    provides: Coach model and useCurrentUser hook with coachId/isAdmin flags
  - phase: 01-auth-schema-foundation
    provides: Role hierarchy (SUPER_ADMIN, ADMIN, COACH, STUDENT)
provides:
  - Seamless role-switching navigation between admin and coach views
  - Desktop sidebar "Coach View" / "Admin View" links
  - Mobile sidebar "Coach View" / "Admin View" links using Radix components
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "mt-auto within flex-col container for bottom-positioned sidebar elements"
    - "useCurrentUser hook for conditional UI rendering based on dual-role status"

key-files:
  created: []
  modified:
    - src/components/layout/AppSidebar.tsx
    - src/components/layout/AppLayout.tsx

key-decisions:
  - "ArrowLeftRight icon chosen for role-switch affordance (bidirectional navigation)"
  - "Role-switch links positioned at bottom of nav area using mt-auto in flex-col container"
  - "Desktop uses plain Link elements; mobile uses Radix SidebarMenu components (matching existing patterns)"

patterns-established:
  - "Role-conditional sidebar content: check useCurrentUser().coachId and .isAdmin for dual-role UI"

# Metrics
duration: 2min
completed: 2026-03-16
---

# Phase 7 Plan 3: Role-Switch Sidebar Navigation Summary

**ArrowLeftRight role-switch links in desktop and mobile sidebars for seamless admin/coach view switching**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-16T05:01:08Z
- **Completed:** 2026-03-16T05:03:36Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Desktop sidebar shows "Coach View" link at bottom for admin users with a Coach record (Yura)
- Desktop sidebar shows "Admin View" link at bottom for coach users who are also admin/super_admin
- Mobile sidebar mirrors role-switch links using Radix SidebarMenu/SidebarMenuItem/SidebarMenuButton components
- All immutable sidebar layout standards preserved (w-64, h-24, color scheme, border alignment)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add role-switch link to desktop sidebar** - `d5383b6` (feat)
2. **Task 2: Add role-switch link to mobile sidebar** - `b5d56d3` (feat)

## Files Created/Modified
- `src/components/layout/AppSidebar.tsx` - Added ArrowLeftRight import, useCurrentUser hook call, flex-col on nav container, Coach View/Admin View links at bottom
- `src/components/layout/AppLayout.tsx` - Added ArrowLeftRight import, useCurrentUser hook call, Coach View/Admin View SidebarGroups in mobile sidebar

## Decisions Made
- Used ArrowLeftRight icon (bidirectional arrows) to convey role-switching rather than a simple arrow
- Positioned role-switch links at the bottom of the navigation area using `mt-auto` within a `flex flex-col` container, keeping them visually separated from regular nav items with a border-t divider
- Desktop sidebar uses plain Link elements matching existing desktop nav pattern; mobile uses Radix SidebarMenu components matching existing mobile nav pattern
- Icon sizing follows per-layout conventions: h-5 w-5 for desktop, h-4 w-4 for mobile

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Role-switching navigation complete for dual-role users
- All Phase 7 plans (01, 02, 03) are now complete pending summary/state updates
- No blockers identified

---
*Phase: 07-revenue-splits-polish*
*Completed: 2026-03-16*
