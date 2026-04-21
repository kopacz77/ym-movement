# Dashboard & Calendar Overhaul Design

**Date**: 2026-04-20
**Branch**: `frontend-design-improvements`
**Status**: Approved

## Problem Statement

The YM Movement platform is a premium Olympic-level ice dance coaching tool, but the UI does not reflect that positioning:

- **Calendar**: 819-line mega-component (`ScheduleManager`) with 22 state variables, a "fake Date" timezone hack, dead computed arrays, and hydration risks
- **Admin Dashboard**: Shows numbers without context or actionability
- **Student Dashboard**: Bare minimum (3 upcoming lessons + 3 counters)
- **Coach Dashboard**: Flat KPI cards + lesson lists, no today-focused view

## Decision: FullCalendar (MIT Free Core)

After evaluating react-big-calendar (current), FullCalendar, and Schedule-X:

- **Schedule-X eliminated**: Drag-and-drop and resize are premium (paid) features
- **FullCalendar chosen**: MIT-licensed core includes drag-drop, resize, native timezone, SSR-compatible React VDOM, background events, and 10+ years of battle-testing

Free packages needed:
- `@fullcalendar/react` — React connector
- `@fullcalendar/core` — Core engine
- `@fullcalendar/daygrid` — Month view
- `@fullcalendar/timegrid` — Week/day time grid views
- `@fullcalendar/interaction` — Drag-drop, resize, click-to-create

## Architecture: Calendar

### Current (Problems)

```
ScheduleManager.tsx (819 lines, 22 useState)
├── useTimeSlots hook (computes unused events array)
├── useCalendarEvents hook (fake Date timezone trick)
├── TimeSlotDialogAdapter (casts unknown[] → Lesson[])
├── DesktopCalendarView (react-big-calendar + DnD)
└── MobileCalendarView (hand-written list)
```

### New (Clean)

```
src/features/scheduling/
├── context/
│   └── ScheduleContext.tsx          # Shared state via useReducer (~8 fields)
├── hooks/
│   ├── useScheduleState.ts          # Reducer: date, view, filters, selection mode
│   ├── useCalendarActions.ts        # TRPC mutations (create, update, delete, assign)
│   └── useCalendarEvents.ts         # DB slots → FullCalendar event objects
├── components/
│   ├── ScheduleCalendar.tsx         # Main orchestrator (~150 lines)
│   ├── CalendarToolbar.tsx          # Custom header (view switch, filters, bulk)
│   ├── EventContent.tsx             # Custom event rendering (badges, colors)
│   ├── SlotCreateDialog.tsx         # Click-to-create (refined CompactTimeSlotDialog)
│   ├── SlotManageDialog.tsx         # Event click → manage (simplified TimeSlotDialog)
│   ├── BulkActionsBar.tsx           # Selection mode UI
│   └── MobileScheduleView.tsx       # List-based mobile fallback
└── utils/
    └── eventTransforms.ts           # Prisma model → FullCalendar EventInput
```

### Key Technical Changes

1. **Timezone**: `timeZone="America/Los_Angeles"` (or dynamic per rink) — no fake dates
2. **State**: Single `useReducer` replaces 22 `useState` calls
3. **Dialog ownership**: Each dialog manages its own open/close state (not parent)
4. **Event transforms**: Clean mapping from Prisma `RinkTimeSlot` → FullCalendar `EventInput`
5. **Background events**: Blocked dates rendered as `display: 'background'` events
6. **Drag validation**: `eventAllow` callback prevents dropping on blocked dates

### FullCalendar Configuration

```tsx
<FullCalendar
  timeZone={rinkTimezone}
  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
  initialView="timeGridWeek"
  headerToolbar={false}           // Custom toolbar component
  selectable={true}
  editable={true}
  eventResizableFromStart={false}
  slotDuration="00:15:00"
  slotMinTime={operationalHours.start}
  slotMaxTime={operationalHours.end}
  eventContent={renderEventContent}
  select={handleSlotSelect}
  eventClick={handleEventClick}
  eventDrop={handleEventDrop}
  eventResize={handleEventResize}
  eventAllow={validateEventPlacement}
  events={calendarEvents}
/>
```

