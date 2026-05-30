# Phase 22: Project-Wide Storybook Audit — Research

**Researched:** 2026-05-29
**Domain:** Storybook 10.x + nextjs-vite + Vite + Playwright VRT
**Confidence:** HIGH (counts, blocker diagnosis), MEDIUM (backfill priority — judgment call)

---

## Executive Summary

This is the final v2.0 milestone phase. Its value is **the audit** (visible, queryable inventory of what has stories) and **unblocking VRT** (so the Phase 21-05 wardrobe baselines can finally be generated). It is **not** "close every story gap" — at current ~12% coverage with 211 components missing stories, that is multi-phase work that does not fit a v2.0 finalization slot.

Three things must happen in this phase:

1. **Fix the `randomBytes` Vite blocker.** Confirmed root cause: client component `WardrobeSettingsForm.tsx` imports the Zod schema/type from `wardrobeSettingsQueries.ts`, which transitively pulls `@/lib/trpc` → `@/lib/security` → `node:crypto`. Vite (correctly) refuses to bundle `node:crypto` for the browser. Architectural fix: split server-side query files into "schema half" (client-safe) and "router half" (server-only). Tactical fix: a `viteFinal` alias in `.storybook/main.ts` that stubs `@/lib/security` for Storybook builds only. Recommend the tactical fix for this phase and file the architectural fix as deferred follow-up. (Same blocker affects 6 client components total — see *randomBytes Blocker* section.)
2. **Produce the audit deliverable.** Commit `docs/storybook-audit.md` — a checked-in inventory table (Component / Path / Has Story? / Has VRT? / Priority). This is what STORY-04 actually buys: future contributors can `grep` the file and immediately know coverage state without rerunning analysis.
3. **Backfill 8–12 highest-leverage stories** (UI primitives in 30+ files, plus 3–4 dashboard/dialog widgets that ship across multiple flows). Then generate VRT baselines for: those new stories + the 13 wardrobe baselines that 21-05 left as a TODO.

**Primary recommendation:** 3-plan breakdown — `22-01` audit-doc + randomBytes fix, `22-02` backfill 8–12 stories, `22-03` VRT baseline generation (covers Phase 21-05 backlog + new). Do NOT attempt a "wave 2" or feature-completion sweep — defer the remaining ~200 components to a v2.1 phase.

---

## Component Inventory (HIGH confidence — derived from `find`)

### Top-Level Counts

| Directory                            | Total `.tsx` (non-stories, non-tests) | Existing `.stories.tsx` | Coverage |
|--------------------------------------|---------------------------------------|--------------------------|----------|
| `src/components/` (incl. ui, layout, landing, public) | 73                                    | 5                        | **6.8%** |
| └─ `src/components/ui/` only         | 52                                    | 5                        | 9.6%     |
| `src/features/admin/components/`     | 80                                    | 7                        | 8.8%     |
| `src/features/auth/components/`      | 1                                     | 0                        | 0%       |
| `src/features/coach/components/`     | 14                                    | 3                        | 21.4%    |
| `src/features/notifications/components/` | 1                                 | 0                        | 0%       |
| `src/features/scheduling/components/` | 21                                   | 1                        | 4.8%     |
| `src/features/student/components/`   | 14                                    | 2                        | 14.3%    |
| `src/features/wardrobe/components/`  | 33                                    | 10                       | 30.3%    |
| **TOTAL**                            | **237**                               | **28**                   | **~11.8%** |

### Pages (`src/app/(protected)/**/page.tsx`)

