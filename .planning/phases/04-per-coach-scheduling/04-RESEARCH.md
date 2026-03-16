# Phase 4: Per-Coach Scheduling - Research

**Researched:** 2026-03-15
**Domain:** Multi-coach schedule management, coach-facing calendar UI, per-coach blocked dates
**Confidence:** HIGH

## Summary

Phase 4 completes the per-coach scheduling system. Thanks to Phase 1 (schema + coachId columns) and Phase 3 (query scoping + overlap detection), the backend infrastructure is largely in place. The remaining work is primarily frontend: (1) making coachId REQUIRED in time slot creation flows, (2) building the coach-facing schedule page (replacing the placeholder), (3) building coach-facing blocked dates management, and (4) adding a coach filter/selector to the admin calendar for multi-coach visibility.

The codebase investigation reveals that `coachId` is already an optional parameter in `createTimeSlot`, `createBulkTimeSlots`, `createBlockedDate`, and overlap detection already scopes per-coach. The `getTimeSlots` query accepts optional `coachId` filtering. The `useTimeSlots` hook does NOT pass `coachId` yet. The `CompactTimeSlotDialog` does NOT have a coach selector field. The `getTimeSlots` select does NOT include Coach relation data (needed for display).

The coach schedule page is a placeholder with a static card. The existing admin `ScheduleManager` component is 760 lines with significant complexity (bulk operations, selection mode, drag-and-drop, blocked dates). The coach version should be simpler -- read-only or limited CRUD of their own slots and blocked dates, with no bulk operations or drag-and-drop initially.

**Primary recommendation:** Build a focused `CoachScheduleManager` that reuses `useCalendarEvents` and `DesktopCalendarView` but with coach-scoped data via new coach TRPC endpoints. Add a coach selector to the admin `ScheduleHeader`. Make `coachId` required in admin time slot creation by inferring from a selected coach context.

## Standard Stack

No new libraries needed. This phase uses the existing stack entirely.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-big-calendar | ^1.19.4 | Calendar rendering for coach schedule | Already used in admin calendar |
| @tanstack/react-query | ^5.90.12 | Data fetching/caching | Already established |
| TRPC v11 | ^11.8.1 | Coach schedule API endpoints | Already established |
| Prisma ORM | existing | Database queries with coachId scoping | Already established |
| Luxon | existing | Timezone-aware date handling | Already used in schedule features |
| date-fns | existing | Date formatting and range calculations | Already used throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | existing | Select, Dialog, Card, Popover components | Coach selector, blocked dates UI |
| Lucide React | existing | Calendar, Filter, Plane icons | Already used in schedule header |
| Sonner | existing | Toast notifications | Already used for schedule operations |

**Installation:** No new packages required.

## Architecture Patterns

### Pattern 1: Coach Schedule Data Flow

**What:** The coach schedule page fetches time slots, lessons, and blocked dates scoped to `ctx.coach.id` via `coachProcedure`, then renders using shared calendar utilities.

**Data flow:**
```
coachProcedure (auto-scopes to ctx.coach.id)
  -> coach.schedule.getMyTimeSlots (Prisma query with coachId = ctx.coach.id)
  -> useCalendarEvents hook (shared with admin, converts to react-big-calendar events)
  -> DesktopCalendarView / MobileCalendarView (shared rendering components)
```

**Why this works:** The `coachProcedure` middleware already resolves `ctx.coach` from the session. Phase 3 verified this pattern works in dashboard, earnings, and proposal queries. The calendar rendering components (`DesktopCalendarView`, `MobileCalendarView`, `useCalendarEvents`) are data-agnostic -- they accept `TimeSlot[]` regardless of source.

**Example -- New coach schedule endpoint:**
```typescript
// src/features/coach/api/queries/scheduleQueries.ts
getMyTimeSlots: coachProcedure
  .input(z.object({
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    rinkId: z.string().optional(),
  }))
  .query(async ({ ctx, input }) => {
    return ctx.prisma.rinkTimeSlot.findMany({
      where: {
        coachId: ctx.coach.id, // Auto-scoped
        isActive: true,
        rinkId: input.rinkId,
        startTime: input.startDate ? {
          gte: input.startDate,
          ...(input.endDate && { lte: input.endDate }),
        } : undefined,
      },
      select: {
        // Mirror the admin getTimeSlots select shape
        id: true, rinkId: true, startTime: true, endTime: true,
        maxStudents: true, isActive: true, createdAt: true,
        Rink: { select: { id: true, name: true, timezone: true, address: true } },
        Lesson: {
          select: {
            id: true, type: true, price: true, status: true, notes: true,
            Student: {
              select: {
                id: true, notes: true,
                User: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });
  }),
```

