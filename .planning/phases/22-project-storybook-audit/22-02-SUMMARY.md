---
phase: 22-project-storybook-audit
plan: 02
subsystem: testing-storybook
tags: [storybook, vrt, msw, story-05, ui-primitives, wardrobe, dashboard, notifications]

requires:
  - phase: 22-project-storybook-audit
    provides: viteFinal alias + browser stubs unblocking storybook:build; 22-RESEARCH §High-Leverage Backfill Candidates pre-identifying the 12 components
  - phase: 21-wardrobe-testing-seed-health
    provides: 13 wardrobe-* VRT IDs already in tests/storybook-vrt.spec.ts (append-only contract preserves them); canonical MSW + SessionProvider patterns from 10 wardrobe stories
provides:
  - 12 new .stories.tsx files (5 UI primitives + 3 wardrobe widgets + 4 dashboard/notification widgets)
  - 15 new VRT story IDs appended to tests/storybook-vrt.spec.ts (above the 12 minimum because Tier-1 primitives warranted multi-variant snapshots)
  - Storybook coverage moves 28 → 40 components storied (~17%); 33 → 48 VRT story IDs
  - Confirmed all 15 new IDs land in storybook-static/index.json after build (verified by bash loop)
affects:
  - 22-03 (VRT baseline generation — can now generate 13 wardrobe-* + 15 new IDs in a single pnpm test:vrt --update-snapshots pass)
  - v2.1 (NotificationsPopover open-state coverage deferred — requires play function or wrapper, see §Deviations)

tech-stack:
  added: []  # @hookform/resolvers, react-hook-form, zod, msw, msw-storybook-addon all pre-existing
  patterns:
    - "Storying-a-wrapper-not-the-bare-provider — `Form` is FormProvider<TFieldValues> generic, so meta.component points at a concrete wrapper (DefaultForm) and stories render their own scoped useForm. Avoids unresolvable generic in Meta<typeof Form>"
    - "Closed-Popover VRT vehicle — when a component encapsulates Popover with no defaultOpen escape hatch, snapshot the trigger surface (bell + badge). Open-state would need a Storybook play function (deferred to v2.1)"
    - "Hook-mocked dashboard stories — useCurrentUser is session-derived, so SessionProvider decorator suffices; useSession()-gated components like NotificationsPopover also need this wrapper to render at all"
    - "Component returns null when no data → omit explicit ZeroBalance variant from VRT (OutstandingPayments returns null when pendingPayments.length === 0; we ship a ZeroBalance story for Storybook discoverability but only WithUnread/Empty enter the VRT spec)"

key-files:
  created:
    - "src/components/ui/dialog.stories.tsx (3 stories)"
    - "src/components/ui/select.stories.tsx (4 stories)"
    - "src/components/ui/table.stories.tsx (3 stories)"
    - "src/components/ui/tabs.stories.tsx (3 stories)"
    - "src/components/ui/form.stories.tsx (3 stories)"
    - "src/features/wardrobe/components/DressStatusBadge.stories.tsx (7 stories — one per DressStatus enum)"
    - "src/features/wardrobe/components/BestFitBadge.stories.tsx (4 stories)"
    - "src/features/wardrobe/components/detail/DressImageCarousel.stories.tsx (3 stories)"
    - "src/features/student/components/dashboard/NextLessonHero.stories.tsx (3 stories, MSW + SessionProvider)"
    - "src/features/student/components/dashboard/OutstandingPayments.stories.tsx (4 stories, MSW + SessionProvider)"
    - "src/features/coach/components/earnings/EarningsOverview.stories.tsx (4 stories, MSW)"
    - "src/features/notifications/components/NotificationsPopover.stories.tsx (4 stories, MSW + SessionProvider)"
  modified:
    - "tests/storybook-vrt.spec.ts (+19 lines: section header + 15 new entries appended after the existing 33)"