## Architecture: Admin Dashboard

### New Layout

**Row 1: Smart KPI Cards (4 cards)**
| Card | Data | Action |
|------|------|--------|
| Today's Schedule | Lessons today / capacity, next lesson countdown | → Calendar |
| Revenue This Month | Amount + trend vs last month, 7-day sparkline | → Reports |
| Pending Actions | Unapproved students + unverified payments + proposals | → Each section |
| Student Health | Active / total, churn risk (no lessons in 2+ weeks) | → Students |

**Row 2: Today's Timeline**
- Horizontal timeline of today's lessons (Gantt-style for one day)
- Color-coded by lesson type
- Shows student name + coach + rink
- Current time indicator
- Clickable → navigate to calendar time

**Row 3: Two Columns**
- Left: Quick Actions panel (create slot, send reminder, approve students, view reports)
- Right: Recent Activity Feed (last 10 actions with relative timestamps)

**Row 4: Charts** (enhanced existing)
- Revenue chart with click-to-drill-down
- Student activity with month-over-month comparison toggle

## Architecture: Student Dashboard

### New Layout — "My Skating Journey"

**Row 1: Welcome + Next Lesson Hero**
- WarmGreeting component (kept)
- Prominent next-lesson card: date, time, coach, rink, type, countdown
- "Book Another Lesson" CTA

**Row 2: Upcoming Schedule (3-5 lessons)**
- Cards with: type badge, coach name, rink, time (timezone-aware)
- Encouraging empty state with booking CTA

**Row 3: Two Columns**
- Left: Progress (total completed, this-month ring, streak, type breakdown donut)
- Right: My Coaches (cards per coach, specialty, next lesson with them)

**Row 4: Payment Summary**
- Outstanding balance (if any)
- Last payment date + amount
- Payment methods
- Link to history

## Architecture: Coach Dashboard

### New Layout — "My Coaching Day"

**Row 1: Today's Overview (4 cards)**
- Today's lessons + next highlighted
- This week's earnings
- Active students
- Pending proposals (with badge)

**Row 2: Today's Schedule Strip**
- Same horizontal timeline as admin (filtered to this coach)
- Student names, current time indicator

**Row 3: Two Columns**
- Left: Upcoming Lessons (next 5, enhanced)
- Right: My Students grid (student cards with last/next lesson dates)

**Row 4: Earnings Summary**
- This month vs last month comparison
- Lessons completed count
- Link to full earnings

## Visual Standards

- Brand colors from Wave 3 (deep sapphire primary, ice-cyan accent)
- `font-display` (Playfair Display) for dashboard section headings
- framer-motion stagger animations on card load
- Consistent card design: white bg, subtle shadow, rounded-xl, hover:shadow-lg
- Sparklines in KPI cards via recharts mini LineChart
- IMMUTABLE: Sidebar w-64, header gradient, active nav — per CLAUDE.md

## Migration Phases

| Phase | Scope | Risk | Dependencies |
|-------|-------|------|-------------|
| 1 | Calendar migration to FullCalendar | Medium | None |
| 2 | Admin dashboard redesign | Low | Phase 1 (timeline reuses calendar concepts) |
| 3 | Student dashboard redesign | Low | None |
| 4 | Coach dashboard redesign | Low | Phase 2 (reuses timeline component) |

Each phase gets a commit. Build verification between phases. Branch can be abandoned at any point without affecting production.

## Constraints

- All FullCalendar packages must be from the free MIT core (no @fullcalendar/premium-*)
- IMMUTABLE layout rules (CLAUDE.md) must be preserved
- TimeSlotDialogAdapter field mapping logic preserved (adapter may be simplified but data contract stays)
- No database schema changes required
- Existing TRPC API endpoints remain compatible