### Pattern 2: Admin Calendar Coach Filter

**What:** Add a coach selector dropdown to `ScheduleHeader` alongside the existing rink selector and timezone filter. When a coach is selected, pass `coachId` to the `getTimeSlots` query and `getBlockedDates` query.

**Implementation path:**
```
ScheduleManager (state: selectedCoachId)
  -> useTimeSlots hook (passes coachId to getTimeSlots)
  -> ScheduleHeader (renders CoachSelector dropdown)
  -> CompactTimeSlotDialog (includes coachId in createTimeSlot mutation)
  -> WorkingBlockedDatesManager (passes coachId to createBlockedDate)
```

**Current state vs. needed changes:**
- `ScheduleManager` manages `selectedRink` state -- add analogous `selectedCoach` state
- `useTimeSlots` hook calls `api.admin.schedule.getTimeSlots.useQuery({ rinkId, startDate, endDate })` -- add `coachId` parameter
- `CompactTimeSlotDialog.onBookingSubmit` emits `{ date, startTime, endTime, rinkId, maxStudents }` -- add `coachId`
- `handleEnhancedBookingSubmit` calls `createTimeSlot.mutate({ rinkId, startTime, endTime, maxStudents, isActive })` -- add `coachId`
- `ScheduleHeader` shows Rink selector and timezone filter -- add Coach selector

**Coach selector data source:** Use existing `api.admin.coach.management.getAllCoaches` (already returns `{ id, user: { name } }` for all coaches). Filter to approved+active coaches for the dropdown.

### Pattern 3: Coach-Facing Blocked Dates

**What:** Coaches manage their own blocked dates through a `coachProcedure` endpoint. The admin can also create blocked dates for any coach via the existing admin endpoint with `coachId` parameter.

**Scope separation:**
- **Coach creates:** `coachId = ctx.coach.id` (auto-scoped, cannot create for other coaches)
- **Coach views:** Only their own blocked dates (`where: { coachId: ctx.coach.id }`)
- **Admin creates:** Can specify any `coachId` via the existing `createBlockedDate` admin mutation (already accepts optional `coachId`)
- **Admin views:** Can filter by coach or see all (existing `getBlockedDates` already accepts optional `coachId`)

**Example -- Coach blocked dates endpoint:**
```typescript
getMyBlockedDates: coachProcedure
  .input(z.object({
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  }))
  .query(async ({ ctx, input }) => {
    return ctx.prisma.blockedDateRange.findMany({
      where: {
        coachId: ctx.coach.id,
        ...(input.startDate && input.endDate ? {
          OR: [
            { startDate: { gte: input.startDate, lte: input.endDate } },
            { endDate: { gte: input.startDate, lte: input.endDate } },
            { startDate: { lte: input.startDate }, endDate: { gte: input.endDate } },
          ],
        } : {}),
      },
      include: { User: { select: { id: true, name: true, email: true } } },
      orderBy: [{ startDate: "asc" }],
    });
  }),

createBlockedDate: coachProcedure
  .input(z.object({
    title: z.string().min(1).max(100),
    description: z.string().optional(),
    startDate: z.date(),
    endDate: z.date(),
    type: z.enum(["TRAVEL", "COMPETITION", "OTHER"]).default("TRAVEL"),
  }))
  .mutation(async ({ ctx, input }) => {
    // Auto-assign coachId from ctx.coach.id
    return ctx.prisma.blockedDateRange.create({
      data: {
        ...input,
        coachId: ctx.coach.id,
        createdById: ctx.session.user.id,
      },
    });
  }),
```

### Pattern 4: Admin Time Slot Creation with Required Coach

**What:** When creating time slots through the admin calendar, `coachId` should be REQUIRED. This is enforced by:
1. The coach selector in the admin header defaults to a selected coach
2. The `CompactTimeSlotDialog` receives the selected coachId as a prop
3. The `handleEnhancedBookingSubmit` includes coachId in the mutation call
4. The `createTimeSlot` backend mutation already accepts `coachId`

**UI enforcement (not schema enforcement):** The `coachId` column on `RinkTimeSlot` remains nullable in the database (for backwards compatibility), but the UI prevents creation without selecting a coach. This avoids needing a migration to make the column NOT NULL.

**Flow:**
1. Admin opens schedule page -- coach selector defaults to first active coach (or "All Coaches" view)
2. Admin clicks calendar cell -- `CompactTimeSlotDialog` opens with pre-selected coachId
3. Admin can change coach in the dialog or it inherits from the header selector
4. Submit includes `coachId` in the mutation payload

### Pattern 5: Calendar Event Display with Coach Info

