---
phase: 22-project-storybook-audit
plan: 03
subsystem: testing-vrt
tags: [storybook, vrt, playwright, baselines, png-snapshots, visual-regression, story-06]

requires:
  - phase: 22-project-storybook-audit
    provides: viteFinal alias making `storybook build` exit 0 (22-01); 12 new .stories.tsx files + 15 new VRT IDs in tests/storybook-vrt.spec.ts (22-02)
  - phase: 21-wardrobe-testing-seed-health
    provides: 13 wardrobe-* VRT story IDs pre-committed to tests/storybook-vrt.spec.ts in Plan 21-05 (PNGs deferred to this phase)
provides:
  - 28 new PNG baseline files committed under tests/storybook-vrt.spec.ts-snapshots/
  - Total VRT PNG count: 48 (20 pre-21 + 28 new = full coverage for all 48 VRT story IDs)
  - Determinism proof: post-commit `playwright test -c playwright-storybook.config.ts` exits 0 with 48/48 passing
  - STORY-06 closure (visual regression baselines locked for all newly-backfilled stories)
  - Phase 22 closure — final plan of v2.0 milestone
affects:
  - v2.1 (UI changes will fail VRT until baselines are intentionally updated via `--update-snapshots` + explicit user review)
  - v2.1 (deferred-visual-review followup — user UAT pass before declaring v2.0 final, per orchestrator auto-approval policy)
  - v2.1 (NotificationsPopover open-state story coverage — requires play function or wrapper, deferred from 22-02)

tech-stack:
  added: []  # PNG-only changes; zero new dependencies, zero code edits, zero schema changes
  patterns:
    - "Single-pass baseline generation across cohorts — one `--update-snapshots` invocation regenerates BOTH backlog (13 wardrobe-* from 21-05) AND new (15 from 22-02) baselines under identical Storybook build, Playwright runtime, OS, and font conditions; guarantees atomic baseline state per Phase 22"
    - "Targeted git-add via per-ID glob patterns (NEVER `git add .` or `-A`) — 25 individual `git add tests/storybook-vrt.spec.ts-snapshots/<id>*.png` invocations enumerate each cohort explicitly; defense against accidental staging of storybook-static/ or .vrt-tmp/"
    - "Two-run determinism gate — Step 1 `--update-snapshots` writes baselines; Step 4 no-flags rerun proves they're stable (zero pixel diffs at 1% maxDiffPixelRatio); ANY flake here surfaces to user rather than masking with tolerance bumps"
    - "Pre-21 baseline preservation invariant — `--update-snapshots` regenerates ALL baselines, but only the 28 truly-new ones changed; the 20 existing pre-21 PNGs remained byte-identical (zero ` M ` entries in git status post-regen), confirming viteFinal alias (22-01) introduced no rendering side-effects"

