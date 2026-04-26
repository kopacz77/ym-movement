# Visual Coherence Audit & Optimization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Systematically audit and fix visual inconsistencies across all dashboard and feature components, using Storybook for isolated verification, Playwright CLI for full-page validation, and Stitch HTML mockups as the design reference.

**Architecture:** Three-pass approach — (1) expand VRT coverage so we have a safety net, (2) fix design token and component coherence issues, (3) verify with VRT + Playwright screenshots that everything is visually correct and consistent.

**Tech Stack:** Storybook 10 (localhost:6006), Playwright CLI, MSW for TRPC mocking, Tailwind CSS, Stitch HTML mockups in `docs/stitch-designs/`

---

## Context for Fresh Session

### Key Commands
- `pnpm storybook` — launches component library at localhost:6006
- `pnpm test:vrt` — builds Storybook static + runs Playwright VRT tests
- `pnpm dev` — dev server at localhost:3100

### Key Files
- **Storybook config:** `.storybook/main.ts`, `.storybook/preview.tsx`
- **VRT test:** `tests/storybook-vrt.spec.ts` (currently covers 10 of 18+ stories)
- **VRT baselines:** `tests/storybook-vrt.spec.ts-snapshots/`
- **MSW handlers:** `src/test/msw/handlers.ts`, `src/test/msw/fixtures/`
- **TRPC decorator:** `.storybook/decorators/TRPCDecorator.tsx`
- **Design reference:** `docs/stitch-designs/*.html` (6 HTML mockups)
- **Design tokens:** `src/styles/globals.css`, `tailwind.config.js`
- **Base card:** `src/components/ui/card.tsx`

### Stitch Design Files (Reference)
- `docs/stitch-designs/02-admin-dashboard.html` — Admin dashboard layout
- `docs/stitch-designs/03-student-dashboard.html` — Student dashboard
- `docs/stitch-designs/04-coach-dashboard.html` — Coach dashboard
- `docs/stitch-designs/06-admin-calendar.html` — Calendar view

### Current Story Files (18 total)
**UI Primitives (5):**
- `src/components/ui/button.stories.tsx`
- `src/components/ui/card.stories.tsx`
- `src/components/ui/badge.stories.tsx`
- `src/components/ui/input.stories.tsx`
- `src/components/ui/skeleton.stories.tsx`

**Admin Dashboard (6):**
- `src/features/admin/components/dashboard/SmartKPICards.stories.tsx`
- `src/features/admin/components/dashboard/TodayTimeline.stories.tsx`
- `src/features/admin/components/dashboard/QuickActions.stories.tsx`
- `src/features/admin/components/dashboard/ActivityFeed.stories.tsx`

**Admin Analytics (3):**
- `src/features/admin/components/analytics/RevenueChart.stories.tsx`
- `src/features/admin/components/analytics/StudentActivityChart.stories.tsx`
- `src/features/admin/components/analytics/RevenueBreakdownChart.stories.tsx`

**Coach Dashboard (3):**
- `src/features/coach/components/dashboard/CoachOverviewCards.stories.tsx`
- `src/features/coach/components/dashboard/CoachUpcomingLessons.stories.tsx`
- `src/features/coach/components/dashboard/CoachPastLessons.stories.tsx`

**Student Dashboard (2):**
- `src/features/student/components/dashboard/UpcomingLessons.stories.tsx`
- `src/features/student/components/dashboard/StudentProgress.stories.tsx`

**Calendar (1):**
- `src/features/scheduling/components/calendar/FCEventContent.stories.tsx`

---

## Known Visual Coherence Issues

### Shadow Inconsistencies
| Component | Current | Should Be |
|-----------|---------|-----------|
| Base card (`card.tsx`) | `shadow-multi` | ✅ Correct (reference) |
| SmartKPICards hover | Custom `shadow-[0_2px_8px...,0_12px_36px...]` | Standardize to one hover shadow |
| CoachOverviewCards hover | Same custom shadow as KPI | Match SmartKPICards |
| ActivityFeed items | `shadow-sm` | `shadow-multi` or none (inside card) |
| QuickActions links | `shadow-sm` | Match ActivityFeed |