**What:** Time slot events on the admin calendar should show which coach owns them, especially in "All Coaches" view. This requires:
1. Adding `Coach` relation to the `getTimeSlots` select
2. Updating `useCalendarEvents` to include coach name in event titles
3. Optional: Color-coding events by coach

**getTimeSlots select addition:**
```typescript
// Add to existing select in timeSlotQueries.ts getTimeSlots
Coach: {
  select: {
    id: true,
    User: {
      select: { name: true },
    },
  },
},
```

**Event title format (admin "All Coaches" view):**
```
"Rink Name - Student Names (1/1) [Coach Name]"
```

**Event title format (single coach filter):**
```
"Rink Name - Student Names (1/1)"  // Coach name not needed when filtered
```

### Anti-Patterns to Avoid

- **Duplicating ScheduleManager for coach:** Do NOT copy the 760-line ScheduleManager. Build a simpler `CoachScheduleManager` that reuses shared components.
- **Making coachId NOT NULL in schema now:** Do NOT change the schema column to required. Existing data may have null values. Enforce at the UI and validation layer.
- **Creating coach-specific versions of every component:** Reuse `DesktopCalendarView`, `MobileCalendarView`, `useCalendarEvents`, `TimeSlotDialog`. Only create new components where behavior genuinely differs.
- **Bypassing coachProcedure for coach endpoints:** Always use `coachProcedure` for coach-facing APIs. Never use `protectedProcedure` with manual coachId checks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar rendering for coach | Custom calendar grid | `react-big-calendar` via `DesktopCalendarView` | Already handles timezone conversion, drag events, blocked dates |
| Coach timezone handling | Manual timezone logic | `useCalendarEvents` hook with Luxon | Already does UTC-to-rink-local conversion perfectly |
| Coach data scoping middleware | Manual ctx.user checks | `coachProcedure` from `@/lib/trpc` | Already resolves ctx.coach with Coach model data |
| Blocked dates overlap check | Custom overlap logic | Copy from existing `blockedDateQueries.ts` | Already handles all overlap scenarios |
| Coach selector component | Custom dropdown | shadcn `Select` with `getAllCoaches` data | Matches existing rink selector pattern |
| Time slot event coloring | Custom color system | Extend existing `useCalendarEvents` backgroundColor logic | Already has color-by-status logic |

**Key insight:** Phase 3 already built the query scoping infrastructure. Phase 4 is almost entirely UI work -- connecting existing scoped queries to new UI surfaces. The temptation will be to rebuild backend logic, but nearly everything needed already exists.

## Common Pitfalls

### Pitfall 1: useTimeSlots Hook Tightly Coupled to Admin Routes
**What goes wrong:** The `useTimeSlots` hook at `src/hooks/useTimeSlots.ts` calls `api.admin.schedule.getTimeSlots` and `api.admin.student.getStudents`. The coach schedule cannot use this hook because it needs `api.coach.schedule.getMyTimeSlots`.
**Why it happens:** The hook was built before multi-coach support existed.
**How to avoid:** Create a new `useCoachTimeSlots` hook (or make `useTimeSlots` accept an API source parameter). The coach hook should call coach-scoped endpoints.
**Warning signs:** Import errors or unauthorized API calls when using `useTimeSlots` on the coach schedule page.

### Pitfall 2: CompactTimeSlotDialog Missing coachId in Payload
**What goes wrong:** Time slots are created without `coachId` because `CompactTimeSlotDialog.onBookingSubmit` does not include it in the callback data.
**Why it happens:** The dialog was built for single-coach mode.
**How to avoid:** Add `coachId` to both the `CompactTimeSlotDialog` props interface and the `onBookingSubmit` callback payload. The parent (`ScheduleManager`) must pass the selected coach.
**Warning signs:** New time slots created with `coachId: null` in the database.

### Pitfall 3: Blocked Dates Not Scoped to Coach in Calendar View
**What goes wrong:** Admin calendar shows ALL blocked dates (from all coaches) even when filtering by a specific coach. Coach calendar shows all blocked dates instead of just their own.
**Why it happens:** `ScheduleManager` calls `api.admin.schedule.getBlockedDates` without passing `coachId`.
**How to avoid:** Pass `coachId` to the `getBlockedDates` query when a coach filter is active. For the coach view, always scope to `ctx.coach.id`.
**Warning signs:** Calendar showing blocked dates from other coaches, confusing the view.