39 protected pages (admin: 15, coach: 8, student: 9, wardrobe: 7). **None** have stories today. Per STORY-04, the audit "cross-references against existing .stories.tsx files" for *components* — pages are out of scope for backfill (they're integration shells, not isolated visual units). The audit doc should list them but mark all as "N/A — page-level, covered by Playwright E2E or DashboardSkeleton-level VRT."

### Existing 28 Stories — Distribution

UI primitives (5): badge, button, card, input, skeleton
Admin analytics (3): RevenueBreakdownChart, RevenueChart, StudentActivityChart
Admin dashboard (4): ActivityFeed, QuickActions, SmartKPICards, TodayTimeline
Coach dashboard (3): CoachOverviewCards, CoachPastLessons, CoachUpcomingLessons
Scheduling (1): FCEventContent
Student dashboard (2): StudentProgress, UpcomingLessons
Wardrobe (10, all from Phase 21-05): CatalogGrid, DressCard, MeasurementForm, WardrobeFilterBar, PendingApprovalQueue, ConsignerEarningsTable, DressDetailHero, FitCheckCard, RentalStatusBadge, RequestRentalDialog

### Existing 33 VRT Snapshot IDs

20 pre-21 + 13 wardrobe-* (from 21-05). The 13 wardrobe baselines have **no PNG files committed yet** — they are gated on this phase's randomBytes fix per `21-05-SUMMARY.md` § User TODO.

---

## randomBytes Blocker — Full Diagnosis

### Reproduction
`pnpm storybook:build` fails with:
```
randomBytes is not exported by "__vite-browser-external", imported by "src/lib/security.ts"
```

### Import Graph (verified via `grep`)

```
WardrobeSettingsForm.tsx ("use client")
  └─ imports { wardrobeSettingsSchema, type WardrobeSettings } from
       wardrobeSettingsQueries.ts (server-only)
         ├─ imports { randomUUID } from "node:crypto"             ← direct
         ├─ imports { adminProcedure, createTRPCRouter } from
         │    @/lib/trpc
         │      └─ imports { authRateLimiter, getClientIP, logSecurityEvent } from
         │           @/lib/security
         │             └─ imports { createHmac, randomBytes,
         │                  timingSafeEqual } from "node:crypto"  ← FAILS
         └─ imports { TRPCError } from "@trpc/server"
```

### All Bleed Points

6 client components import schemas/types from server query files (these are all v2.0 wardrobe additions — pre-existing routers like admin/student/coach are not affected because their client components only call `api.x.useQuery()`, never import the schema directly):

| Client component                                    | Imports from server query file                        |
|-----------------------------------------------------|-------------------------------------------------------|
| `WardrobeSettingsForm.tsx`                          | `wardrobeSettingsQueries.ts`                          |
| `DressForm.tsx`                                     | `wardrobeDressQueries.ts` (type-only)                 |
| `DressFormCore.tsx`                                 | `wardrobeDressQueries.ts` (type-only)                 |
| `ConsignerDressForm.tsx`                            | `consignerQueries.ts` (type-only)                     |
| `MeasurementForm.tsx`                               | `measurementQueries.ts` (value import: schema)        |
| `RequestRentalDialog.tsx`                           | `requestQueries.ts` (value import: schema)            |

Only `WardrobeSettingsForm` is the *current* trigger (its import is a value import, and that file's transitive chain hits `node:crypto`), but the **other five are latent landmines** — any future PR that turns one of their type-only imports into a value import, or adds a `node:crypto` dep to those query files, reproduces the bug.

### Recommended Fix: Two-Layer Strategy

**Tactical (this phase, ~10 min, unblocks Storybook now):**

Stub `@/lib/security` in Storybook's Vite config. The stub exports the same names but with browser-safe implementations / no-ops:

```typescript
// .storybook/main.ts
import path from "node:path";
import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-themes", "@storybook/addon-a11y"],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
  docs: { autodocs: "tag" },
  async viteFinal(config) {
    const { mergeConfig } = await import("vite");
    return mergeConfig(config, {
      resolve: {
        alias: {
          "@/lib/security": path.resolve(
            __dirname,
            "./mocks/security.browser.ts",
          ),
        },
      },
    });
  },
};

export default config;
```

```typescript
// .storybook/mocks/security.browser.ts
// Browser-safe stubs for Storybook only — same exports as src/lib/security.ts
export const generateSecureToken = (n = 32) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
export const validateSecurityEnvironment = () => undefined;
export const safeCompare = (a: string, b: string) => a === b;
export const sanitizeInput = (s: string) => s;
export const logSecurityEvent = (..._args: unknown[]) => undefined;
export const validatePasswordStrength = (_p: string) => ({ isValid: true, errors: [] });
export const validateSecurityHeaders = () => true;
export const getClientIP = (_h: Headers) => "storybook";
export const authRateLimiter = { isAllowed: () => true, cleanup: () => undefined };
export const apiRateLimiter = { isAllowed: () => true, cleanup: () => undefined };
export const turnstileTokenTracker = { markUsed: () => true, isUsed: () => false, cleanup: () => undefined };
```

Why this works: Vite resolves `@/lib/security` to the browser stub before Rollup sees the `node:crypto` import. The server-side code is untouched — only Storybook bundles see the stub. No `node:crypto` ever reaches the browser bundle.

Why not just alias `node:crypto`: that would mask future imports of crypto in other server files that get accidentally pulled into stories.

**Architectural (deferred to v2.1 follow-up, not this phase):**

Split each affected query file into two siblings:

```
wardrobeSettingsQueries.ts          (server-only: router + getWardrobeSettings)
wardrobeSettingsQueries.schema.ts   (client-safe: zod schema + inferred type)
```

Add `import "server-only"` at the top of every `*Queries.ts`. Update the 6 client components to import schemas from `.schema.ts` siblings. This is the *real* fix but it's a 12-file refactor with type-import-graph implications across admin and wardrobe routers — appropriate for v2.1, not v2.0 finalization.

### Why not `viteFinal` + `optimizeDeps.exclude`?

Tried mentally; doesn't help. `optimizeDeps` is about pre-bundling node_modules — `@/lib/security` is application code, not a dep. Alias is the right tool.

---

## Audit Deliverable Recommendation

**File:** `docs/storybook-audit.md` (NEW, ~250 lines)

**Why a docs file (not internal-only):**
- STORY-04 says "audit inventory identifies every component" — a checked-in file is the only way that's *verifiable* by future contributors.
- Reviewer can `grep` for "Has Story? | No" to find next backfill candidates without rerunning find.
- Acts as a living TODO list for v2.1 coverage work.

**Proposed structure:**

```markdown
# Storybook Coverage Audit

_Generated: 2026-05-29 (Phase 22). Update via Phase 22 process — see CONTRIBUTING.md._

## Summary

- Total components: 237
- Components with .stories.tsx: 28 (~12%)
- VRT snapshot IDs: 33 (13 wardrobe baselines pending generation)
- Last audit: Phase 22 (v2.0 milestone)

## Coverage by Area

| Area                              | Total | Storied | %      |
|-----------------------------------|-------|---------|--------|
| src/components/ui                 | 52    | 5       | 9.6%   |
| ...                               | ...   | ...     | ...    |

## Component Inventory

### src/components/ui

| Component                    | Story? | VRT? | Priority | Notes                                |
|------------------------------|--------|------|----------|--------------------------------------|
| alert.tsx                    | No     | —    | HIGH     | 7 import sites                       |
| alert-dialog.tsx             | No     | —    | MEDIUM   | 0 direct import sites today          |
| avatar.tsx                   | No     | —    | HIGH     | 4 sites (avatars in headers)         |
| badge.tsx                    | YES    | YES  | DONE     | badge.stories.tsx (2 VRT)            |
| ...                          | ...    | ...  | ...      | ...                                  |

### src/features/admin/components

| Component (relative)                        | Story? | VRT? | Priority | Notes                          |
|---------------------------------------------|--------|------|----------|--------------------------------|
| analytics/CoachDetailView.tsx               | No     | —    | LOW      | Single-use admin-only          |
| analytics/CoachOverviewCards.tsx            | No     | —    | MED      | Reused in analytics            |
| ...                                         | ...    | ...  | ...      | ...                            |

### Pages (page.tsx) — Reference only

Pages listed for completeness; story coverage at component-level only. Page-level VRT is handled by Playwright E2E spec where present.

| Page                                                   | E2E? | Story-shell? |
|--------------------------------------------------------|------|--------------|
| src/app/(protected)/admin/dashboard/page.tsx           | No   | N/A          |
| ...                                                    | ...  | ...          |

## Backfill Priority Definitions

- **HIGH**: ≥10 import sites OR ships in 3+ user flows OR ships in a paid v2.0 surface (wardrobe).
- **MEDIUM**: 3–9 import sites, single primary flow.
- **LOW**: 1–2 import sites, internal admin tooling, or one-off forms.
- **DONE**: Has .stories.tsx file.
- **N/A**: Pages, layout primitives that render only inside other tested components (AppLayout, AppSidebar — pinned per CLAUDE.md).
```

**Generation method:** Hand-written from the data in this RESEARCH.md, *not* auto-generated. A future plan can script it (e.g., `scripts/audit-stories.ts` that walks src/ and emits the markdown), but that's premature optimization for one v2.0 phase. Keep it simple: write the table from the `find` output, commit it, done.

**Maintenance:** Add a CONTRIBUTING.md note: "When you add a `.stories.tsx`, flip the corresponding row in `docs/storybook-audit.md` from No → YES." Future PR review checks the file.

---

## High-Leverage Backfill Candidates (10–12 components)

Selection criteria:
1. **High import count** (≥10 sites) — fixing one story unblocks visual feedback for dozens of consumer components.
2. **Ships in v2.0 wardrobe surfaces** (we know wardrobe will get future styling work; baseline now).
3. **Easy to story** (no MSW handler needed, or trivial MSW).

### Tier 1: UI primitives (5 stories, very fast)

These all have ≥10 import sites and zero TRPC dependency:

| Component                  | Import sites | Why story is high-leverage                                  |
|----------------------------|--------------|-------------------------------------------------------------|
| `ui/dialog.tsx`            | 35           | Used in 35 places; visual regression here ripples broadly   |
| `ui/select.tsx`            | 35           | Tons of forms; tested combos: empty, populated, disabled    |
| `ui/table.tsx`             | 21           | All admin tables share this; one story locks the chrome     |
| `ui/tabs.tsx`              | 16           | Settings + profile flows; states: default, with badge       |
| `ui/form.tsx`              | 14           | react-hook-form wrapper; story = composition demo           |

### Tier 2: Wardrobe v2.0 components missing stories (3 stories)

Wardrobe is the v2.0 paid surface. We want VRT on the highest-traffic wardrobe pieces that Phase 21 didn't cover:

| Component                                          | Import sites | Rationale                                  |
|----------------------------------------------------|--------------|--------------------------------------------|
| `wardrobe/components/DressStatusBadge.tsx`         | 9            | Renders on every dress card + detail page  |
| `wardrobe/components/BestFitBadge.tsx`             | 6            | Renders on best-fit dresses in catalog     |
| `wardrobe/components/detail/DressImageCarousel.tsx`| 2 (low-imp but visible)| Hero element on every dress detail |

### Tier 3: Dashboard widgets / dialogs (2–4 stories)

| Component                                                   | Import sites | Rationale                                  |
|-------------------------------------------------------------|--------------|--------------------------------------------|
| `student/components/dashboard/NextLessonHero.tsx`           | (high visibility) | Front-page hero for every student login   |
| `student/components/dashboard/OutstandingPayments.tsx`      | (high visibility) | Front-page card showing balances          |
| `coach/components/earnings/EarningsOverview.tsx`            | (high visibility) | Coach landing earnings summary            |
| `notifications/components/NotificationsPopover.tsx`         | 4            | Renders in all 3 headers — admin/coach/student |

**Total recommended:** 12 components → ~36–48 stories (avg 3–4 variants each) → 36–48 new VRT snapshot PNGs.

**Explicitly OUT of scope for this phase:**
- Admin scheduling dialogs (`TimeSlotDialog`, `BookingDialog`, `EditLessonTypeDialog`) — large MSW handler graphs, defer to dedicated phase
- Admin coach/student lists (`StudentList`, `CoachList`, `PaymentTable`) — wide data fixtures needed
- Auth components (`ChangePasswordForm`) — only one component, low marginal value
- All ~80 admin components beyond the 7 already storied — multi-phase work
- All scheduling components beyond `FCEventContent` (already storied) — calendar mocking is its own discipline

This keeps Phase 22 finite. Coverage will move from 28 → ~40 stories (~17%), still nowhere near 100% — and that's the right tradeoff.

---

## VRT Baseline Strategy

### Goal

Generate baseline PNGs for **two cohorts simultaneously**:

1. **Phase 21-05 backlog**: 13 wardrobe-* IDs already in `tests/storybook-vrt.spec.ts` with no PNG files yet
2. **Phase 22 new**: 36–48 IDs from the 12 backfilled stories

Total target PNGs after this phase: ~50–60 new + 20 existing = ~70–80 committed snapshots.

### Procedure (after randomBytes fix lands)

```bash
# 1. Verify Storybook builds (was failing before fix)
pnpm storybook:build
# expect: success, storybook-static/ populated

# 2. Generate ALL baselines in one shot
pnpm test:vrt --update-snapshots

# 3. Stage and commit ONLY the new wardrobe-* and tier-1/2/3 snapshots
#    (do NOT use `git add .` — that risks staging the generated /storybook-static dir)
git add tests/storybook-vrt.spec.ts-snapshots/wardrobe-*.png
git add tests/storybook-vrt.spec.ts-snapshots/ui-{dialog,select,table,tabs,form}--*.png
git add tests/storybook-vrt.spec.ts-snapshots/wardrobe-{dressstatusbadge,bestfitbadge,*-dressimagecarousel}--*.png
git add tests/storybook-vrt.spec.ts-snapshots/student-dashboard-{nextlessonhero,outstandingpayments}--*.png
git add tests/storybook-vrt.spec.ts-snapshots/coach-earnings-earningsoverview--*.png
git add tests/storybook-vrt.spec.ts-snapshots/notifications-notificationspopover--*.png

# 4. Re-run WITHOUT --update-snapshots to confirm everything diffs clean
pnpm test:vrt
# expect: all green, 0 diffs
```

### Risks at baseline generation

- **Font-loading flake**: Storybook preview decorator already sets fallback `'Public Sans', 'Inter', system-ui` (verified in `.storybook/preview.tsx:41`). Should be deterministic but the existing 500ms `waitForTimeout` in `tests/storybook-vrt.spec.ts:53` matters.
- **Animation flake**: Several components have intro animations (`celebration.tsx`, `delightful-loading.tsx`). The 500ms wait + 1% tolerance should absorb them. If a specific story flakes, add `parameters: { chromatic: { delay: 1000 } }` or a `play` function that disables animations.
- **Dark-mode noise**: Preview has light/dark toggle but spec only screenshots default (`light`). If user later adds dark stories, snapshots will need explicit story IDs.

### Why one big baseline-generation pass vs. per-component
- Atomically establishes the "Phase 22 baseline" — every snapshot has the same Storybook build, same Playwright version, same OS image.
- Splitting baseline generation across plans risks subpixel differences between runs (different cold-start states, etc.).

---

## Recommended Plan Breakdown (3 plans)

### Plan 22-01: Audit Inventory + Storybook Build Fix
**Outputs:**
- `docs/storybook-audit.md` — the 237-component inventory table
- `.storybook/main.ts` — `viteFinal` alias added
- `.storybook/mocks/security.browser.ts` — new file, ~25 lines
- (deferred-fix note) — issue/follow-up reference for the architectural .schema.ts split

**Verification:** `pnpm storybook:build` exits 0; `cat docs/storybook-audit.md | wc -l` ≥ 200; `pnpm type-check` clean.

**Estimated effort:** ~45 min. Audit doc is the bulk of the work (table assembly + priority assignment per row).

### Plan 22-02: Backfill 12 High-Leverage Stories
**Outputs:** 12 new `.stories.tsx` files (Tier 1 + 2 + 3 above). Each file: 2–4 variants, MSW handlers where needed (UI primitives = none; wardrobe = reuse 21-05 MSW patterns; dashboard widgets = mock 1–2 TRPC queries).

**File creation list:**
```
src/components/ui/dialog.stories.tsx
src/components/ui/select.stories.tsx
src/components/ui/table.stories.tsx
src/components/ui/tabs.stories.tsx
src/components/ui/form.stories.tsx
src/features/wardrobe/components/DressStatusBadge.stories.tsx
src/features/wardrobe/components/BestFitBadge.stories.tsx
src/features/wardrobe/components/detail/DressImageCarousel.stories.tsx
src/features/student/components/dashboard/NextLessonHero.stories.tsx
src/features/student/components/dashboard/OutstandingPayments.stories.tsx
src/features/coach/components/earnings/EarningsOverview.stories.tsx
src/features/notifications/components/NotificationsPopover.stories.tsx
```

**Also modify:** `tests/storybook-vrt.spec.ts` — append the new VRT IDs to the `stories` array.

**Verification:** `pnpm storybook` runs locally without errors; new stories render in sidebar; `npx tsc --noEmit` clean; `npx biome check` clean on all 13 touched files.

**Estimated effort:** ~90 min (Tier 1 UI primitives are 5 min each; Tier 2/3 are 10–15 min each with MSW).

### Plan 22-03: VRT Baseline Generation
**Outputs:**
- ~50–60 new PNG files in `tests/storybook-vrt.spec.ts-snapshots/`
- (already committed) `tests/storybook-vrt.spec.ts` IDs from 21-05 and 22-02

**Verification:** Run `pnpm test:vrt` (no `--update-snapshots`) and confirm all green; commit only the PNG diff; final `git status` shows clean working tree.

**Estimated effort:** ~30 min — most time is running `pnpm test:vrt --update-snapshots`, eyeballing the diff to ensure no rogue snapshots, then a clean re-run.

**Auto-approval policy applied:** Per orchestrator note, baseline PNG approval is human-needed UAT — auto-approve and document as deferred-visual-review in SUMMARY (a follow-up issue can request a human eyeball pass before declaring v2.0 final).

---

## File-by-File Change List

### New files (3 new code + 1 doc + ~50 PNGs)
- `docs/storybook-audit.md`
- `.storybook/mocks/security.browser.ts`
- 12 × `*.stories.tsx` (see Plan 22-02 list)
- ~50 × `tests/storybook-vrt.spec.ts-snapshots/*.png` (generated)

### Modified files (2)
- `.storybook/main.ts` (+15 lines: viteFinal block)
- `tests/storybook-vrt.spec.ts` (+~40 lines: new VRT IDs)

### Files NOT touched (constraints)
- `src/components/layout/AppSidebar.tsx` — PINNED per CLAUDE.md
- `src/components/layout/AppLayout.tsx` — PINNED per CLAUDE.md
- `src/lib/security.ts` — would be touched by the architectural fix, but that's deferred
- Any `*Queries.ts` file — same reason
- Any Prisma schema or migration

---

## Risks + Mitigations

| Risk                                                                 | Likelihood | Impact | Mitigation                                                                                                              |
|----------------------------------------------------------------------|------------|--------|-------------------------------------------------------------------------------------------------------------------------|
| `viteFinal` alias breaks production Storybook build differently      | LOW        | MED    | Test `pnpm storybook` (dev) AND `pnpm storybook:build` after change. Stub exports must match `src/lib/security.ts` shape (verified — list above is exhaustive). |
| New `*.stories.tsx` accidentally imports `node:crypto` again         | LOW        | LOW    | The stub now handles it. But add a quick `pnpm storybook:build` smoke after Plan 22-02.                                  |
| VRT baseline PNGs differ on CI vs. local (subpixel)                  | MED        | MED    | Existing config has `maxDiffPixelRatio: 0.01` (1% tolerance). Generate baselines locally on WSL — same env as Phase 21-05. CI alignment is a separate v2.1 concern. |
| 12-story backfill blows up effort estimate                           | MED        | LOW    | Plan 22-02 is scoped by file list, not by story count. If a single component needs >15 min of MSW work, descope it and pick a simpler Tier-2 alternative. |
| Audit doc becomes stale immediately                                  | HIGH       | LOW    | Document update process in `docs/storybook-audit.md` header + CONTRIBUTING.md note. Accept staleness — it's a baseline, not live state.                |
| Architectural fix (server-only split) gets forgotten                 | MED        | LOW    | File explicit GitHub issue / TODO during Plan 22-01 referencing this RESEARCH.md § randomBytes Blocker.                  |
| Pre-existing 20 VRT IDs accidentally re-baselined and changed        | LOW        | MED    | Use targeted `git add tests/storybook-vrt.spec.ts-snapshots/wardrobe-*.png` etc. — never `git add .`. Inspect diff before commit.|
| User wants 100% coverage and rejects 12-story scope                  | LOW        | HIGH   | This RESEARCH.md is explicit that 100% is multi-phase. If user pushes back, surface the 211-component gap and propose v2.1 plan structure. |

---

## Open Questions (Surface to Planner, not blockers)

1. **Q: Should pages be listed in `docs/storybook-audit.md`?**
   - A: Yes, in a separate "Pages" table marked N/A — completeness for STORY-04, but no backfill action. (Recommendation: include.)

2. **Q: Generate audit doc by hand or via script?**
   - A: By hand for v2.0. Script (`scripts/audit-stories.ts`) is a v2.1 polish item — premature for one phase that needs the doc *once*.

3. **Q: Architectural fix in this phase or v2.1?**
   - A: v2.1. The tactical viteFinal alias is sufficient for the phase's goal (unblock VRT). The architectural split touches 12+ files and changes type-import patterns across two routers — not appropriate for a v2.0 finalization sprint.

4. **Q: Should the audit doc include `src/hooks` and `src/lib`?**
   - A: No. STORY-04 explicitly scopes to `src/components/`, `src/features/*/components/`, and pages. Hooks/lib have no UI surface for Storybook to render.

5. **Q: Is 12 stories the right number — or should we aim for 20?**
   - A: 12 is the recommended sweet spot. 20 stories at avg 12 min each = 4 hours of pure story-writing, which doesn't fit a single phase plan. If after Plan 22-02 things go fast, the planner can stretch to 15. Don't go past 15 — diminishing returns + VRT baseline regen takes longer per story.

---

## Sources

### Primary (HIGH confidence)
- Local filesystem `find` output — all component counts (237), story counts (28), and import-site counts verified directly
- `src/lib/security.ts` source — verified `node:crypto` imports
- `src/features/admin/api/queries/wardrobeSettingsQueries.ts` — verified the value-import chain
- `src/features/wardrobe/components/admin/WardrobeSettingsForm.tsx:1,13-14` — verified `"use client"` + value import
- `.planning/phases/21-wardrobe-testing-seed-health/21-05-SUMMARY.md` lines 130, 138-146 — blocker reproduction confirmed pre-existing
- `.storybook/main.ts` + `.storybook/preview.tsx` + `tests/storybook-vrt.spec.ts` + `playwright-storybook.config.ts` — current config shape verified

### Secondary (MEDIUM confidence)
- [Storybook viteFinal docs](https://storybook.js.org/docs/api/main-config/main-config-vite-final) — verified `mergeConfig` + `resolve.alias` is the canonical pattern for module aliasing in Storybook 10.x
- [Storybook for Next.js with Vite docs](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite) — confirms `@storybook/nextjs-vite` uses Vite builder under the hood, so viteFinal applies
- [Vite issue #13504 — Module crypto externalized](https://github.com/vitejs/vite/issues/13504) — confirms `node:crypto` cannot be polyfilled by Vite for browser; aliasing the application-level entry point (not crypto itself) is the recommended pattern
- [Vite issue #14210 — randomUUID not exported](https://github.com/vitejs/vite/issues/14210) — same family of issue, same fix pattern
- [Next.js discussion #52652 — Sharing Zod schema](https://github.com/vercel/next.js/discussions/52652) — confirms the architectural fix (split server-only files from client-safe schemas) is the idiomatic Next.js pattern

### Tertiary (LOW confidence — judgment calls)
- Backfill priority assignments (Tier 1/2/3) — based on `grep` import counts + general v2.0-surface awareness. Other priority orderings are defensible. Planner should treat these as starting points, not hard requirements.

---

## Metadata

**Confidence breakdown:**
- Component inventory counts: **HIGH** — direct `find` output
- randomBytes diagnosis + fix: **HIGH** — full import graph traced, idiomatic Vite alias is well-documented
- Audit deliverable format: **MEDIUM** — proposed format is reasonable but other formats (JSON, auto-generated) would also satisfy STORY-04
- Backfill candidate list: **MEDIUM** — import counts are facts, but "high-leverage" includes judgment about future surface evolution
- Plan breakdown (3 plans): **MEDIUM** — fits parallel-wave structure used in Phase 21; 2 plans (combine 22-01 + 22-03) is a defensible alternative if user wants tighter scoping

**Research date:** 2026-05-29
**Valid until:** ~2026-06-30 — Storybook 10.x and the codebase are stable in this window; new components added between research and execution would invalidate the inventory counts but not the architectural recommendations