key-decisions:
  - "Ship 15 VRT entries, not 12 — Tier-1 UI primitives (dialog/select/table) warrant multi-variant coverage because each ripples into 16-35 consumer components; the 12-cap was on COMPONENTS storied, not VRT IDs per-component. Plan §critical_constraints used '15 new entries — minimum 12 satisfied with extras' phrasing so we're contract-aligned."
  - "Story Form via wrapper components, not the bare FormProvider — `Form` is the react-hook-form FormProvider with FieldValues generic. `satisfies Meta<typeof Form>` fails because Storybook can't resolve the generic to a StoryObj args shape. Wrap in `DefaultForm`/`WithErrorsForm`/`SubmittingForm` and use Meta<typeof DefaultForm>. Composition is what consumers actually copy-paste anyway."
  - "Snapshot the closed Popover trigger for NotificationsPopover — the component encapsulates Popover with internal `const [open, setOpen] = useState(false)`. No defaultOpen escape hatch. Adding one would change the component contract for the sake of stories. The bell + unread badge IS the high-value visual surface (it's what users see in chrome 99% of the time); open-state coverage deferred to v2.1 (would need a Storybook play function clicking the bell)."
  - "Use `useEffect(() => { void form.trigger(); }, [form])` instead of `mode: 'onMount'` for WithErrors — react-hook-form v7 does NOT have 'onMount' as a valid mode value (only onBlur/onChange/onSubmit/onTouched/all). The useEffect-trigger pattern produces the same visible-errors VRT state without TS errors."
  - "Use `as any` (no biome suppression comment) for SessionProvider session mocks — matches existing UpcomingLessons.stories.tsx + StudentProgress.stories.tsx. Project's biome config doesn't flag `as any` in story files, so suppression comments register as 'unused' warnings."

patterns-established:
  - "Tier-1 UI primitive stories: zero TRPC, zero MSW, render() returns composition demo using Default + 2-3 visually distinct variants"
  - "Tier-2 wardrobe widget stories: pure args-driven (`args: { status: 'AVAILABLE' }`), one variant per enum value when applicable"
  - "Tier-3 dashboard widget stories: MSW handler in parameters.msw.handlers + SessionProvider decorator when component uses useCurrentUser/useSession; Loading variant always uses `async () => { await new Promise(() => {}); }` to keep the query in-flight"
  - "Picsum image seeds match scripts/seed-wardrobe.ts pattern (`https://picsum.photos/seed/<deterministic-key>/600/800`) so VRT screenshots are byte-stable across runs"

duration: 8min
completed: 2026-05-30
---

# Phase 22 Plan 02: 12 High-Leverage Storybook Stories + VRT IDs Summary

**12 new .stories.tsx files (44 stories total) shipped across UI primitives, wardrobe widgets, and dashboard surfaces — plus 15 VRT IDs appended to tests/storybook-vrt.spec.ts (above the 12 minimum because Tier-1 primitives warranted multi-variant snapshots). All 33 pre-existing VRT IDs preserved byte-identical.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-30T01:01:17Z
- **Completed:** 2026-05-30T01:09:13Z
- **Tasks:** 4
- **Files created:** 12
- **Files modified:** 1 (tests/storybook-vrt.spec.ts)

## Accomplishments

- **STORY-05 closed.** The 12 high-leverage components pre-identified in 22-RESEARCH §High-Leverage Backfill Candidates now have Storybook coverage. The selection was ROI-maximized: 5 UI primitives ripple into ~120 cumulative consumer import sites; 3 wardrobe widgets sit on the v2.0 paid surface; 4 dashboard widgets are front-page heroes across all 3 personas.
- **48 total VRT IDs.** Up from 33 (20 pre-21 + 13 wardrobe-* from 21-05). Plan 22-03 can now baseline-generate 28 missing PNGs (13 wardrobe-* + 15 new) in a single `pnpm test:vrt --update-snapshots` pass.
- **All 15 new IDs verified present in storybook-static/index.json.** The bash for-loop in Task 4 confirmed zero MISSING IDs after `./node_modules/.bin/storybook build` succeeded.
- **Zero new dependencies.** All of @storybook/react, msw, msw-storybook-addon, @hookform/resolvers, react-hook-form, zod were pre-existing.
- **TS-strict clean.** `npx tsc --noEmit` produces zero new errors (the only error remains the pre-existing `IceParticles.tsx` `three` types issue from before this phase).
- **No descopes.** All 12 components in the plan's `must_haves.artifacts` shipped at their exact frontmatter paths; no v2.1 follow-ups needed for the 12-cap.

## Task Commits

Each task was committed atomically with SPECIFIC files staged (never `git add .` or `-A`):

1. **Task 1: 5 Tier-1 UI primitive stories** — `8ba3a04` (feat)
2. **Task 2: 3 Tier-2 wardrobe widget stories** — `deea379` (feat)
3. **Task 3: 4 Tier-3 dashboard/notification stories** — `198cde6` (feat)
4. **Task 4: append 15 new story IDs to VRT spec** — `f90a8a1` (test)