### Pitfall 4: Coach Selector Not Reflecting in All Operations
**What goes wrong:** Admin selects "Coach B" in the header filter, but time slot creation, student assignment, and blocked date creation still operate without `coachId`.
**Why it happens:** The `selectedCoach` state in `ScheduleManager` is only wired to the query filter but not passed to mutation handlers.
**How to avoid:** Thread `selectedCoachId` through to ALL operations: `handleEnhancedBookingSubmit`, `WorkingBlockedDatesManager`, `BulkCreateSlotsDialog`, `handleAssignStudent`.
**Warning signs:** Data created under the wrong coach or with null coachId despite having a coach selected.

### Pitfall 5: calendarUtils TimeSlot Interface Missing Coach Field
**What goes wrong:** TypeScript errors when trying to access `slot.Coach` in calendar components because the `TimeSlot` interface in `calendarUtils.ts` does not have a `Coach` field.
**Why it happens:** The interface was defined before coach data was needed.
**How to avoid:** Add optional `Coach` field to the `TimeSlot` interface: `Coach?: { id: string; User: { name: string | null } }`.
**Warning signs:** TypeScript compilation errors referencing `Coach` property on `TimeSlot`.

### Pitfall 6: TimeSlotDialogAdapter Missing Coach Data
**What goes wrong:** The time slot detail dialog does not show which coach owns the slot.
**Why it happens:** The `TimeSlotDialogAdapter.castToLessons()` function casts lesson data but does not include coach information from the parent slot.
**How to avoid:** The coach display should come from the slot itself (not from lessons). Add coach display to `TimeSlotDialog` header area rather than per-lesson.
**Warning signs:** No coach attribution visible when clicking time slots.

## Code Examples

