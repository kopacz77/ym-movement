# Luxury Athletic UI Redesign — Implementation Plan

**Design doc:** `docs/plans/2026-04-24-luxury-athletic-redesign-design.md`
**Reference mockups:** `docs/stitch-designs/02-admin-dashboard.html`, `docs/stitch-designs/06-admin-calendar.html`
**Branch:** `frontend-design-improvements`

---

## Task 1: Update Fonts — Public Sans + Inter

**File:** `src/app/layout.tsx`

1. Replace `Plus_Jakarta_Sans` and `Playfair_Display` imports with `Public_Sans` and `Inter`
2. Configure `Public_Sans` with weights 400, 500, 600, 700, 800, 900 and variable `--font-sans`
3. Configure `Inter` with weights 400, 500, 600 and variable `--font-body`
4. Update the `<html>` className to include both font variables
5. Remove any `Playfair_Display` or `Plus_Jakarta_Sans` references

**File:** `tailwind.config.js`

6. Update `fontFamily.sans` to use `var(--font-sans)` (Public Sans)
7. Add `fontFamily.body` using `var(--font-body)` (Inter)

**Verify:** `pnpm type-check`

---

## Task 2: Update CSS Design Tokens

**File:** `src/styles/globals.css`

1. Update `:root` light mode variables to match Stitch palette:
   - `--background: 210 20% 98%` (maps to #f7f9fb)
   - `--foreground: 210 20% 10%` (maps to #191c1e)
   - `--primary: 207 100% 13%` (maps to #002444 — deep navy)
   - `--primary-foreground: 0 0% 100%`
   - `--accent: 192 100% 25%` (maps to #006780 — cyan)
   - `--accent-foreground: 0 0% 100%`
   - `--muted: 210 20% 96%`
   - `--muted-foreground: 215 8% 35%` (maps to #43474e)
   - `--border: 220 15% 81%` (maps to #c3c6cf)
   - `--card: 0 0% 100%`
   - `--card-foreground: 210 20% 10%`
2. Add custom shadow utility class `.shadow-multi`:
   ```css
   .shadow-multi {
     box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08);
   }
   ```

**Verify:** `pnpm type-check`

---

## Task 3: Redesign Sidebar — White to Dark Navy

**File:** `src/components/layout/AppSidebar.tsx`

This is the biggest visual change. Transform the white sidebar into a dark slate-900 sidebar matching the Stitch mockup.

1. Change root `div` bg from `bg-white border-r border-gray-200` to `bg-slate-900 border-r border-white/10`
2. Update header area:
   - Background: `bg-slate-900` (remove `bg-white`)
   - Logo text: `text-white` for title, `text-white/60` for subtitle
   - Border: `border-b border-white/10`
3. Update navigation area:
   - Background: remove `bg-white`
   - **Active link:** Change from `bg-blue-50 text-blue-700 border-r-2 border-blue-700` to `border-l-[3px] border-cyan-500 bg-white/10 text-white font-semibold`
   - **Inactive link:** Change from `text-gray-700 hover:bg-gray-50 hover:text-gray-900` to `text-white/60 hover:text-white hover:bg-white/5`
   - Icon colors: Update to inherit text color
4. Update role switch / footer links:
   - Border: `border-white/10` instead of `border-gray-200`
   - Text: `text-white/60 hover:text-white`
5. Sign out button: `hover:bg-white/10 hover:text-red-400` (red on dark)

**Verify:** `pnpm build` — check for no errors. Visual check in browser.

---

## Task 4: Update Header — Frosted Glass Effect

**File:** `src/components/layout/AppLayout.tsx`

1. Desktop header: Change `bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50` to `bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm`
2. Mobile header: Same change — replace gradient with frosted glass
3. Keep `h-24`, `sticky top-0 z-10`, and all functional elements unchanged

**Verify:** `pnpm type-check`

---

## Task 5: Refine KPI Cards

**File:** `src/features/admin/components/dashboard/SmartKPICards.tsx`

1. Update Card hover shadow to use `.shadow-multi` pattern:
   - Add `shadow-multi` class (or inline the box-shadow)
   - Keep `hover:-translate-y-1` lift
2. Update KPI label typography: `text-xs font-semibold uppercase tracking-[0.15em]`
3. Update KPI value: `text-3xl font-bold tracking-tight` (confirm `text-primary-container` equivalent → use the navy color)
4. Ensure icon containers use `rounded-xl` and existing pastel colors (cyan-50, emerald-50, violet-50, amber-50) — these already match

**File:** `src/features/coach/components/dashboard/CoachOverviewCards.tsx`

5. Apply same pattern to coach KPI cards for consistency

**Verify:** `pnpm type-check`

---

## Task 6: Update Card Component Shadow

**File:** `src/components/ui/card.tsx`

1. Update the Card base shadow from `shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)]` to `.shadow-multi` (which is `0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08)`) — very subtle but matches Stitch
2. Keep `rounded-xl`, `border-border/40`

**Verify:** `pnpm type-check`

---

## Task 7: Update Admin Dashboard Section Headers

**File:** `src/app/(protected)/admin/dashboard/page.tsx`

1. Ensure all section headers use the Stitch pattern: `text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground`
2. Update page title to use `font-bold tracking-tight` (DM Sans style from mockup, but we use Public Sans)

**Verify:** Visual check in browser

---

## Task 8: Update Calendar Theme Overrides

**File:** `src/styles/globals.css`

1. Update FullCalendar theme overrides:
   - `--fc-now-indicator-color`: Set to cyan with glow (`#22d3ee` with box-shadow `0 0 8px rgba(34,211,238,0.8)`)
   - Event blocks: lighter bg (10% opacity colored bg), border at 30% opacity, `rounded-lg`
   - Day headers: `font-label uppercase tracking-[0.1em]`
2. Add current-time glow style for the now indicator line

**Verify:** `pnpm build`

---

## Task 9: Update Today's Timeline Component

**File:** `src/features/admin/components/dashboard/TodayTimeline.tsx`

1. Update the current time indicator: Add cyan glow effect `shadow-[0_0_8px_rgba(8,145,178,0.8)]`
2. Update lesson block opacity: Use `bg-{color}/10` pattern with `border-{color}/30` for softer blocks matching Stitch
3. Update hour marker text: `text-xs text-outline` equivalent → `text-muted-foreground`

**Verify:** `pnpm type-check`

---

## Task 10: Update Quick Actions & Activity Feed

**File:** `src/features/admin/components/dashboard/QuickActions.tsx`

1. Update action item backgrounds to use `bg-surface` hover pattern
2. Icon containers: `rounded-full bg-primary-container` (dark navy circles with white icons) — matching Stitch mockup
3. Label: `font-headline font-semibold text-sm`

**File:** `src/features/admin/components/dashboard/ActivityFeed.tsx`

4. Timeline line: gradient `from-transparent via-surface-variant to-transparent`
5. Dots: colored circles (emerald for payments, blue for bookings, purple for registrations)
6. Activity cards: `bg-surface border border-outline-variant/30 shadow-sm`

**Verify:** `pnpm type-check`

---

## Task 11: Update Student & Coach Dashboard Consistency

**File:** `src/app/(protected)/student/dashboard/page.tsx`
**File:** `src/app/(protected)/coach/dashboard/page.tsx`
**File:** `src/features/student/components/dashboard/StudentProgress.tsx`
**File:** `src/features/student/components/dashboard/NextLessonHero.tsx`

1. Ensure section headers match the `text-xs font-semibold uppercase tracking-[0.15em]` pattern
2. Student progress card stat grid: Use same pastel icon bg colors (primary/5, emerald-50, amber-50)
3. NextLessonHero: Ensure gradient uses the new primary/accent tokens
4. Payment Info card: Clean minimal styling matching new card shadow

**Verify:** `pnpm type-check`

---

## Task 12: Final Build Verification

1. Run `pnpm type-check` — all types must pass
2. Run `pnpm lint` — fix any lint issues
3. Run `pnpm build` — production build must succeed
4. Commit all changes with descriptive message

---

## Batch Execution Order

| Batch | Tasks | Focus |
|-------|-------|-------|
| 1 | 1, 2 | Foundation: fonts + tokens |
| 2 | 3, 4 | Layout chrome: sidebar + header |
| 3 | 5, 6, 7 | Cards + dashboard layout |
| 4 | 8, 9, 10 | Calendar + dashboard components |
| 5 | 11, 12 | Student/coach consistency + final verify |