## Files Created/Modified

### Tier 1 — UI Primitives (5 files, all zero-MSW)

- `src/components/ui/dialog.stories.tsx` — Default, WithLongContent, WithFooterActions. Uses `defaultOpen` so dialog renders for VRT.
- `src/components/ui/select.stories.tsx` — Default, WithSelection, Disabled, WithManyOptions. Snapshots the trigger (closed state); Radix portal makes the SelectContent harder to screenshot reliably.
- `src/components/ui/table.stories.tsx` — Default (5 rows), Empty (header only), WithManyRows (20 rows).
- `src/components/ui/tabs.stories.tsx` — Default (3 tabs), WithBadge (notification dot pattern), ManyTabs (8 sections).
- `src/components/ui/form.stories.tsx` — Default (clean), WithErrors (zod errors visible), Submitting (disabled inputs + Saving button). Wraps each story in its own component so the useForm hook stays scoped.

### Tier 2 — Wardrobe Widgets (3 files, all zero-MSW)

- `src/features/wardrobe/components/DressStatusBadge.stories.tsx` — Available, PendingApproval, Pending, Rented, Maintenance, Rejected, Archived (one per `DressStatus` enum).
- `src/features/wardrobe/components/BestFitBadge.stories.tsx` — HighFit (92), MediumFit (65), LowFit (38), Hidden (null returns nothing).
- `src/features/wardrobe/components/detail/DressImageCarousel.stories.tsx` — SingleImage, MultipleImages (5 picsum frames), EmptyState (placeholder icon).

### Tier 3 — Dashboard/Notification Widgets (4 files, all MSW-mocked TRPC)

- `src/features/student/components/dashboard/NextLessonHero.stories.tsx` — UpcomingLesson, NoUpcomingLessons, Loading. MSW stubs `api.student.profile.getStudentLessons` with `{status: SCHEDULED, startDate}` filter; SessionProvider provides `studentId`.
- `src/features/student/components/dashboard/OutstandingPayments.stories.tsx` — Default, MultiplePayments, ZeroBalance, Loading. MSW stubs `getStudentLessons` returning lessons with `Payment.status` filter; component returns null when all paid (ZeroBalance story illustrates that contract but its VRT counterpart is omitted).
- `src/features/coach/components/earnings/EarningsOverview.stories.tsx` — Default, NewCoach, HighEarnings, Loading. MSW stubs `api.coach.earnings.getEarningsSummary`. No SessionProvider needed (component reads only from the procedure response).
- `src/features/notifications/components/NotificationsPopover.stories.tsx` — WithUnread, AllRead, Empty, Loading. MSW stubs `api.notifications.notifications.getNotifications`; SessionProvider gates the component's `isAuthenticated` check.

### Modified — VRT Spec

- `tests/storybook-vrt.spec.ts` — +19 lines: section header comment + 15 new entries appended after the existing 33 (20 pre-21 + 13 wardrobe-*). All pre-existing entries preserved byte-identical.

## Verification

| Check                                                                                                                  | Result      |
| ---------------------------------------------------------------------------------------------------------------------- | ----------- |
| `find src/components/ui -name "*.stories.tsx" \| wc -l`                                                                | 10 (≥10)    |
| `find src/features/wardrobe/components -name "*.stories.tsx" \| wc -l`                                                 | 13 (≥13)    |
| All 4 Tier-3 files present at exact frontmatter paths                                                                  | YES         |
| `grep -c '^  "' tests/storybook-vrt.spec.ts`                                                                           | 48 (≥45)    |
| Pre-existing 20 + 13 wardrobe-* VRT IDs untouched (byte-identical, original positions)                                 | YES         |
| `npx tsc --noEmit` new errors                                                                                          | 0           |
| `npx biome check` on all 13 touched files                                                                              | clean       |
| `./node_modules/.bin/storybook build` exit code                                                                        | 0           |
| All 15 new IDs present in `storybook-static/index.json` (bash for-loop)                                                | 0 MISSING   |

## Decisions Made

1. **Ship 15 VRT entries, not 12.** Tier-1 UI primitives (dialog/select/table) ripple into 16-35 consumer components each, so multi-variant snapshots (`ui-dialog--default` + `ui-dialog--with-long-content`, `ui-table--default` + `ui-table--empty`) are worth more than single-variant per-component coverage. Plan §critical_constraints explicitly used "15 new entries — minimum 12 satisfied with extras" phrasing so we're contract-aligned. The 12-cap was on COMPONENTS storied (which still holds — exactly 12), not VRT IDs per-component.