### Hover Effect Inconsistencies
| Component | Current | Should Be |
|-----------|---------|-----------|
| SmartKPICards | `-translate-y-1` | Standardize |
| CoachOverviewCards | `-translate-y-1` | Match SmartKPICards |
| TodayTimeline blocks | `-translate-y-0.5` | `-translate-y-1` (match others) |
| QuickActions | `hover:scale-[1.02]` | `-translate-y-1` (match others) |

### Border Inconsistencies
| Component | Current | Should Be |
|-----------|---------|-----------|
| Base card | `border-border/30` | ✅ Correct |
| TodayTimeline blocks | Opaque colored borders (`border-blue-300`) | Tinted but subtle borders |
| UpcomingLessons cards | `border` only (default) | `border-border/30` |
| StudentProgress stats | No border (bg only) | Add `border-border/30` |

### Padding Inconsistencies
| Component | Current | Should Be |
|-----------|---------|-----------|
| SmartKPICards | `p-6` | ✅ Correct |
| StudentProgress | `p-4` | `p-6` (match system) |
| UpcomingLessons | `p-6` outer, `pb-3` header | Standardize header padding |

### Color Inconsistencies
| Component | Current | Should Be |
|-----------|---------|-----------|
| ActivityFeed icons | Saturated 500 colors | Muted backgrounds (50/100) with 600 icons |
| StudentProgress stats | Mixed tokens + direct colors | Consistent token usage |
| UpcomingLessons "View All" | Hardcoded `hover:bg-blue-50` | Use design token |

### Icon Container Shape Inconsistencies
| Component | Current | Should Be |
|-----------|---------|-----------|
| SmartKPICards | `rounded-xl` | ✅ Reference |
| CoachOverviewCards | `rounded-xl` | ✅ Matches |
| QuickActions | `rounded-full` | `rounded-xl` (match KPI cards) |
| ActivityFeed | `rounded-full` with border | Keep as-is (timeline dots, different context) |

---

## Tasks

### Task 1: Expand VRT Coverage — Add All Stories

**Files:**
- Modify: `tests/storybook-vrt.spec.ts`

**Step 1: Read current VRT test file**

Read `tests/storybook-vrt.spec.ts` to see the current story list.

**Step 2: Update story list to include all 18+ stories**

Add the missing stories to the `stories` array:

```typescript
const stories = [
  // UI Primitives
  "ui-button--all-variants",
  "ui-button--all-sizes",
  "ui-card--default",
  "ui-card--kpi-card",
  "ui-badge--all-variants",
  "ui-badge--lesson-types",
  "ui-skeleton--card-skeleton",
  // Admin Dashboard
  "admin-dashboard-smartkpicards--default",
  "admin-dashboard-todaytimeline--with-lessons",
  "admin-dashboard-quickactions--default",
  "admin-dashboard-activityfeed--default",
  // Admin Analytics
  "admin-analytics-revenuechart--default",
  "admin-analytics-studentactivitychart--default",
  "admin-analytics-revenuebreakdownchart--default",
  // Coach Dashboard
  "coach-dashboard-coachoverviewcards--default",
  "coach-dashboard-coachupcominglessons--default",
  "coach-dashboard-coachpastlessons--default",
  // Student Dashboard
  "student-dashboard-upcominglessons--default",
  "student-dashboard-studentprogress--default",
  // Calendar
  "scheduling-calendar-fceventcontent--private-lesson",
];
```

Note: Story IDs follow the pattern `category-component--story-name`. Verify exact IDs by checking each story file's title and export names. The ID is derived from `title` (lowercased, slashes become dashes) and the export name (lowercased, camelCase becomes dashed).

**Step 3: Run VRT to capture new baselines**

```bash
pnpm test:vrt -- --update-snapshots
```

Expected: All tests pass, new baseline PNGs created in `tests/storybook-vrt.spec.ts-snapshots/`.