key-files:
  created:
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-catalog-dresscard--default-linux.png (21-05 backlog)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-catalog-dresscard--with-best-fit-score-linux.png (21-05 backlog)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-catalog-wardrobefilterbar--default-linux.png (21-05 backlog)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-catalog-cataloggrid--populated-linux.png (21-05 backlog)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-catalog-cataloggrid--empty-linux.png (21-05 backlog)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-measurementform--prefilled-linux.png (21-05 backlog)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-detail-dressdetailhero--default-linux.png (21-05 backlog)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-detail-fitcheckcard--all-green-linux.png (21-05 backlog)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-request-rentalstatusbadge--pending-linux.png (21-05 backlog)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-request-rentalstatusbadge--approved-linux.png (21-05 backlog)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-request-requestrentaldialog--open-linux.png (21-05 backlog)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-admin-pendingapprovalqueue--default-linux.png (21-05 backlog)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-consigner-consignerearningstable--default-linux.png (21-05 backlog)"
    - "tests/storybook-vrt.spec.ts-snapshots/ui-dialog--default-linux.png (22-02 Tier-1)"
    - "tests/storybook-vrt.spec.ts-snapshots/ui-dialog--with-long-content-linux.png (22-02 Tier-1)"
    - "tests/storybook-vrt.spec.ts-snapshots/ui-select--default-linux.png (22-02 Tier-1)"
    - "tests/storybook-vrt.spec.ts-snapshots/ui-table--default-linux.png (22-02 Tier-1)"
    - "tests/storybook-vrt.spec.ts-snapshots/ui-table--empty-linux.png (22-02 Tier-1)"
    - "tests/storybook-vrt.spec.ts-snapshots/ui-tabs--default-linux.png (22-02 Tier-1)"
    - "tests/storybook-vrt.spec.ts-snapshots/ui-form--default-linux.png (22-02 Tier-1)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-dressstatusbadge--available-linux.png (22-02 Tier-2)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-dressstatusbadge--rented-linux.png (22-02 Tier-2)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-bestfitbadge--high-fit-linux.png (22-02 Tier-2)"
    - "tests/storybook-vrt.spec.ts-snapshots/wardrobe-detail-dressimagecarousel--multiple-images-linux.png (22-02 Tier-2)"
    - "tests/storybook-vrt.spec.ts-snapshots/student-dashboard-nextlessonhero--upcoming-lesson-linux.png (22-02 Tier-3)"
    - "tests/storybook-vrt.spec.ts-snapshots/student-dashboard-outstandingpayments--default-linux.png (22-02 Tier-3)"
    - "tests/storybook-vrt.spec.ts-snapshots/coach-earnings-earningsoverview--default-linux.png (22-02 Tier-3)"
    - "tests/storybook-vrt.spec.ts-snapshots/notifications-notificationspopover--with-unread-linux.png (22-02 Tier-3)"
  modified: []  # Zero modifications to pre-existing PNG baselines; zero code edits

key-decisions:
  - "Use direct `./node_modules/.bin/playwright test -c playwright-storybook.config.ts --update-snapshots` to sidestep the pnpm 11.2.2 ERR_PNPM_IGNORED_BUILDS wrapper blocker (same precedent as Phases 20-03, 21-02, 22-01, 22-02)"
  - "Stage via 25 targeted `git add tests/storybook-vrt.spec.ts-snapshots/<id>*.png` invocations (NEVER `git add .` or `-A`) — the trailing `*.png` glob matches Playwright's auto-suffix pattern (`-linux.png` on this OS); zero risk of staging storybook-static/ or .vrt-tmp/"
  - "Accept the auto-approval policy for PNG baselines (per 22-RESEARCH §Auto-approval policy applied + plan §must_haves.truths #7) — visual review deferred to user UAT as a soft v2.1 followup"
  - "Single Storybook build + single VRT pass for both cohorts — guarantees atomic baseline state under identical runtime conditions; the alternative (separate passes per cohort) would risk subtle font/render drift between cohorts"

patterns-established:
  - "Cohort enumeration in commit message — call out BOTH cohorts by source plan (`13 wardrobe-* IDs from Phase 21-05 + 15 new IDs from Phase 22-02 backfill`) so reviewers see what changed and why in one commit"
  - "Targeted-add safety dance: stage → `git diff --cached --name-only` audit → 4-way DANGER check (storybook-static, node_modules-storybook, .vrt-tmp, spec re-stage) → outside-snapshots-dir guard → commit. Each step is a verifiable echo."
  - "Two-run determinism gate: `--update-snapshots` pass writes baselines, immediate no-flags rerun confirms determinism BEFORE commit. If the second pass diffs, the baselines are flaky and need investigation, not silent acceptance."
  - "Pre-existing baseline preservation invariant: track ` M ` entries in `git status --porcelain tests/storybook-vrt.spec.ts-snapshots/` after regen. ZERO modified is the green-path outcome — any modified pre-existing baseline indicates either a Phase 22 side-effect (alias-induced render change) or an unrelated UI regression that escaped review. This plan saw zero ` M ` entries — clean."

