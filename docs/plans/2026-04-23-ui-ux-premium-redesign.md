# UI/UX Premium Redesign

**Date**: 2026-04-23
**Goal**: Transform dashboards from generic SaaS to elegant, premium, brand-aligned experience
**Direction**: Keep current blue/indigo palette, elevate design quality and brand personality
**Scope**: Admin, Student, and Coach dashboards

---

## Design Principles

1. **Elegant & Premium** — every surface should feel refined, not functional-but-boring
2. **Brand-aligned** — design quality should match the elegance of the YM Movement logo
3. **Current palette preserved** — blue/indigo primary, cyan accent, violet tertiary stay
4. **Modern but not trendy** — timeless patterns over flashy effects

---

## Section 1: Typography & Spacing

### Font Changes
- **Body font**: Switch from Geist Sans to **Plus Jakarta Sans** — friendlier, more modern, premium SaaS feel
- **Display font**: Keep **Playfair Display** for landing page hero headings only
- **Google Fonts import**: `Plus+Jakarta+Sans:wght@300;400;500;600;700`

### Typography Scale
- KPI card values: `text-3xl font-bold` (up from text-2xl)
- KPI card labels: `text-sm text-muted-foreground font-medium`
- Section headers: `text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground` — echoes logo's "MOVEMENT" wide tracking
- Card titles: `text-lg font-semibold`
- Body text line-height: 1.6 for readability

### Spacing
- Card internal padding: `p-6` minimum (some cards currently use less)
- Section gaps: `gap-8` between major dashboard sections
- Card content spacing: `space-y-4` inside cards for breathing room

---

## Section 2: Card System Redesign

### Shadow System
Replace `shadow-sm` with refined multi-layer shadows:

```
Default:  shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)]
Hover:    shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_36px_rgba(0,0,0,0.1)]
```

### Border Treatment
- Replace `border` with `border border-border/40` — softer, less boxy
- Remove colored left borders (`border-l-4`) from KPI cards
- Card corners: keep `rounded-xl`

### Hover States
- All interactive cards: `hover:-translate-y-1 hover:shadow-lg transition-all duration-200`
- Smooth, subtle — not bouncy or aggressive

### Card Header Areas
- Remove gradient overlays (`bg-gradient-to-r from-color/5`)
- Use clean whitespace + typography hierarchy instead
- Optional: thin `border-b border-border/30` divider between header and content

---

## Section 3: Component Refinements

### KPI Cards (SmartKPICards.tsx)
- **Layout**: Icon on right side in softly colored circle, value + label on left
- **Value**: `text-3xl font-bold text-foreground`
- **Label**: `text-sm font-medium text-muted-foreground`
- **Icon container**: `w-12 h-12 rounded-xl bg-{color}-50 flex items-center justify-center`
- **No left border** — icon container is the visual anchor
- **Trend indicator**: Small text below value showing +/- change if available

### Activity Feed (ActivityFeed.tsx)
- Thinner connecting line (`w-px` instead of `w-0.5`)
- Smaller dots with refined ring indicators
- More whitespace between entries (`space-y-6`)
- Timestamp text: lighter weight, right-aligned

### Quick Actions (QuickActions.tsx)
- Icons centered above text label (vertical layout)
- Cleaner 2x2 grid with equal card sizes
- Subtle background color on hover, not icon scale

### Today Timeline (TodayTimeline.tsx)
- Keep existing design — pastel lesson type colors are well-done
- Minor: refine the current time indicator line weight

### Charts (RevenueChart, StudentActivityChart)
- Wrap in shadcn `<ChartContainer>` component for consistent theming
- Remove custom border-top accents (cyan/violet) — let the chart data speak
- Consistent card wrapper with the new shadow system

### Section Headers (All Dashboards)
- Pattern: `text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground`
- Remove gradient divider lines — use spacing alone to separate sections
- Clean, editorial feel

---

## Section 4: What Stays the Same (Immutable)

Per CLAUDE.md and user direction, these are NOT changing:

- **Page layout**: Sidebar (w-64) + main content (lg:pl-64) — locked architecture
- **Sidebar design**: White bg, border-r, logo, navigation — immutable
- **Header**: Gradient `from-slate-50 via-blue-50 to-indigo-50` — locked
- **Color palette**: Blue/indigo primary, cyan accent, violet tertiary
- **Lesson type colors**: Blue=Private, Purple=Choreography, Green=Group, Orange=Competition
- **Responsive breakpoints**: sm → lg progressive enhancement
- **Mobile patterns**: touch targets, safe area insets

---

## Section 5: Implementation Order

### Phase 1: Foundation (Typography + Theme)
1. Add Plus Jakarta Sans font import to layout.tsx
2. Update CSS variables / tailwind config for new font
3. Update global shadow utility classes or create shared card component styles

### Phase 2: Card System
4. Refactor base Card component or create wrapper with new shadow/border defaults
5. Redesign SmartKPICards — new layout, remove left borders
6. Update ActivityFeed — thinner lines, more spacing
7. Update QuickActions — vertical icon layout
8. Update TodayTimeline — minor refinements

### Phase 3: Dashboard Pages
9. Admin dashboard — apply section headers, spacing, component updates
10. Student dashboard — same treatment (NextLessonHero, StudentProgress, PaymentInfo)
11. Coach dashboard — same treatment (CoachOverviewCards, upcoming/past lessons)

### Phase 4: Charts & Polish
12. Integrate shadcn ChartContainer for charts
13. Final spacing and consistency pass across all three dashboards
14. Verify responsive behavior at all breakpoints

---

## Files to Modify

### Core Theme
- `src/app/layout.tsx` — font import
- `src/styles/globals.css` — CSS variables, shadow utilities
- `tailwind.config.ts` — font family config

### Admin Dashboard
- `src/features/admin/components/dashboard/SmartKPICards.tsx`
- `src/features/admin/components/dashboard/ActivityFeed.tsx`
- `src/features/admin/components/dashboard/QuickActions.tsx`
- `src/features/admin/components/dashboard/TodayTimeline.tsx`
- `src/app/(protected)/admin/dashboard/page.tsx`

### Student Dashboard
- `src/features/student/components/dashboard/NextLessonHero.tsx`
- `src/features/student/components/dashboard/StudentProgress.tsx`
- `src/features/student/components/dashboard/UpcomingLessons.tsx`
- `src/app/(protected)/student/dashboard/page.tsx`

### Coach Dashboard
- `src/features/coach/components/dashboard/CoachOverviewCards.tsx`
- `src/features/coach/components/dashboard/CoachUpcomingLessons.tsx`
- `src/app/(protected)/coach/dashboard/page.tsx`

### Shared
- `src/components/ui/card.tsx` — potentially update defaults

---

## Success Criteria

- [ ] Cards feel elevated and premium, not boxy/generic
- [ ] Typography has clear hierarchy with modern font
- [ ] Section headers echo the YM Movement logo's elegant wide-tracking style
- [ ] Hover states are smooth and subtle
- [ ] Consistent shadow and spacing system across all three dashboards
- [ ] No regression in responsive behavior
- [ ] Passes type-check and builds cleanly