### Example 1: Coach Selector Component for Admin Header
```typescript
// Add to ScheduleHeader.tsx
interface CoachSelectorProps {
  selectedCoachId: string | undefined;
  onCoachSelect: (coachId: string | undefined) => void;
  coaches: Array<{ id: string; user: { name: string | null } }>;
}

// In ScheduleHeader render:
<Select
  value={selectedCoachId || "all_coaches"}
  onValueChange={(value) => onCoachSelect(value === "all_coaches" ? undefined : value)}
>
  <SelectTrigger className="w-full sm:flex-1 bg-white shadow-sm">
    <SelectValue placeholder="All Coaches" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all_coaches">All Coaches</SelectItem>
    {coaches?.map((coach) => (
      <SelectItem key={coach.id} value={coach.id}>
        {coach.user.name || "Unnamed Coach"}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Example 2: useTimeSlots with coachId Parameter
```typescript
// Modify src/hooks/useTimeSlots.ts
export function useTimeSlots(
  dateRange: DateRange,
  selectedRink?: string,
  selectedCoachId?: string, // NEW parameter
): UseTimeSlotsResult {
  const { data: timeSlots } = api.admin.schedule.getTimeSlots.useQuery(
    {
      startDate: dateRange.start,
      endDate: dateRange.end,
      rinkId: selectedRink,
      ...(selectedCoachId && { coachId: selectedCoachId }), // NEW
    },
    { /* existing options */ },
  );
  // ... rest unchanged
}
```

### Example 3: Coach Schedule Hook
```typescript
// src/features/coach/hooks/useCoachTimeSlots.ts
export function useCoachTimeSlots(dateRange: DateRange, selectedRink?: string) {
  const { data: rinks } = api.coach.schedule.getRinks.useQuery();
  const { data: timeSlots } = api.coach.schedule.getMyTimeSlots.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    rinkId: selectedRink,
  });
  const { data: blockedDates } = api.coach.schedule.getMyBlockedDates.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  return { rinks, timeSlots, blockedDates };
}
```

### Example 4: Admin createTimeSlot with Required coachId
```typescript
// In ScheduleManager.handleEnhancedBookingSubmit
createTimeSlot.mutate({
  rinkId: bookingData.rinkId,
  startTime: startDateTime,
  endTime: endDateTime,
  maxStudents: bookingData.maxStudents,
  isActive: true,
  coachId: selectedCoachId, // NEW: from ScheduleManager state
}, {
  onSuccess: () => setIsCreateDialogOpen(false),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-coach implicit model | Multi-coach with coachId scoping | Phase 1-3 | All queries now accept optional coachId |
| protectedProcedure for admin | adminProcedure for admin queries | Phase 3 | Security hardened |
| No coach sidebar/layout | Full coach layout with sidebar | Phase 2 | Coach navigation ready |
| No time slot ownership | RinkTimeSlot.coachId column | Phase 1 | Schema supports ownership |
| Global overlap detection | Per-coach overlap detection | Phase 3 | Different coaches can overlap |

**Already completed (do not redo):**
- coachId columns on RinkTimeSlot, Lesson, BlockedDateRange -- Phase 1
- Coach model, CoachStudent junction, ProposedTimeSlot -- Phase 1
- Coach role middleware (coachProcedure) -- Phase 1
- Coach dashboard, profile, earnings, proposals, students pages -- Phase 2
- Coach layout/sidebar/header -- Phase 2
- Optional coachId filtering on admin queries -- Phase 3
- Per-coach overlap detection in createTimeSlot/updateTimeSlot -- Phase 3
- Per-coach scoping on blockedDate overlap checks -- Phase 3
- Super admin dashboard with cross-coach data -- Phase 3

## Recommended Project Structure

```
src/features/coach/
  api/queries/
    scheduleQueries.ts       # NEW: getMyTimeSlots, getMyBlockedDates, createBlockedDate, deleteBlockedDate
    index.ts                 # UPDATE: add schedule router
  components/
    schedule/
      CoachScheduleManager.tsx  # NEW: simplified schedule manager for coach view
      CoachBlockedDates.tsx     # NEW: coach blocked dates management
    layout/
      CoachHeader.tsx           # EXISTING: no changes needed

src/features/admin/components/scheduling/
  ScheduleHeader.tsx         # UPDATE: add coach selector dropdown
  ScheduleManager.tsx        # UPDATE: add selectedCoach state, thread through
  CompactTimeSlotDialog.tsx  # UPDATE: add coachId prop
  WorkingBlockedDatesManager.tsx  # UPDATE: accept coachId prop

src/hooks/
  useTimeSlots.ts            # UPDATE: add optional coachId parameter
  useCalendarEvents.ts       # UPDATE: include coach name in titles when available

src/features/admin/api/queries/schedule/
  timeSlotQueries.ts         # UPDATE: add Coach to select in getTimeSlots
```

## Open Questions

1. **Should the admin be REQUIRED to select a coach before creating time slots?**
   - What we know: The `coachId` is optional in the schema. Phase 3 kept it optional for backwards compatibility.
   - What's unclear: Should the UI enforce coach selection (preventing null coachId) or allow "unassigned" slots?
   - Recommendation: Enforce coach selection in the UI. Show a validation error if no coach is selected. This avoids orphaned slots.

2. **Should the coach schedule page allow time slot CRUD or be read-only?**
   - What we know: Coaches can propose time slots (via ProposedTimeSlot) which admins approve. Direct creation exists only for admins.
   - What's unclear: Should Phase 4 give coaches direct CRUD on their own time slots, or maintain the proposal workflow?
   - Recommendation: Make the coach schedule page READ-ONLY for time slots (view only). Coaches use the existing proposal workflow to request new slots. They CAN manage their own blocked dates directly. This maintains admin oversight of the schedule.

3. **Color coding by coach in admin "All Coaches" view?**
   - What we know: Events are currently colored by status (green=available, amber=partial, blue=full).
   - What's unclear: Should events also be distinguishable by coach? This conflicts with the status coloring.
   - Recommendation: When "All Coaches" is selected, show coach name in event title (e.g., "[YM] Rink Name - Student (1/1)"). Reserve color for status. Add coach name badge to event tooltip or detail dialog. Color-by-coach creates accessibility concerns with too many colors.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all referenced files
- Prisma schema: `prisma/schema.prisma` -- Coach, RinkTimeSlot, BlockedDateRange models verified
- Admin schedule queries: `src/features/admin/api/queries/schedule/timeSlotQueries.ts` -- coachId filtering verified
- Admin schedule queries: `src/features/admin/api/queries/schedule/blockedDateQueries.ts` -- coachId filtering verified
- Coach middleware: `src/lib/trpc.ts` line 183 -- coachProcedure definition verified
- Coach router: `src/features/coach/api/queries/index.ts` -- current router structure verified
- Schedule components: `ScheduleManager.tsx`, `ScheduleHeader.tsx`, `CompactTimeSlotDialog.tsx` -- component interfaces analyzed
- Hooks: `useTimeSlots.ts`, `useCalendarEvents.ts`, `useScheduleActions.ts` -- data flow traced

### Secondary (MEDIUM confidence)
- Phase 3 research findings at `.planning/phases/03-query-scoping-super-admin/03-RESEARCH.md`
- STATE.md decisions and accumulated context

### Tertiary (LOW confidence)
- None -- all findings are from direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, fully existing stack
- Architecture: HIGH - patterns directly derived from existing codebase analysis
- Pitfalls: HIGH - identified through tracing actual data flows in existing code
- Code examples: HIGH - based on verified existing patterns in the codebase

**Research date:** 2026-03-15
**Valid until:** Indefinite (findings are codebase-specific, not library-version-dependent)