duration: 4min
completed: 2026-05-30
---

# Phase 22 Plan 03: VRT Baseline Generation Summary

**28 new PNG baselines committed in a single atomic pass — 13 wardrobe-* backlog from Phase 21-05 plus 15 new IDs from Phase 22-02 backfill — bringing VRT total coverage from 20 to 48 PNGs across the project's storied component surface; post-commit `playwright test` exits 0 with 48/48 passing, proving deterministic re-runs.**

## Performance

- **Duration:** ~4 min (209s wall-clock from pre-flight through final commit)
- **Started:** 2026-05-30T01:13:44Z
- **Completed:** 2026-05-30T01:17:13Z
- **Tasks:** 4
- **Files created:** 28 (all PNG baselines)
- **Files modified:** 0 (zero pre-existing PNG modifications; zero code edits)

## Accomplishments

- **STORY-06 closed.** VRT baseline coverage now exists for ALL 48 VRT story IDs in `tests/storybook-vrt.spec.ts`. Re-runs are deterministic (post-commit `playwright test` exits 0 with 48/48 passing in 48.2s).
- **21-05 backlog cleared.** The 13 wardrobe-* IDs that 21-05 committed to the spec but couldn't baseline (blocked on the randomBytes Vite error that 22-01 fixed) now have PNGs.
- **22-02 baselines locked.** The 15 new VRT IDs from 22-02's 12 .stories.tsx files (5 UI primitives + 3 wardrobe widgets + 4 dashboard/notification widgets) now have PNGs.
- **Pre-21 baseline preservation invariant held cleanly.** The 20 pre-existing baselines (ui-button--*, ui-card--*, ui-badge--*, ui-skeleton--*, admin-dashboard-*, admin-analytics-*, coach-dashboard-*, student-dashboard-*, scheduling-fceventcontent--*) remained byte-identical through the `--update-snapshots` pass. ZERO ` M ` entries in `git status --porcelain` post-regen. This confirms the viteFinal alias from 22-01 introduced no rendering side-effects on previously-storied components.
- **Targeted-add safety dance worked perfectly.** Twenty-five individual `git add` invocations staged exactly 28 PNGs (13 from cohort 1 + 15 from cohort 2). Final `git diff --cached --name-only | grep -v "^tests/storybook-vrt.spec.ts-snapshots/"` returned EMPTY — no contamination from storybook-static/, .vrt-tmp/, node_modules-storybook/, or the spec file itself.
- **Phase 22 complete.** 22-01 (audit + Vite fix) + 22-02 (12 stories + 15 VRT IDs) + 22-03 (28 PNG baselines) = phase shipped end-to-end.
- **v2.0 milestone complete.** This was the last plan of Phase 22, which was the last phase of v2.0. The wardrobe end-to-end product surface — discovery → fit-match → request → admin lifecycle → consignment payouts → notifications → tests + seed + health + storybook + VRT — is locked.

## Task Commits

Single atomic commit per plan policy (PNG-only changes, no per-task split needed since all 4 tasks are sequential phases of a single baseline generation flow):

1. **Tasks 1-4: pre-flight + `--update-snapshots` + targeted-add + verify-rerun + commit** — `8e9cc90` (test) — 28 files changed, 0 insertions, 0 deletions (binary PNGs only)

Note: Plan body suggested per-task commits, but the canonical flow is "regen → stage → re-verify → single commit" because the staged PNGs are a single coherent artifact (the baseline set at this point in time). Splitting across multiple commits would create intermediate states where some IDs have baselines and others don't.

## Files Created/Modified

**Created (28 PNG baselines):**

### 13 wardrobe-* baselines from Phase 21-05 backlog

