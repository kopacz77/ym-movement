---
phase: 12-tech-debt-cleanup
plan: 01
subsystem: infra
tags: [next.js, proxy, middleware, auth, signout, sidebar]

# Dependency graph
requires:
  - phase: 11-test-stabilization
    provides: identified middleware redirect failures and missing sign-out button
provides:
  - proxy.ts replacing deprecated middleware.ts for Next.js 16 compatibility
  - Sign Out button in desktop and mobile sidebars
affects: [12-02 (test unfixme), 12-03 (test-utils cleanup)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "proxy.ts file convention for Next.js 16 request interception"
    - "Sign Out button at sidebar bottom with mt-auto positioning"

key-files:
  created:
    - proxy.ts
  modified:
    - __tests__/middleware.test.ts
    - src/components/layout/AppSidebar.tsx
    - src/components/layout/AppLayout.tsx

key-decisions:
  - "Renamed function from middleware to proxy per Next.js 16 convention"
  - "Used red hover styling (hover:bg-red-50) for sign-out to distinguish destructive action"
  - "Conditional mt-auto on Sign Out: pushes to bottom only when no role-switch link present"

patterns-established:
  - "proxy.ts at project root for request interception (not middleware.ts)"
  - "Sign Out uses signOut({ callbackUrl: '/auth/login' }) from next-auth/react"

# Metrics
duration: 4min
completed: 2026-03-17
---

# Phase 12 Plan 01: Middleware-to-Proxy Migration and Sidebar Sign Out Summary

**Migrated middleware.ts to proxy.ts for Next.js 16 compatibility and added visible "Sign Out" button to desktop and mobile sidebars using next-auth/react signOut**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-17T15:26:25Z
- **Completed:** 2026-03-17T15:30:03Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Renamed middleware.ts to proxy.ts with function rename from `middleware` to `proxy`, fixing root cause of 8 fixme'd redirect tests
- Added "Sign Out" button to desktop sidebar (AppSidebar.tsx) with conditional mt-auto positioning
- Added "Sign Out" button to mobile sidebar (AppLayout.tsx) as SidebarGroup at bottom of SidebarContent
- All immutable layout properties preserved (w-64, h-24, gradients, borders unchanged)

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate middleware.ts to proxy.ts** - `45193c0` (feat)
2. **Task 2: Add Sign Out button to desktop and mobile sidebars** - `4083c2f` (feat)

## Files Created/Modified
- `proxy.ts` - Next.js 16 proxy file (renamed from middleware.ts, function renamed to proxy)
- `__tests__/middleware.test.ts` - Updated import to reference proxy module
- `src/components/layout/AppSidebar.tsx` - Added Sign Out button with LogOut icon and signOut from next-auth/react
- `src/components/layout/AppLayout.tsx` - Added Sign Out SidebarGroup to mobile sidebar

## Decisions Made
- Renamed function from `middleware` to `proxy` per Next.js 16 convention (identical API surface)
- Used red hover styling (`hover:bg-red-50 hover:text-red-700`) for Sign Out to visually distinguish destructive action from navigation links
- Conditional `mt-auto` on Sign Out: pushes to bottom when no role-switch link is present, sits below role-switch when it exists
- Button text exactly "Sign Out" (capital S, capital O) to match existing test selector `button:has-text("Sign Out")`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated middleware.test.ts import path**
- **Found during:** Task 1 (Migrate middleware.ts to proxy.ts)
- **Issue:** `__tests__/middleware.test.ts` imported `{ middleware } from "../middleware"` which broke TypeScript compilation after middleware.ts was deleted
- **Fix:** Changed import to `{ proxy as middleware } from "../proxy"` -- kept local alias so all test calls remain unchanged
- **Files modified:** `__tests__/middleware.test.ts`
- **Verification:** `pnpm type-check` passes
- **Committed in:** 45193c0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix to maintain TypeScript compilation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- proxy.ts is active and ready for redirect testing
- Sign Out buttons are in place for authentication test verification
- Next plans can unfixme the 8 redirect tests and unskip the 1 sign-out test
- The deleted middleware.ts will not interfere with Next.js 16 proxy resolution

---
*Phase: 12-tech-debt-cleanup*
*Completed: 2026-03-17*
