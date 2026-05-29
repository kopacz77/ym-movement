---
phase: 18-self-serve-consignment
plan: 07
subsystem: ui
tags: [next.js, app-router, navigation, lucide, sidebar, route-shell]

# Dependency graph
requires:
  - phase: 18-self-serve-consignment
    provides: "PendingApprovalQueue component (Plan 18-04) — stubbed at execute time, overwritten on 18-04 ship"
  - phase: 14-admin-wardrobe-inventory
    provides: "Phase 14-06 ADR — page = thin client shell; sidebar entries via navigation-config.ts only; AppSidebar.tsx + AppLayout.tsx LOCKED"
  - phase: 17-admin-rental-lifecycle
    provides: "/admin/wardrobe/requests + /admin/wardrobe/rentals route-shell precedents copied wholesale for the pending-approval shell shape"
provides:
  - "Admin pending-approval route at /admin/wardrobe/pending-approval — thin client shell mounting PendingApprovalQueue inside editorial header chrome"
  - "'Consigned' sidebar entry visible to all 3 roles (admin, student, coach) — unconditional, gated only by the empty state on /wardrobe/consigned"
  - "Tag lucide icon added to navigation-config.ts imports — visually distinct from Wardrobe's Shirt icon"
  - "Stub PendingApprovalQueue component at expected path — unblocks 18-07 before 18-04 ships; 18-04 overwrites wholesale (stub-then-swap)"
  - "Phase 18 route + nav surfaces complete — CONSIGN-06 and NAV-02 closed"