| Story ID | Component |
| --- | --- |
| `wardrobe-catalog-dresscard--default` | DressCard (catalog card primitive) |
| `wardrobe-catalog-dresscard--with-best-fit-score` | DressCard with BestFitBadge variant |
| `wardrobe-catalog-wardrobefilterbar--default` | WardrobeFilterBar sticky controls |
| `wardrobe-catalog-cataloggrid--populated` | CatalogGrid keystone (populated state) |
| `wardrobe-catalog-cataloggrid--empty` | CatalogGrid empty state |
| `wardrobe-measurementform--prefilled` | MeasurementForm prefilled with student profile |
| `wardrobe-detail-dressdetailhero--default` | DressDetailHero on /wardrobe/[id] |
| `wardrobe-detail-fitcheckcard--all-green` | FitCheckCard all-green variant |
| `wardrobe-request-rentalstatusbadge--pending` | RentalStatusBadge PENDING |
| `wardrobe-request-rentalstatusbadge--approved` | RentalStatusBadge APPROVED |
| `wardrobe-request-requestrentaldialog--open` | RequestRentalDialog open state |
| `wardrobe-admin-pendingapprovalqueue--default` | PendingApprovalQueue admin surface |
| `wardrobe-consigner-consignerearningstable--default` | ConsignerEarningsTable consigner surface |

### 15 new baselines from Phase 22-02 backfill (5 Tier-1 + 3 Tier-2 + 4 Tier-3)

**Tier-1 UI primitives (7 baselines across 5 components):**

| Story ID | Component |
| --- | --- |
| `ui-dialog--default` | Dialog primitive |
| `ui-dialog--with-long-content` | Dialog with long content |
| `ui-select--default` | Select primitive |
| `ui-table--default` | Table primitive |
| `ui-table--empty` | Table empty state |
| `ui-tabs--default` | Tabs primitive |
| `ui-form--default` | Form composition demo |

**Tier-2 wardrobe widgets (4 baselines across 3 components):**

| Story ID | Component |
| --- | --- |
| `wardrobe-dressstatusbadge--available` | DressStatusBadge AVAILABLE |
| `wardrobe-dressstatusbadge--rented` | DressStatusBadge RENTED |
| `wardrobe-bestfitbadge--high-fit` | BestFitBadge high-fit variant |
| `wardrobe-detail-dressimagecarousel--multiple-images` | DressImageCarousel with 5 picsum frames |

**Tier-3 dashboard/notification widgets (4 baselines across 4 components):**

| Story ID | Component |
| --- | --- |
| `student-dashboard-nextlessonhero--upcoming-lesson` | NextLessonHero (MSW + SessionProvider) |
| `student-dashboard-outstandingpayments--default` | OutstandingPayments (MSW + SessionProvider) |
| `coach-earnings-earningsoverview--default` | EarningsOverview (MSW) |
| `notifications-notificationspopover--with-unread` | NotificationsPopover (MSW + SessionProvider, closed Popover trigger) |

**Modified:** None. Zero code edits. Zero schema changes. Zero pre-existing PNG modifications.

## Verification

| Check | Expected | Actual |
| --- | --- | --- |
| All 5 pre-flight checks pass (22-01 stub, viteFinal block, audit doc, 12 story files, 48 VRT IDs) | YES | YES |
| `storybook build` exits 0 | YES | YES (Vite built in 13.73s) |
| `playwright test --update-snapshots` exit code | 0 | 0 (48 passed in 50.4s) |
| New PNGs untracked after regen | at least 25 | 28 |
| Pre-existing PNGs modified (` M ` entries) | 0 (ideal) | 0 (clean) |
| Files staged via targeted git-add | at least 25, all under `tests/storybook-vrt.spec.ts-snapshots/` | 28, 100% in snapshots dir |
| DANGER check #1: `storybook-static/` not staged | OK | OK |
| DANGER check #2: `node_modules-storybook/` not staged | OK | OK |
| DANGER check #3: `.vrt-tmp/` not staged | OK | OK |
| DANGER check #4: spec file not re-staged | OK | OK |
| Files staged outside snapshots dir | 0 | 0 |
| Post-commit `playwright test` (no flags) exit code | 0 | 0 (48 passed in 48.2s) |
| Total PNGs in committed tree | at least 45 | 48 (20 pre-21 + 28 new) |
| Working tree clean post-commit (modulo build dirs + pre-existing planning untracked) | YES | YES |