**Step 4: Verify baselines visually**

Open the Storybook and manually check a few stories match their baseline screenshots:
```bash
pnpm storybook
```
Browse to localhost:6006 and spot-check 3-4 stories.

**Step 5: Commit**

```bash
git add tests/storybook-vrt.spec.ts tests/storybook-vrt.spec.ts-snapshots/
git commit -m "test: expand VRT coverage to all 20 stories"
```

---

### Task 2: Standardize Hover Effects

**Files:**
- Modify: `src/features/admin/components/dashboard/TodayTimeline.tsx` — change `-translate-y-0.5` to `-translate-y-1`
- Modify: `src/features/admin/components/dashboard/QuickActions.tsx` — change `hover:scale-[1.02]` to `hover:-translate-y-1`
- Verify: `src/features/admin/components/dashboard/SmartKPICards.tsx` — already uses `-translate-y-1` (reference)
- Verify: `src/features/coach/components/dashboard/CoachOverviewCards.tsx` — already uses `-translate-y-1`

**Step 1: Read the components to find exact hover classes**

Read TodayTimeline.tsx and QuickActions.tsx. Search for `translate` and `scale` in each.

**Step 2: Update TodayTimeline hover**

Find the lesson block elements and change `-translate-y-0.5` to `-translate-y-1`.

**Step 3: Update QuickActions hover**

Find the action link/button elements and replace `hover:scale-[1.02]` with `hover:-translate-y-1`. Also add `transition-all duration-200` if not present.

**Step 4: Verify in Storybook**

```bash
pnpm storybook
```
Check these stories at localhost:6006:
- "Admin Dashboard / TodayTimeline / With Lessons" — hover a lesson block, verify smooth lift
- "Admin Dashboard / QuickActions / Default" — hover an action, verify translate instead of scale

**Step 5: Commit**

```bash
git add src/features/admin/components/dashboard/TodayTimeline.tsx src/features/admin/components/dashboard/QuickActions.tsx
git commit -m "fix: standardize hover effects to -translate-y-1 across dashboard"
```

---

### Task 3: Standardize Inner Shadows & Borders

**Files:**
- Modify: `src/features/admin/components/dashboard/ActivityFeed.tsx` — inner items: remove `shadow-sm`, use border only
- Modify: `src/features/admin/components/dashboard/QuickActions.tsx` — inner items: remove `shadow-sm`, use border only
- Modify: `src/features/student/components/dashboard/UpcomingLessons.tsx` — fix `border` to `border-border/30`
- Modify: `src/features/student/components/dashboard/StudentProgress.tsx` — add `border border-border/30` to stat blocks

**Step 1: Read the four files to find exact border/shadow classes**

Search for `shadow-sm`, `border `, `border-border` patterns in each file.

**Step 2: Update ActivityFeed inner items**

For activity item containers inside the card, remove `shadow-sm` (the parent card already has `shadow-multi`). Keep `border border-border/30` on inner items for subtle separation.

**Step 3: Update QuickActions inner items**

Same pattern — remove `shadow-sm` from action links, ensure `border border-border/30`.

**Step 4: Update UpcomingLessons card borders**

Change bare `border` to `border border-border/30` on nested lesson cards.

**Step 5: Update StudentProgress stat blocks**

Add `border border-border/30` to the stat grid items that currently only have background colors.

**Step 6: Verify in Storybook**

Check all four stories in Storybook. Inner elements should have subtle borders but no individual shadows (the parent card shadow is sufficient).

**Step 7: Commit**

```bash
git add src/features/admin/components/dashboard/ActivityFeed.tsx src/features/admin/components/dashboard/QuickActions.tsx src/features/student/components/dashboard/UpcomingLessons.tsx src/features/student/components/dashboard/StudentProgress.tsx
git commit -m "fix: standardize inner card borders and remove redundant shadows"
```

---

### Task 4: Standardize Padding

**Files:**
- Modify: `src/features/student/components/dashboard/StudentProgress.tsx` — change `p-4` to `p-6`

**Step 1: Read StudentProgress.tsx**