2. **Story `Form` via wrapper components, not the bare FormProvider.** `Form` re-exports `react-hook-form`'s `FormProvider<TFieldValues>` generic. `satisfies Meta<typeof Form>` fails with `Control<{ name; email }, any, TFieldValues> is not assignable to Control<{ name; email }, any, { name; email }>` because Storybook can't resolve the generic to a concrete StoryObj args shape. Wrapping in `DefaultForm`/`WithErrorsForm`/`SubmittingForm` and using `Meta<typeof DefaultForm>` sidesteps the generic resolution. Composition demos are also what consumers actually copy-paste from Storybook anyway.

3. **Snapshot the closed Popover trigger for NotificationsPopover.** The component encapsulates Popover with internal `const [open, setOpen] = useState(false)` — no `defaultOpen` escape hatch. Adding one would change the component contract for the sake of stories. The bell icon + unread count badge IS the high-value visual surface (it's what users see in the chrome 99% of the time). Open-state coverage deferred to v2.1 (would need a Storybook play function clicking the bell).

4. **`useEffect(() => { void form.trigger(); }, [form])` instead of `mode: "onMount"` for WithErrors.** react-hook-form v7 mode values are `onBlur | onChange | onSubmit | onTouched | all` — there's no `"onMount"`. The useEffect-trigger pattern produces the same visible-errors VRT state without TS errors.

5. **Use bare `as any` (no biome suppression) for SessionProvider session mocks.** Matches existing UpcomingLessons.stories.tsx + StudentProgress.stories.tsx pattern. The project's biome config doesn't flag `as any` in story files, so adding `// biome-ignore lint/suspicious/noExplicitAny` produces unused-suppression warnings instead.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `mode: "onMount"` is not a valid react-hook-form v7 value**

- **Found during:** Task 1 (form.stories.tsx, WithErrors variant authoring)
- **Issue:** Initial draft used `useForm({ mode: "onMount", ... })` to trigger validation immediately. react-hook-form v7 mode union is `"onBlur" | "onChange" | "onSubmit" | "onTouched" | "all"` — no `"onMount"`. TS error: `Type '"onMount"' is not assignable to type '"onBlur" | "onChange" | "onSubmit" | "onTouched" | "all" | undefined'`.
- **Fix:** Replaced with `useEffect(() => { void form.trigger(); }, [form])` after instantiating the form. Same visible-errors VRT state, type-safe.
- **Files modified:** `src/components/ui/form.stories.tsx`
- **Verification:** `npx tsc --noEmit` zero new errors in form.stories.tsx.
- **Committed in:** `8ba3a04` (Task 1)

**2. [Rule 3 - Blocking] `satisfies Meta<typeof Form>` fails with generic-resolution TS error**

- **Found during:** Task 1 (form.stories.tsx, all 3 story exports)
- **Issue:** `Form` from `src/components/ui/form.tsx` is `FormProvider` re-exported from react-hook-form. It's `FormProvider<TFieldValues>` generic. Storybook's `Meta<typeof Form>` cannot resolve the generic, leading to errors like `Type 'Control<{name; email}, any, TFieldValues>' is not assignable to type 'Control<{name; email}, any, {name; email}>'` on every FormField usage AND `Type '{ render: () => JSX.Element; }' is not assignable to type 'StoryAnnotations<ReactRenderer, ...>'` on every Story export.
- **Fix:** Restructured story to wrap each variant in its own concrete component (`DefaultForm`, `WithErrorsForm`, `SubmittingForm`) and use `Meta<typeof DefaultForm>` for the meta declaration. The wrapper components instantiate their own scoped useForm hook and render Form with its children. Stories use `render: () => <DefaultForm />` etc.
- **Files modified:** `src/components/ui/form.stories.tsx`
- **Verification:** `npx tsc --noEmit` zero errors in form.stories.tsx; `pnpm storybook:build` emits `ui-form--default` etc to index.json.
- **Committed in:** `8ba3a04` (Task 1)

**3. [Rule 1 - Bug] Biome flagged 3 unused suppression comments on `// biome-ignore lint/suspicious/noExplicitAny`**

- **Found during:** Task 3 verification (`npx biome check` on Tier-3 stories)
- **Issue:** SessionProvider mocks need `as any` to bypass next-auth's strict session type. Added `// biome-ignore lint/suspicious/noExplicitAny: storybook session mock` above each. Biome flagged all 3 as "Suppression comment has no effect" — the project's biome config doesn't flag `as any` in story files (verified by existing UpcomingLessons.stories.tsx + StudentProgress.stories.tsx using bare `as any` and passing biome check).
- **Fix:** Removed all 3 suppression comments. Kept the `as any` cast (matches existing pattern).
- **Files modified:** `src/features/student/components/dashboard/NextLessonHero.stories.tsx`, `src/features/student/components/dashboard/OutstandingPayments.stories.tsx`, `src/features/notifications/components/NotificationsPopover.stories.tsx`
- **Verification:** `npx biome check` on all 4 Tier-3 files: zero warnings/errors.
- **Committed in:** `198cde6` (Task 3)

**4. [Rule 1 - Bug] Biome formatter reflowed imports and inline objects on Tier-1 stories**

- **Found during:** Task 1 verification (`npx biome check`)
- **Issue:** Initial drafts of dialog/select/table/tabs/form.stories.tsx used multi-line object literals and import lists that biome's 100-char-width formatter wanted reformatted (collapsed to single-line where they fit, reordered import statements alphabetically).
- **Fix:** Ran `npx biome check --write` to auto-apply the formatter. Three files modified (form.stories.tsx, select.stories.tsx, table.stories.tsx). Semantics byte-identical.
- **Files modified:** Same 3 files (auto-formatted)
- **Verification:** Re-ran `npx biome check`, exited 0.
- **Committed in:** `8ba3a04` (Task 1, after biome --write)

---

**Total deviations:** 4 auto-fixed (2 bugs [Rule 1 × 2], 1 blocking [Rule 3], 1 cosmetic/biome [Rule 1])
**Impact on plan:** All four fixes were necessary for clean tsc + biome. #1 and #2 are react-hook-form/Storybook generic-resolution gotchas that the plan could not have predicted at write time. #3 is project-convention alignment (existing stories don't use the suppression). #4 is pure formatter-driven cosmetic. None of these required scope changes — all 12 components shipped at their frontmatter paths.

## Authentication Gates

None — Storybook build is fully local and self-contained.

## Issues Encountered

1. **`pnpm storybook:build` wrapper fails on `verify-deps-before-run`** — same pre-existing pnpm 11.2.2 quirk documented in Phase 21-05 + 22-01 SUMMARYs. Worked around by invoking `./node_modules/.bin/storybook build -o storybook-static` directly, same exit-code semantics. Not introduced by this plan.

2. **Untracked `.planning/ROADMAP.md` modification observed in `git status`** — per plan reminders, did NOT touch ROADMAP.md. The modification (whatever it is) was pre-existing in the working tree before this plan started. Did not stage it in any commit.

## User Setup Required

None. Zero new dependencies, zero env-var changes, zero schema/migration changes.

## Next Phase Readiness

- **Plan 22-03** (VRT baseline generation) is now fully unblocked. The full backlog is 28 missing baseline PNGs:
  - 13 wardrobe-* IDs from Phase 21-05 (committed to spec but no PNGs ever generated)
  - 15 new IDs from this plan
  
  All can be generated in a single `pnpm test:vrt --update-snapshots` pass once 22-03 starts.

- **Phase 22 status:** 2/3 plans shipped. Phase complete after 22-03 lands the PNG baselines.

### Concerns

- **NotificationsPopover open-state coverage gap.** The 4 stories snapshot the closed trigger (bell + badge). The actual popover content (notification list) is only visible after a click. v2.1 follow-up: add a Storybook play function to click the bell, OR refactor NotificationsPopover to accept an optional `defaultOpen` prop for storybook-only use. Documenting here so future contributors find it.

- **Picsum-sourced VRT images.** DressImageCarousel stories use `https://picsum.photos/seed/<key>/600/800`. The seed pattern produces deterministic images for a given seed string, but picsum.photos requires network access at VRT-screenshot time. If 22-03's CI environment doesn't allow outbound network, the carousel stories will screenshot a broken-image placeholder. 21-05's wardrobe stories use the same pattern so this isn't new — but flagging for awareness.

- **storybook-static/ is build artifact, not committed.** Verified `storybook-static/` is `.gitignore`'d (existed before this plan; not touched by us). Plan 22-03 will regenerate the static build before running test:vrt, so this is fine.

---

_Phase: 22-project-storybook-audit_
_Completed: 2026-05-30_