## Decisions Made

1. **Single atomic commit for all 28 PNGs.** The plan body sketched per-task commits, but the canonical shape of a baseline generation is "regen → stage → re-verify → single commit" — splitting across multiple commits would create intermediate states where some VRT IDs have baselines and others don't, which would break `playwright test` on intermediate checkouts. The 4 "tasks" in the plan are sequential phases of one operation, not independently revertable units.

2. **Direct `./node_modules/.bin/playwright test` invocation.** The `pnpm test:vrt` wrapper fails on `verify-deps-before-run` due to the same pnpm 11.2.2 ERR_PNPM_IGNORED_BUILDS quirk documented in Phases 20-03, 21-02, 22-01, and 22-02. Sidestepping via direct binary call has identical semantics and zero data-safety risk.

3. **Auto-approve PNG baselines per orchestrator policy.** Per 22-RESEARCH §Auto-approval policy and plan §must_haves.truths #7, this plan auto-approves all 28 baselines without per-PNG visual review. Surfaced as a soft v2.1 followup if user wants a human eyeball pass before declaring v2.0 final.

## Deviations from Plan

### Process Deviations

**1. Single atomic commit instead of 4 per-task commits**

- **Found during:** Task 4 commit step (the plan body sketches a per-task commit cadence, but the work product is a single coherent baseline set)
- **Issue:** Plan body's per-task split would create intermediate commits where pre-flight checks ran but no PNGs were written, or PNGs were generated but not staged, etc. None of those intermediate states is independently meaningful — they're stages of one baseline-regen operation.
- **Fix:** Single `test(22-03)` commit at the end captures all 28 PNGs atomically. Commit message enumerates both cohorts so reviewers see what changed.
- **Files modified:** N/A (process choice, not code)
- **Verification:** `git log --oneline -1` shows one commit (`8e9cc90`) with all 28 PNGs.
- **Committed in:** `8e9cc90`
- **Rationale:** Mirrors how Phase 20-03 + 21-05 handled multi-file additive deliverables — atomic-commit-of-the-deliverable rather than mechanically-commit-per-task. STATE.md was not touched in the commit because that's the orchestrator's metadata commit.

### Auto-fixed Issues

None — PNG-only changes, no code, no schema, no env. The plan executed exactly as the high-level shape intended; the only adjustment was atomicity (which is a process decision, not a code fix).

---

**Total deviations:** 1 process deviation (atomic-commit-of-deliverable instead of per-task commits)
**Impact on plan:** Zero functional impact. All 28 PNGs landed in a single coherent commit; all success criteria satisfied. The atomic shape is arguably MORE correct than per-task because the baseline set IS one coherent artifact.

## Authentication Gates

None — fully local Storybook build + Playwright headless rendering, no external services.

## Issues Encountered

1. **`pnpm test:vrt` wrapper fails on `verify-deps-before-run`** — same pre-existing pnpm 11.2.2 ERR_PNPM_IGNORED_BUILDS quirk documented in Phases 20-03, 21-02, 22-01, and 22-02. Worked around via direct `./node_modules/.bin/playwright test -c playwright-storybook.config.ts` (and analogously `./node_modules/.bin/storybook build` for the smoke test). Same exit-code semantics, same effective output. Not introduced by this plan.

2. **Pre-existing untracked planning files in working tree.** `git status --porcelain` showed `.planning/ROADMAP.md` modified plus several planning .md files untracked (22-RESEARCH, 22-01/02/03-PLAN, 17-RESEARCH, graphify-out/). Per plan reminders (`Do NOT touch ROADMAP.md`) these were left untouched and NOT staged by any of the 25 targeted `git add` invocations. The targeted glob patterns are too narrow to accidentally catch them.

## User Setup Required