Find the CardContent with `p-4`.

**Step 2: Change padding to p-6**

Update `p-4` to `p-6` to match the system standard.

**Step 3: Verify in Storybook**

Check "Student Dashboard / StudentProgress / Default". Content should have consistent spacing matching other cards.

**Step 4: Commit**

```bash
git add src/features/student/components/dashboard/StudentProgress.tsx
git commit -m "fix: standardize StudentProgress padding to p-6"
```

---

### Task 5: Fix ActivityFeed Icon Colors

**Files:**
- Modify: `src/features/admin/components/dashboard/ActivityFeed.tsx`

**Step 1: Read ActivityFeed.tsx**

Find the icon container elements. Currently uses saturated 500-level colors (e.g., `text-emerald-500`, `text-blue-500`).

**Step 2: Update icon styling to match KPI card pattern**

Change from saturated icons to the muted background + colored icon pattern:
- Payment icons: `bg-emerald-50 text-emerald-600` (was: `text-emerald-500`)
- Booking icons: `bg-blue-50 text-blue-600` (was: `text-blue-500`)
- Registration icons: `bg-violet-50 text-violet-600` (was: `text-purple-500`)

Keep `rounded-full` shape for timeline dots (this is contextually correct — they're timeline indicators, not cards).

**Step 3: Verify in Storybook**

Check "Admin Dashboard / ActivityFeed / Default". Icons should have soft pastel backgrounds with colored icons, matching the Stitch mockup style.

**Step 4: Commit**

```bash
git add src/features/admin/components/dashboard/ActivityFeed.tsx
git commit -m "fix: update ActivityFeed icon colors to muted bg pattern"
```

---

### Task 6: Fix QuickActions Icon Container Shape

**Files:**
- Modify: `src/features/admin/components/dashboard/QuickActions.tsx`

**Step 1: Read QuickActions.tsx**

Find the icon container classes. Currently uses `rounded-full`.

**Step 2: Change to rounded-xl**

Update icon containers from `rounded-full` to `rounded-xl` to match SmartKPICards and CoachOverviewCards.

**Step 3: Verify in Storybook**

Check "Admin Dashboard / QuickActions / Default". Icon containers should be rounded squares, not circles.

**Step 4: Commit**

```bash
git add src/features/admin/components/dashboard/QuickActions.tsx
git commit -m "fix: standardize QuickActions icon shape to rounded-xl"
```

---

### Task 7: Fix Hardcoded Colors

**Files:**
- Modify: `src/features/student/components/dashboard/UpcomingLessons.tsx` — replace `hover:bg-blue-50` with `hover:bg-muted/50`
- Modify: `src/features/student/components/dashboard/StudentProgress.tsx` — replace mixed color references with consistent tokens

**Step 1: Read both files and find hardcoded color references**

Search for hardcoded color classes like `bg-blue-50`, `bg-emerald-50` that should use design tokens.

**Step 2: Update UpcomingLessons**

Replace `hover:bg-blue-50` with `hover:bg-muted/50` for the "View All" button (uses theme token instead of hardcoded color).

**Step 3: Update StudentProgress color consistency**

Ensure all stat blocks use the same pattern for backgrounds. If some use `bg-primary/5` and others use `bg-emerald-50`, standardize to the `-50` pattern with matching text colors (e.g., `bg-emerald-50 text-emerald-700`).

**Step 4: Verify in Storybook**

Check both student stories. Colors should feel consistent and use the same pattern.

**Step 5: Commit**

```bash
git add src/features/student/components/dashboard/UpcomingLessons.tsx src/features/student/components/dashboard/StudentProgress.tsx
git commit -m "fix: replace hardcoded colors with design tokens"
```

---

### Task 8: Run Full VRT and Compare

**Files:**
- Run: VRT tests
- Update: Baseline snapshots if changes are intentional

**Step 1: Run VRT suite**

```bash
pnpm test:vrt
```

Expected: Tests FAIL because we intentionally changed component styling. This is correct — we want to see the diffs.

**Step 2: Review diffs**

```bash
npx playwright show-report --config playwright-storybook.config.ts
```

Open the HTML report and review each failing screenshot. For each:
- ✅ If the new version looks correct (matches design system) → update baseline
- ❌ If something looks wrong → fix before proceeding

**Step 3: Update baselines for approved changes**

```bash
pnpm test:vrt -- --update-snapshots
```

**Step 4: Run VRT again to confirm all pass**

```bash
pnpm test:vrt
```

Expected: All tests PASS.

**Step 5: Commit updated baselines**

```bash
git add tests/storybook-vrt.spec.ts-snapshots/
git commit -m "test: update VRT baselines after visual coherence fixes"
```

---

### Task 9: Full-Page Playwright Screenshots

**Files:**
- Run: Existing screenshot script or manual Playwright CLI

**Step 1: Start the dev server**

```bash
pnpm dev
```

**Step 2: Capture full-page screenshots of key pages**

Use the existing screenshot automation or Playwright CLI:

```bash
npx playwright screenshot --viewport-size="1920,1080" http://localhost:3100/admin/dashboard docs/comparison-screenshots/coherence-admin-dashboard.png
npx playwright screenshot --viewport-size="1920,1080" http://localhost:3100/coach/dashboard docs/comparison-screenshots/coherence-coach-dashboard.png
npx playwright screenshot --viewport-size="1920,1080" http://localhost:3100/student/dashboard docs/comparison-screenshots/coherence-student-dashboard.png
```

Note: These pages require authentication. Use the existing `scripts/screenshot-pages.mjs` script which handles login, or adapt it. The admin test account is `admin@test.com`.

**Step 3: Visually compare with Stitch mockups**

Open side-by-side:
- `docs/comparison-screenshots/coherence-admin-dashboard.png` vs `docs/stitch-designs/02-admin-dashboard.html`
- `docs/comparison-screenshots/coherence-coach-dashboard.png` vs `docs/stitch-designs/04-coach-dashboard.html`
- `docs/comparison-screenshots/coherence-student-dashboard.png` vs `docs/stitch-designs/03-student-dashboard.html`

Note any remaining visual differences for follow-up.

**Step 4: Commit screenshots**

```bash
git add docs/comparison-screenshots/coherence-*.png
git commit -m "docs: capture post-coherence-audit comparison screenshots"
```

---

### Task 10: Final Review — Stitch Design Gap Check

**Files:**
- Read: Stitch HTML mockups in `docs/stitch-designs/`
- Compare: Against live app at localhost:3100

**Step 1: Open Stitch mockups in browser**

Open each HTML file directly in browser for visual comparison:
- `docs/stitch-designs/02-admin-dashboard.html`
- `docs/stitch-designs/04-coach-dashboard.html`
- `docs/stitch-designs/03-student-dashboard.html`

**Step 2: Side-by-side comparison checklist**

For each page, verify:
- [ ] Section header typography matches (xs, semibold, uppercase, tracking-[0.15em])
- [ ] Card shadows are consistent (shadow-multi)
- [ ] Icon backgrounds use pastel-50 with colored-600 icons
- [ ] Hover effects lift consistently (-translate-y-1)
- [ ] Borders are subtle (border-border/30)
- [ ] Spacing is uniform (p-6 in cards, consistent gaps)
- [ ] Chart colors match (cyan #0891b2, violet #7c3aed, orange #f97316)
- [ ] Timeline blocks have tinted backgrounds with colored borders

**Step 3: Document any remaining gaps**

If gaps remain, note them for a follow-up task. The visual coherence audit is complete when all dashboard components use the same design language.

---

## Execution Notes

- **Always verify in Storybook first** (isolated component view) before checking full pages
- **VRT is your safety net** — run it after each batch of changes
- **Stitch HTML files are the ground truth** — when in doubt, check the mockup
- **Don't change the sidebar or layout** — those are locked per CLAUDE.md
- **Story IDs may need verification** — if a story ID doesn't work in VRT, check the story file's `title` and export name to compute the correct ID