affects: ["18-04 (will overwrite stub)", "18-05 (consigner /wardrobe/consigned route target)", "18-06 (consigner submission flow that this nav entry surfaces)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stub-then-swap for parallel Wave dependencies — when a depends_on plan ships in parallel, create a minimal stub at the expected import path so the dependent plan can ship independently; the parallel plan overwrites the stub wholesale"
    - "Fifth instance of Phase 14-06 thin-client-shell ADR — /admin/wardrobe/pending-approval is the 5th admin route to follow the pattern (after /requests, /rentals, /new, /[id]/edit)"
    - "Unconditional sidebar entry — when role-gating would require duplicate route logic and an empty-state already exists on the destination page, expose the link to every role and let the empty state act as the natural gate (research §6)"

key-files:
  created:
    - "src/app/(protected)/admin/wardrobe/pending-approval/page.tsx"
    - "src/features/wardrobe/components/admin/PendingApprovalQueue.tsx (STUB — to be replaced by Plan 18-04)"
  modified:
    - "src/lib/navigation-config.ts"

key-decisions:
  - "Stub PendingApprovalQueue to unblock 18-07 before 18-04 lands — stub-then-swap pattern formalized for parallel Wave dependencies"
  - "Tag lucide icon for Consigned entry (not Shirt/PackagePlus/Store) — semantic price-tag analog, compact at sidebar size, alphabetical insert between Shirt and User"
  - "Insert Consigned AFTER Wardrobe in admin/student nav (sibling under wardrobe surface area), BEFORE Profile in coach nav (no existing Wardrobe entry — coaches don't browse marketplace by default)"
  - "Unconditional visibility across all 3 roles — empty state on /wardrobe/consigned is the natural gate, not a role check"

patterns-established:
  - "Stub-then-swap: parallel Wave plans that depend on each other use minimal placeholder components so each ships independently; the producer plan overwrites the stub wholesale"
  - "Admin route shell ADR — 5th instance: editorial header + back link + Wave-2 component mount, 'use client', no auth() call, zero business logic"

# Metrics
duration: 2min
completed: 2026-05-29
---

# Phase 18 Plan 07: Admin Pending-Approval Route + Consigned Nav Summary

**Admin pending-approval route shell at /admin/wardrobe/pending-approval (mounts Plan 18-04's PendingApprovalQueue, stubbed at execute time) + "Consigned" sidebar entry added to all 3 role navigation arrays with Tag icon — closes NAV-02 and the navigation surface for CONSIGN-06**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-29T19:07:35Z
- **Completed:** 2026-05-29T19:10:00Z (approx)
- **Tasks:** 2
- **Files created:** 2 (page.tsx + stub PendingApprovalQueue.tsx)
- **Files modified:** 1 (navigation-config.ts)

## Accomplishments

- **Admin pending-approval route live:** `/admin/wardrobe/pending-approval` renders editorial header (navy #1a3a5c title "Pending Approval", uppercase eyebrow "Pending review", slate-500 description) + back link to `/admin/wardrobe` + mounts `<PendingApprovalQueue />`. Inherits auth + role enforcement from `AdminLayout` (AppLayout role="admin") — no `auth()` call in the page layer per the 14-06 ADR.
- **5th instance of the thin-client-shell ADR:** mirrors `/admin/wardrobe/requests/page.tsx` and `/admin/wardrobe/rentals/page.tsx` exactly — same chrome, same back-link copy, same lucide ArrowLeft import. Pattern is now the canonical admin route shell.
- **Stub PendingApprovalQueue created at the expected import path** (`src/features/wardrobe/components/admin/PendingApprovalQueue.tsx`) so the page compiles and renders before Plan 18-04 ships the real moderation surface. Stub renders a single neutral card with "Pending approval queue is wiring up" copy; Plan 18-04 overwrites this file wholesale. Stub-then-swap pattern formalized for parallel Wave dependencies.
- **"Consigned" sidebar entry visible to all 3 roles:**
  - adminNavigation: between Wardrobe and Settings
  - studentNavigation: between Wardrobe and Settings
  - coachNavigation: between Proposals and Profile (no existing Wardrobe entry)
  - All three point to `/wardrobe/consigned`
  - All three use Tag lucide icon (semantic price-tag, visually distinct from Wardrobe's Shirt)
- **AppSidebar.tsx and AppLayout.tsx UNTOUCHED:** confirmed via `git diff --name-only` — sidebar entries flow through `getNavigationForRole(role)` only, per CLAUDE.md hard-lock.
- **Phase 18 route + nav surfaces complete:** CONSIGN-06 surface reachable, NAV-02 satisfied.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /admin/wardrobe/pending-approval/page.tsx admin route shell (+ stub PendingApprovalQueue)** — `77b8c93` (feat)
2. **Task 2: Add "Consigned" entry to all 3 role navigation arrays in navigation-config.ts** — `2b88df7` (feat)

**Plan metadata:** (pending docs commit below)

## Files Created/Modified

### Created
- `src/app/(protected)/admin/wardrobe/pending-approval/page.tsx` (35 lines) — Thin "use client" shell: editorial header with navy #1a3a5c title + uppercase eyebrow + slate-500 description + ArrowLeft back-link to `/admin/wardrobe`, mounts `<PendingApprovalQueue />`. No `auth()` call (inherited from AdminLayout).
- `src/features/wardrobe/components/admin/PendingApprovalQueue.tsx` (STUB, 21 lines) — Single neutral card placeholder. Renders "Pending approval queue is wiring up. Check back once Plan 18-04 ships." Header comment explicitly marks it as STUB and instructs Plan 18-04 to overwrite wholesale.

### Modified
- `src/lib/navigation-config.ts` — 4 surgical edits: (1) added `Tag` import between `Shirt` and `User` in the lucide-react import block; (2) inserted `{ name: "Consigned", href: "/wardrobe/consigned", icon: Tag }` into adminNavigation after Wardrobe; (3) same into studentNavigation after Wardrobe; (4) same into coachNavigation before Profile.

### Untouched (verified)
- `src/components/layout/AppSidebar.tsx` (LOCKED per CLAUDE.md)
- `src/components/layout/AppLayout.tsx` (LOCKED per CLAUDE.md)

## Decisions Made

- **Stub-then-swap formalized as a pattern for parallel Wave dependencies.** Plan 18-07 declares `depends_on: ["18-04"]` but 18-04 ships in parallel and was mid-flight at execute time (untracked `ApproveDressDialog.tsx` + `RejectDressDialog.tsx` from 18-04 visible in git status, but no `PendingApprovalQueue.tsx` yet). Rather than block 18-07 on 18-04's completion, created a minimal 21-line stub at the exact expected import path (`@/features/wardrobe/components/admin/PendingApprovalQueue`) so the route shell compiles, type-checks, and renders. The stub's header comment explicitly tells the future 18-04 implementer to overwrite wholesale (no merge logic needed). Pattern reusable for any Wave-internal parallel dependency.
- **Tag lucide icon chosen for Consigned** (not Shirt/PackagePlus/Store):
  - Shirt would create visual collision with the existing Wardrobe entry — both items would render identical icons, defeating navigation legibility (18-RESEARCH Pitfall 5).
  - Tag is semantically aligned (a price tag implies listing for rent/sale — consigner intent).
  - Tag renders cleanly at the 16px sidebar size (verified via lucide's icon repository — no detail loss).
  - Alphabetical placement (between Shirt and User) keeps the import block sorted, matching Phase 14-06's `Shirt` insertion convention.
- **Insert position differs by role:**
  - admin/student: AFTER Wardrobe, BEFORE Settings — wardrobe-cluster grouping. A user thinking "my dresses I've put up for rent" naturally scans the Wardrobe area.
  - coach: AFTER Proposals, BEFORE Profile — no existing Wardrobe entry (coaches don't browse marketplace by default in v2.0). Profile is the closest "your personal stuff" anchor, so Consigned sits just above it.
- **Unconditional visibility (not role-gated):** every authenticated user may consign per 18-RESEARCH Critical Findings §6. The empty state on `/wardrobe/consigned` (Plan 18-05) acts as the natural gate for users with zero owned dresses. Avoids duplicate route logic (would require server-side role checks AND client-side nav filtering AND empty-state UX anyway).
- **Page does NOT call `auth()` directly:** AdminLayout (`AppLayout role="admin"`) at the route-group level (`/admin/layout.tsx`) already enforces admin-or-super-admin role. Per the 14-06 ADR, the page layer owns route composition only — auth/role/business logic split is the single most important page-layer contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created stub PendingApprovalQueue component to unblock the page import**
- **Found during:** Task 1 (Create admin pending-approval route shell)
- **Issue:** Plan 18-07 imports `PendingApprovalQueue` from `@/features/wardrobe/components/admin/PendingApprovalQueue` (Plan 18-04's deliverable), but 18-04 ships in parallel and had not yet landed at execute time. Without the import resolving, the page file would fail type-check and the route wouldn't render — blocking 18-07 from shipping independently.
- **Fix:** Created a minimal 21-line stub at the exact expected path with a `"use client"` directive and a single neutral-card render. Header comment explicitly marks it STUB and instructs Plan 18-04's implementer to overwrite wholesale (zero merge logic needed).
- **Files modified:** `src/features/wardrobe/components/admin/PendingApprovalQueue.tsx` (created)
- **Verification:** `npx tsc --noEmit` shows zero NEW errors (only the pre-existing IceParticles `three` types blocker); `pnpm biome check` clean after auto-format; page renders without compile errors.
- **Committed in:** `77b8c93` (Task 1 commit — page + stub bundled as the unblocking unit)

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** Necessary to ship 18-07 independently of 18-04's parallel timeline. Plan 18-04 overwrites the stub wholesale — zero technical debt, zero refactor cost. The plan's critical_notes explicitly authorized this approach ("18-04 in parallel ships PendingApprovalQueue. Use stub-then-swap.").

## Issues Encountered

- **`pnpm biome check` triggered ERR_PNPM_IGNORED_BUILDS:** the dependency-check preflight before running scripts complained about `@prisma/client`, `@prisma/engines`, `esbuild`, `msw`, `prisma`, `sharp` build scripts being ignored. Workaround: ran `npx biome check` directly (skips the pnpm dependency-check phase entirely). Documented workaround applies to all `pnpm biome ...` invocations in this codebase until `pnpm approve-builds` is run.
- **Biome auto-format adjustment to page.tsx:** initial draft had the `<h1>` content wrapped across 3 lines and `<p>` content wrapped across 3 lines. Biome's formatter prefers single-line for content that fits within the 100-char width budget. Ran `npx biome check --write` to apply the canonical format; no semantic changes.
- **Other modified/untracked files visible in `git status`:** `src/features/admin/api/queries/wardrobeDressQueries.ts`, `src/features/wardrobe/api/queries/index.ts`, `src/features/wardrobe/components/admin/DressForm.tsx`, and untracked `ApproveDressDialog.tsx` + `RejectDressDialog.tsx` belong to parallel Plans 18-02/18-03/18-04. Staged ONLY the three files this plan owns (page.tsx + stub PendingApprovalQueue.tsx + navigation-config.ts) per the staging-individual-files rule.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Wave 3 of Phase 18 ships:** Plans 18-05 (consigner /wardrobe/consigned listings), 18-06 (consigner submission flow), and 18-07 (this plan) together close the consigner-facing surfaces. With 18-07 landed, every Phase 18 route is reachable and every navigation surface points to its destination.
- **Phase 18 status after this plan:** 4 of 7 plans shipped (18-01 schema, 18-02 TRPC procedures shipping in parallel, 18-03 admin moderation hooks shipping in parallel, 18-04 PendingApprovalQueue shipping in parallel, 18-07 this plan). The Wave 3 parallel work (18-04/18-05/18-06) will close out the remaining functional gaps when those plans ship.
- **Phase 18 requirements closure (assuming Wave 3 plans ship):** CONSIGN-01 (Plan 18-06), CONSIGN-02 (Plans 18-02 + 18-03), CONSIGN-03 (Plans 18-02 + 18-05 + 18-06), CONSIGN-04 (Plans 18-02 + 18-03 + 18-06), CONSIGN-05 (Plans 18-02 + 18-06), CONSIGN-06 (Plans 18-02 + 18-04 + 18-07 — route shell + nav surface live), CONSIGN-07 (Plans 18-02 + 18-04), CONSIGN-08 (Plans 18-01 + 18-02 + 18-04), CONSIGN-09 (Plans 18-02 + 18-05 + 18-06), **NAV-02 (Plan 18-07 — CLOSED)**, PERM-01 (Plan 18-02).
- **Suggested follow-up (out of scope for Phase 18):** add a "Review pending submissions (N)" CTA button on the main `/admin/wardrobe` inventory page that links to `/admin/wardrobe/pending-approval` with a count badge driven by `wardrobe.listPending` (Plan 18-04). Discovery improvement — currently the only way to reach the pending queue is via the sidebar's Consigned link (which actually lands on `/wardrobe/consigned`, NOT `/admin/wardrobe/pending-approval`) or by typing the URL directly.
- **No blockers** for the remaining Wave 3 plans (18-04/18-05/18-06) — all expected import paths now exist (stub or real), all sidebar surfaces point to their destinations, all route shells render.

---
*Phase: 18-self-serve-consignment*
*Completed: 2026-05-29*