None. Zero new dependencies, zero env-var changes, zero schema/migration changes. The 28 new PNG baselines are committed and will be re-validated by every future `pnpm test:vrt` run.

## Deferred-Visual-Review Flag

**PNG approvals were auto-accepted per orchestrator policy.** Per 22-RESEARCH §Auto-approval policy and plan §must_haves.truths #7, the 28 baselines committed in this plan represent the canonical visual state of those components at the time of generation, but a human eyeball pass was deferred. If desired before declaring v2.0 final:

- Run `pnpm storybook` and visually verify each of the 28 stories in the browser
- Compare against the committed PNGs in `tests/storybook-vrt.spec.ts-snapshots/` via image preview
- If any baselines look broken/incorrect, file a v2.1 followup to regenerate that specific PNG with the fix

This is a soft followup, not a blocker. The baselines are technically correct (they match the rendered output of the storybook build at this commit hash), but they have not been subjectively reviewed for "looks right".

## Next Phase Readiness

**Phase 22 is closed. v2.0 milestone is closed.** No further phases planned.

**v2.1 candidates surfaced from Phase 22 deferrals:**

1. **Architectural server-only `.schema.ts` split** per 22-RESEARCH §Recommended Fix: Two-Layer Strategy (Architectural). Long-term replacement for the viteFinal alias workaround landed in 22-01. TODO comment in `.storybook/main.ts` points contributors to the research doc.

2. **Audit-doc generation script** (`scripts/audit-stories.ts`) — per 22-01 §Concerns, the 237-component audit is hand-written and will drift as components are added/removed. Scripting the inventory walker is a polish task.

3. **Remaining ~200 components for full Storybook coverage.** Current coverage is 40 storied components / 237 total = ~17%. Most of the remaining 197 are page-level surfaces (39 N/A pages) or low-leverage internal helpers; the high-ROI 12 are now covered.

4. **NotificationsPopover open-state story coverage** — per 22-02 §Concerns, the 4 NotificationsPopover stories snapshot the closed bell trigger; open-state coverage of the notification list would need a Storybook play function or a `defaultOpen` prop refactor.

5. **Picsum-sourced VRT images** — DressImageCarousel + 21-05's wardrobe stories use `https://picsum.photos/seed/<key>/600/800`. The seed pattern is deterministic but requires outbound network at VRT-screenshot time. If a future CI environment blocks outbound HTTPS, these stories will screenshot broken-image placeholders. Surface for awareness; defer until it actually breaks.

6. **Human-eyeball visual review pass on the 28 auto-approved baselines** (the deferred-visual-review flag above) — recommended before declaring v2.0 final to user-facing channels.

### Concerns

- **Picsum-sourced PNG stability across re-runs.** The 28 baselines were generated with deterministic picsum seeds, but picsum.photos is a third-party service. If picsum changes its image rendering or returns different bytes for a given seed in the future, those specific baselines (DressImageCarousel, the carousels embedded in DressDetailHero) would diff on the next `pnpm test:vrt` run. Mitigation: 1% maxDiffPixelRatio tolerance should absorb sub-pixel font/render noise, and the worst case is a single `--update-snapshots` re-run to lock the new state.

- **Storybook 10 + Vite + pnpm strict resolution coupling.** The viteFinal alias workaround landed in 22-01 means any future bump of `@storybook/nextjs-vite` or `vite` could change resolution behavior. If `pnpm storybook:build` starts failing again after a dep update, refer to 22-RESEARCH and 22-01 SUMMARY for the alias mutation pattern.

- **Atomic commit shape vs per-task commit cadence.** This plan deviated from the per-task commit cadence used by every other Phase 22 plan. Documented in §Deviations as the right call for a single-artifact deliverable, but worth flagging so future similar plans (multi-file PNG/binary artifact generation) follow the same atomic-of-deliverable pattern rather than reverting to per-task splits.

---

_Phase: 22-project-storybook-audit_
_Completed: 2026-05-30_
_v2.0 milestone: CLOSED_
