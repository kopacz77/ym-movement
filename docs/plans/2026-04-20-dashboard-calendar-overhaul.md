# Dashboard & Calendar Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace react-big-calendar with FullCalendar (free MIT core), decompose the 819-line ScheduleManager mega-component, and redesign all three dashboards (admin, student, coach) with actionable intelligence.

**Architecture:** FullCalendar with native timezone support eliminates the "fake Date" hack. A shared ScheduleContext with useReducer replaces 22 useState calls. Each dialog owns its open/close state. Dashboard widgets use sparklines and drill-down patterns.

**Tech Stack:** FullCalendar 6.x (@fullcalendar/react, /daygrid, /timegrid, /interaction), Recharts (sparklines), framer-motion (animations), Tailwind CSS, TRPC queries (unchanged backend).

---

## Phase 1: Calendar Migration to FullCalendar

### Task 1: Install FullCalendar Packages

**Files:**
- Modify: `package.json`

**Step 1: Install FullCalendar free packages**

Run:
```bash
cd /home/kopacz/projects/ym-movement && pnpm add @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list
```

**Step 2: Verify installation**

Run: `pnpm ls @fullcalendar/react`
Expected: Shows installed version (6.x)

**Step 3: Verify build still works**

Run: `pnpm build`
Expected: Build passes (new packages are installed but not yet used)

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: install FullCalendar packages for calendar migration"
```

---

### Task 2: Create Event Transform Utilities

**Files:**
- Create: `src/features/scheduling/utils/fullcalendar-transforms.ts`

**Step 1: Create the event transform module**

This replaces the "fake Date" timezone hack in `src/hooks/useCalendarEvents.ts`. FullCalendar handles timezones natively — we just pass ISO strings.

```typescript
// src/features/scheduling/utils/fullcalendar-transforms.ts
import type { EventInput } from "@fullcalendar/core";
import type { TimeSlot } from "@/types/scheduling";

/**
 * Determines event background color based on slot state.
 * - Draft (unpublished): slate shades
 * - Full (booked to capacity): blue
 * - Partial (some students booked): amber
 * - Available (no students, published): green
 */
function getSlotColor(slot: TimeSlot): string {
  const lessons = slot.Lesson || [];
  if (!slot.isActive) {
    return lessons.length > 0 ? "#64748b" : "#94a3b8"; // slate-500 / slate-400
  }
  if (lessons.length >= slot.maxStudents) {
    return "#3b82f6"; // blue-500 (full)
  }
  if (lessons.length > 0) {
    return "#fbbf24"; // amber-400 (partial)
  }
  return "#22c55e"; // green-500 (available)
}

/**
 * Builds the event title string from a time slot.
 * Format: "[DRAFT] RinkName - StudentNames (filled/max) [CoachName]"
 */
function buildEventTitle(slot: TimeSlot): string {
  const lessons = slot.Lesson || [];
  let title = slot.Rink?.name || "Unknown Rink";

  if (lessons.length > 0) {
    const names = lessons
      .map((l) => l.Student?.User?.name || "Unknown")
      .filter((n) => n !== "Unknown")
      .join(", ");
    if (names) title += ` - ${names}`;
  }

  title += ` (${lessons.length}/${slot.maxStudents})`;

  if (slot.Coach?.User?.name) {
    title += ` [${slot.Coach.User.name}]`;
  }

  if (!slot.isActive) {
    title = `[DRAFT] ${title}`;
  }

  return title;
}

/**
 * Convert database TimeSlot[] to FullCalendar EventInput[].
 * No timezone hacks — FullCalendar handles timezone display natively
 * when you pass ISO 8601 strings and set the calendar's timeZone prop.
 */
export function timeSlotsToEvents(timeSlots: TimeSlot[]): EventInput[] {
  return timeSlots.map((slot) => ({
    id: slot.id,
    title: buildEventTitle(slot),
    start: typeof slot.startTime === "string" ? slot.startTime : slot.startTime.toISOString(),
    end: typeof slot.endTime === "string" ? slot.endTime : slot.endTime.toISOString(),
    backgroundColor: getSlotColor(slot),
    borderColor: getSlotColor(slot),
    extendedProps: {
      slot, // full slot data for dialog access
      rinkId: slot.rinkId,
      rinkName: slot.Rink?.name,
      rinkTimezone: slot.Rink?.timezone,
      lessonCount: (slot.Lesson || []).length,
      maxStudents: slot.maxStudents,
      isActive: slot.isActive,
      coachName: slot.Coach?.User?.name,
      isDraft: !slot.isActive,
    },
  }));
}

/**
 * Convert blocked date ranges to FullCalendar background events.
 * These show as colored backgrounds (not clickable regular events).
 */
export function blockedDatesToBackgroundEvents(
  blockedRanges: Array<{
    id: string;
    startDate: string | Date;
    endDate: string | Date;
    type: string;
    description?: string | null;
  }>,
): EventInput[] {
  return blockedRanges.map((range) => ({
    id: `blocked-${range.id}`,
    start: typeof range.startDate === "string" ? range.startDate : range.startDate.toISOString(),
    end: typeof range.endDate === "string" ? range.endDate : range.endDate.toISOString(),
    display: "background",
    backgroundColor: range.type === "COMPETITION" ? "rgba(239, 68, 68, 0.15)" : "rgba(148, 163, 184, 0.2)",
    extendedProps: {
      isBlocked: true,
      blockedRange: range,
      type: range.type,
      description: range.description,
    },
  }));
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: PASS (new file, no imports yet)

**Step 3: Commit**

```bash
git add src/features/scheduling/utils/fullcalendar-transforms.ts
git commit -m "feat: add FullCalendar event transform utilities"
```

---

### Task 3: Create Schedule State Reducer

**Files:**
- Create: `src/features/scheduling/context/schedule-state.ts`

**Step 1: Create the reducer**

This replaces the 22 `useState` calls in ScheduleManager with a single reducer.

```typescript
// src/features/scheduling/context/schedule-state.ts
import type { TimeSlot } from "@/types/scheduling";

export type CalendarView = "timeGridWeek" | "timeGridDay" | "dayGridMonth";

export interface ScheduleState {
  // Calendar navigation
  currentDate: Date;
  view: CalendarView;

  // Filters
  selectedRinkId: string | undefined;
  selectedCoachId: string | undefined;
  timezoneFilter: string;

  // Bulk selection
  isSelectionMode: boolean;
  selectedSlotIds: Set<string>;

  // Active dialogs (which one is open, with what data)
  activeDialog:
    | { type: "none" }
    | { type: "create"; date: Date | null; time: string | null; isBlockedDate: boolean }
    | { type: "manage"; slot: TimeSlot }
    | { type: "bulkCreate" }
    | { type: "blockedDate"; range: any };
}

export type ScheduleAction =
  | { type: "SET_DATE"; date: Date }
  | { type: "SET_VIEW"; view: CalendarView }
  | { type: "NAVIGATE_PREV" }
  | { type: "NAVIGATE_NEXT" }
  | { type: "NAVIGATE_TODAY" }
  | { type: "SET_RINK"; rinkId: string | undefined }
  | { type: "SET_COACH"; coachId: string | undefined }
  | { type: "SET_TIMEZONE_FILTER"; timezone: string }
  | { type: "TOGGLE_SELECTION_MODE" }
  | { type: "TOGGLE_SLOT_SELECTION"; slotId: string }
  | { type: "SELECT_ALL_SLOTS"; slotIds: string[] }
  | { type: "CLEAR_SELECTION" }
  | { type: "OPEN_CREATE_DIALOG"; date: Date | null; time: string | null; isBlockedDate?: boolean }
  | { type: "OPEN_MANAGE_DIALOG"; slot: TimeSlot }
  | { type: "OPEN_BULK_CREATE" }
  | { type: "OPEN_BLOCKED_DATE_DIALOG"; range: any }
  | { type: "CLOSE_DIALOG" };

export const initialScheduleState: ScheduleState = {
  currentDate: new Date(),
  view: "timeGridWeek",
  selectedRinkId: undefined,
  selectedCoachId: undefined,
  timezoneFilter: "America/Los_Angeles",
  isSelectionMode: false,
  selectedSlotIds: new Set(),
  activeDialog: { type: "none" },
};

export function scheduleReducer(state: ScheduleState, action: ScheduleAction): ScheduleState {
  switch (action.type) {
    case "SET_DATE":
      return { ...state, currentDate: action.date };

    case "SET_VIEW":
      return { ...state, view: action.view };

    case "NAVIGATE_PREV": {
      const d = new Date(state.currentDate);
      if (state.view === "dayGridMonth") d.setMonth(d.getMonth() - 1);
      else if (state.view === "timeGridWeek") d.setDate(d.getDate() - 7);
      else d.setDate(d.getDate() - 1);
      return { ...state, currentDate: d };
    }

    case "NAVIGATE_NEXT": {
      const d = new Date(state.currentDate);
      if (state.view === "dayGridMonth") d.setMonth(d.getMonth() + 1);
      else if (state.view === "timeGridWeek") d.setDate(d.getDate() + 7);
      else d.setDate(d.getDate() + 1);
      return { ...state, currentDate: d };
    }

    case "NAVIGATE_TODAY":
      return { ...state, currentDate: new Date(), view: "timeGridDay" };

    case "SET_RINK":
      return { ...state, selectedRinkId: action.rinkId };

    case "SET_COACH":
      return { ...state, selectedCoachId: action.coachId };

    case "SET_TIMEZONE_FILTER":
      return { ...state, timezoneFilter: action.timezone };

    case "TOGGLE_SELECTION_MODE":
      return {
        ...state,
        isSelectionMode: !state.isSelectionMode,
        selectedSlotIds: new Set(),
      };

    case "TOGGLE_SLOT_SELECTION": {
      const next = new Set(state.selectedSlotIds);
      if (next.has(action.slotId)) next.delete(action.slotId);
      else next.add(action.slotId);
      return { ...state, selectedSlotIds: next };
    }

    case "SELECT_ALL_SLOTS":
      return { ...state, selectedSlotIds: new Set(action.slotIds) };

    case "CLEAR_SELECTION":
      return { ...state, selectedSlotIds: new Set() };

    case "OPEN_CREATE_DIALOG":
      return {
        ...state,
        activeDialog: {
          type: "create",
          date: action.date,
          time: action.time,
          isBlockedDate: action.isBlockedDate ?? false,
        },
      };

    case "OPEN_MANAGE_DIALOG":
      return { ...state, activeDialog: { type: "manage", slot: action.slot } };

    case "OPEN_BULK_CREATE":
      return { ...state, activeDialog: { type: "bulkCreate" } };

    case "OPEN_BLOCKED_DATE_DIALOG":
      return { ...state, activeDialog: { type: "blockedDate", range: action.range } };

    case "CLOSE_DIALOG":
      return { ...state, activeDialog: { type: "none" } };

    default:
      return state;
  }
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/features/scheduling/context/schedule-state.ts
git commit -m "feat: add schedule state reducer replacing 22 useState calls"
```

---

### Task 4: Create Schedule Context Provider

**Files:**
- Create: `src/features/scheduling/context/ScheduleContext.tsx`

**Step 1: Create the context**

```typescript
// src/features/scheduling/context/ScheduleContext.tsx
"use client";

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import {
  type ScheduleAction,
  type ScheduleState,
  initialScheduleState,
  scheduleReducer,
} from "./schedule-state";

interface ScheduleContextValue {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(scheduleReducer, initialScheduleState);

  return (
    <ScheduleContext.Provider value={{ state, dispatch }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useScheduleContext() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) {
    throw new Error("useScheduleContext must be used within a ScheduleProvider");
  }
  return ctx;
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/features/scheduling/context/ScheduleContext.tsx
git commit -m "feat: add ScheduleContext provider with useReducer"
```

---

### Task 5: Create Custom Event Content Renderer

**Files:**
- Create: `src/features/scheduling/components/calendar/FCEventContent.tsx`

**Step 1: Create the component**

This renders custom content inside each FullCalendar event. Replaces the inline `EventComponent` in the old DesktopCalendarView.

```tsx
// src/features/scheduling/components/calendar/FCEventContent.tsx
"use client";

import type { EventContentArg } from "@fullcalendar/core";
import { cn } from "@/lib/utils";

/**
 * Custom event content for FullCalendar.
 * Shows rink name, student names, capacity, and coach.
 * Adapts display based on event height (time grid vs month grid).
 */
export function FCEventContent({ event, timeText }: EventContentArg) {
  const props = event.extendedProps;
  const isDraft = props.isDraft;
  const lessonCount = props.lessonCount ?? 0;
  const maxStudents = props.maxStudents ?? 1;

  return (
    <div className={cn("px-1 py-0.5 h-full overflow-hidden text-white", isDraft && "opacity-75")}>
      {/* Time display */}
      <div className="text-[10px] font-medium leading-tight">{timeText}</div>

      {/* Rink name */}
      <div className="text-xs font-semibold leading-tight truncate">
        {isDraft && <span className="text-[9px] uppercase mr-1">Draft</span>}
        {props.rinkName || "Unknown"}
      </div>

      {/* Capacity indicator */}
      <div className="text-[10px] leading-tight opacity-90">
        {lessonCount}/{maxStudents} students
      </div>

      {/* Coach name (when multi-coach view) */}
      {props.coachName && (
        <div className="text-[10px] leading-tight opacity-80 truncate">
          {props.coachName}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/features/scheduling/components/calendar/FCEventContent.tsx
git commit -m "feat: add custom event content renderer for FullCalendar"
```

---

### Task 6: Create the New ScheduleCalendar Component

**Files:**
- Create: `src/features/scheduling/components/calendar/ScheduleCalendar.tsx`

**Step 1: Create the main calendar component**

This is the core replacement for the 819-line ScheduleManager. It orchestrates FullCalendar, handles interactions, and delegates to dialogs.

```tsx
// src/features/scheduling/components/calendar/ScheduleCalendar.tsx
"use client";

import { useCallback, useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { toast } from "sonner";
import { useScheduleContext } from "@/features/scheduling/context/ScheduleContext";
import { useScheduleActions } from "@/hooks/useScheduleActions";
import { useTimeSlots } from "@/hooks/useTimeSlots";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { api } from "@/lib/api";
import type { TimeSlot } from "@/types/scheduling";
import {
  timeSlotsToEvents,
  blockedDatesToBackgroundEvents,
} from "@/features/scheduling/utils/fullcalendar-transforms";
import { FCEventContent } from "./FCEventContent";
import { CalendarToolbar } from "./CalendarToolbar";
import { MobileScheduleList } from "./MobileScheduleList";
import { endOfDay, startOfDay } from "date-fns";
import { DateTime } from "luxon";

export function ScheduleCalendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const { state, dispatch } = useScheduleContext();
  const { updateTimeSlot } = useScheduleActions();
  const { coachId: currentUserCoachId } = useCurrentUser();
  const isMobile = useIsMobile();

  // Auto-select coach on mount
  useMemo(() => {
    if (currentUserCoachId && !state.selectedCoachId) {
      dispatch({ type: "SET_COACH", coachId: currentUserCoachId });
    }
  }, [currentUserCoachId, state.selectedCoachId, dispatch]);

  // Calculate date range for data fetching
  const dateRange = useMemo(() => {
    const d = state.currentDate;
    if (state.view === "timeGridWeek") {
      const dt = DateTime.fromJSDate(d);
      const weekday = dt.weekday;
      const startOfWeek = dt.minus({ days: weekday === 1 ? 0 : weekday - 1 });
      return { start: startOfDay(startOfWeek.toJSDate()), end: endOfDay(startOfWeek.plus({ days: 6 }).toJSDate()) };
    }
    if (state.view === "timeGridDay") {
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    // Month view
    const year = d.getFullYear();
    const month = d.getMonth();
    return { start: startOfDay(new Date(year, month, 1)), end: endOfDay(new Date(year, month + 1, 0)) };
  }, [state.currentDate, state.view]);

  // Fetch data
  const { rinks, timeSlots } = useTimeSlots(dateRange, state.selectedRinkId, state.selectedCoachId);
  const { data: blockedDateRanges = [] } = api.admin.schedule.getBlockedDates.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    ...(state.selectedCoachId && { coachId: state.selectedCoachId }),
  });
  const { data: coachesData } = api.admin.coach.management.getAllCoaches.useQuery();
  const activeCoaches = useMemo(
    () => coachesData?.coaches?.filter((c: any) => c.isApproved && c.isActive),
    [coachesData],
  );

  // Filter time slots by timezone when viewing all rinks
  const filteredTimeSlots = useMemo(() => {
    if (!timeSlots) return [];
    if (state.selectedRinkId) return timeSlots;
    return timeSlots.filter((slot) => slot.Rink?.timezone === state.timezoneFilter);
  }, [timeSlots, state.selectedRinkId, state.timezoneFilter]);

  // Determine rink timezone for FullCalendar
  const calendarTimezone = useMemo(() => {
    if (state.selectedRinkId && rinks) {
      const rink = rinks.find((r: { id: string; timezone: string }) => r.id === state.selectedRinkId);
      return rink?.timezone || state.timezoneFilter;
    }
    return state.timezoneFilter;
  }, [state.selectedRinkId, rinks, state.timezoneFilter]);

  // Transform to FullCalendar events
  const calendarEvents = useMemo(() => {
    const slotEvents = timeSlotsToEvents(filteredTimeSlots);
    const blockedEvents = blockedDatesToBackgroundEvents(blockedDateRanges);
    return [...slotEvents, ...blockedEvents];
  }, [filteredTimeSlots, blockedDateRanges]);

  // --- Interaction Handlers ---

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    // Check if selection is on a blocked date
    const isBlocked = blockedDateRanges.some((range) => {
      const start = new Date(range.startDate);
      const end = new Date(range.endDate);
      return selectInfo.start >= start && selectInfo.start <= end;
    });

    const time = `${selectInfo.start.getHours().toString().padStart(2, "0")}:${selectInfo.start.getMinutes().toString().padStart(2, "0")}`;
    dispatch({ type: "OPEN_CREATE_DIALOG", date: selectInfo.start, time, isBlockedDate: isBlocked });
  }, [blockedDateRanges, dispatch]);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const props = clickInfo.event.extendedProps;

    if (props.isBlocked) {
      dispatch({ type: "OPEN_BLOCKED_DATE_DIALOG", range: props.blockedRange });
      return;
    }

    // In selection mode, toggle selection instead of opening dialog
    if (state.isSelectionMode) {
      dispatch({ type: "TOGGLE_SLOT_SELECTION", slotId: clickInfo.event.id });
      return;
    }

    if (props.slot) {
      dispatch({ type: "OPEN_MANAGE_DIALOG", slot: props.slot as TimeSlot });
    }
  }, [state.isSelectionMode, dispatch]);

  const handleEventDrop = useCallback((dropInfo: EventDropArg) => {
    const props = dropInfo.event.extendedProps;
    if (props.isBlocked) {
      dropInfo.revert();
      return;
    }

    const start = dropInfo.event.start;
    const end = dropInfo.event.end;
    if (start && end) {
      updateTimeSlot.mutate({
        id: dropInfo.event.id,
        startTime: start,
        endTime: end,
      });
    }
  }, [updateTimeSlot]);

  const handleEventResize = useCallback((resizeInfo: EventResizeDoneArg) => {
    const start = resizeInfo.event.start;
    const end = resizeInfo.event.end;
    if (start && end) {
      updateTimeSlot.mutate({
        id: resizeInfo.event.id,
        startTime: start,
        endTime: end,
      });
    }
  }, [updateTimeSlot]);

  // Sync FullCalendar navigation with our state
  const handleDatesSet = useCallback((dateInfo: { start: Date; view: { type: string } }) => {
    // FullCalendar tells us when dates change (via internal nav or API)
    dispatch({ type: "SET_DATE", date: dateInfo.start });
  }, [dispatch]);

  // --- Render ---

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4">
        <CalendarToolbar
          rinks={rinks}
          coaches={activeCoaches}
          filteredTimeSlots={filteredTimeSlots}
        />
        <MobileScheduleList
          timeSlots={filteredTimeSlots}
          timezone={calendarTimezone}
          onSlotClick={(slot) => dispatch({ type: "OPEN_MANAGE_DIALOG", slot })}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CalendarToolbar
        rinks={rinks}
        coaches={activeCoaches}
        filteredTimeSlots={filteredTimeSlots}
      />
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={state.view}
          initialDate={state.currentDate}
          timeZone={calendarTimezone}
          headerToolbar={false}
          selectable={!state.isSelectionMode}
          editable={!state.isSelectionMode}
          eventResizableFromStart={false}
          slotDuration="00:15:00"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator={true}
          events={calendarEvents}
          eventContent={FCEventContent}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          datesSet={handleDatesSet}
          height="auto"
          expandRows={true}
          stickyHeaderDates={true}
          dayMaxEvents={3}
        />
      </div>
    </div>
  );
}
```

**Step 2: Verify build (may have import issues — fix in next task)**

Run: `pnpm type-check`
Expected: May show errors for CalendarToolbar and MobileScheduleList which don't exist yet — that's fine, we create them next.

**Step 3: Commit**

```bash
git add src/features/scheduling/components/calendar/ScheduleCalendar.tsx
git commit -m "feat: add main ScheduleCalendar component using FullCalendar"
```

---

### Task 7: Create CalendarToolbar Component

**Files:**
- Create: `src/features/scheduling/components/calendar/CalendarToolbar.tsx`

**Step 1: Create the toolbar**

This replaces the old `ScheduleHeader` + `DateRangeFilter` + `BulkActionsToolbar` combination with a unified toolbar.

```tsx
// src/features/scheduling/components/calendar/CalendarToolbar.tsx
"use client";

import { Calendar, ChevronLeft, ChevronRight, CheckSquare, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScheduleContext } from "@/features/scheduling/context/ScheduleContext";
import type { CalendarView } from "@/features/scheduling/context/schedule-state";
import type { TimeSlot } from "@/types/scheduling";

interface CalendarToolbarProps {
  rinks: Array<{ id: string; name: string; timezone: string }> | undefined;
  coaches: Array<{ id: string; User: { name: string | null } }> | undefined;
  filteredTimeSlots: TimeSlot[];
}

const VIEW_OPTIONS: { label: string; value: CalendarView }[] = [
  { label: "Week", value: "timeGridWeek" },
  { label: "Day", value: "timeGridDay" },
  { label: "Month", value: "dayGridMonth" },
];

export function CalendarToolbar({ rinks, coaches, filteredTimeSlots }: CalendarToolbarProps) {
  const { state, dispatch } = useScheduleContext();

  const dateLabel = format(state.currentDate, state.view === "dayGridMonth" ? "MMMM yyyy" : "MMM d, yyyy");
  const draftCount = filteredTimeSlots.filter((s) => !s.isActive).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Navigation + View + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => dispatch({ type: "NAVIGATE_TODAY" })}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => dispatch({ type: "NAVIGATE_PREV" })}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => dispatch({ type: "NAVIGATE_NEXT" })}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg">{dateLabel}</span>
          {draftCount > 0 && (
            <Badge variant="secondary" size="sm">{draftCount} drafts</Badge>
          )}
        </div>

        {/* Right: View switcher + actions */}
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex border rounded-md overflow-hidden">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => dispatch({ type: "SET_VIEW", view: opt.value })}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  state.view === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Bulk select toggle */}
          <Button
            variant={state.isSelectionMode ? "default" : "outline"}
            size="sm"
            onClick={() => dispatch({ type: "TOGGLE_SELECTION_MODE" })}
          >
            {state.isSelectionMode ? <X className="h-4 w-4 mr-1" /> : <CheckSquare className="h-4 w-4 mr-1" />}
            {state.isSelectionMode ? "Exit Select" : "Select"}
          </Button>

          {/* Bulk create */}
          <Button size="sm" onClick={() => dispatch({ type: "OPEN_BULK_CREATE" })}>
            <Plus className="h-4 w-4 mr-1" />
            Bulk Create
          </Button>
        </div>
      </div>

      {/* Row 2: Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Rink filter */}
        <Select
          value={state.selectedRinkId || "all"}
          onValueChange={(v) => dispatch({ type: "SET_RINK", rinkId: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-[180px] h-8">
            <SelectValue placeholder="All Rinks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rinks</SelectItem>
            {rinks?.map((rink) => (
              <SelectItem key={rink.id} value={rink.id}>{rink.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Coach filter */}
        {coaches && coaches.length > 1 && (
          <Select
            value={state.selectedCoachId || "all"}
            onValueChange={(v) => dispatch({ type: "SET_COACH", coachId: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="All Coaches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Coaches</SelectItem>
              {coaches.map((coach) => (
                <SelectItem key={coach.id} value={coach.id}>{coach.User?.name || "Unknown"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Selection mode info */}
        {state.isSelectionMode && state.selectedSlotIds.size > 0 && (
          <Badge variant="secondary">
            {state.selectedSlotIds.size} selected
          </Badge>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `pnpm type-check`

**Step 3: Commit**

```bash
git add src/features/scheduling/components/calendar/CalendarToolbar.tsx
git commit -m "feat: add unified CalendarToolbar component"
```

---

### Task 8: Create MobileScheduleList Component

**Files:**
- Create: `src/features/scheduling/components/calendar/MobileScheduleList.tsx`

**Step 1: Create mobile list view**

Replaces the old `MobileCalendarView` with a cleaner grouped-by-day list.

```tsx
// src/features/scheduling/components/calendar/MobileScheduleList.tsx
"use client";

import { DateTime } from "luxon";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { TimeSlot } from "@/types/scheduling";

interface MobileScheduleListProps {
  timeSlots: TimeSlot[];
  timezone: string;
  onSlotClick: (slot: TimeSlot) => void;
}

export function MobileScheduleList({ timeSlots, timezone, onSlotClick }: MobileScheduleListProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, TimeSlot[]>();
    for (const slot of timeSlots) {
      const dt = DateTime.fromISO(
        typeof slot.startTime === "string" ? slot.startTime : slot.startTime.toISOString(),
        { zone: "utc" },
      ).setZone(timezone);
      const key = dt.toFormat("yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    // Sort by date
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [timeSlots, timezone]);

  if (grouped.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No time slots in this period.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([dateKey, slots]) => {
        const dt = DateTime.fromISO(dateKey);
        return (
          <div key={dateKey}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              {dt.toFormat("EEEE, MMM d")}
            </h3>
            <div className="space-y-2">
              {slots.map((slot) => {
                const start = DateTime.fromISO(
                  typeof slot.startTime === "string" ? slot.startTime : slot.startTime.toISOString(),
                  { zone: "utc" },
                ).setZone(timezone);
                const end = DateTime.fromISO(
                  typeof slot.endTime === "string" ? slot.endTime : slot.endTime.toISOString(),
                  { zone: "utc" },
                ).setZone(timezone);
                const lessons = slot.Lesson || [];

                return (
                  <Card
                    key={slot.id}
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSlotClick(slot)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          {start.toFormat("h:mm a")} - {end.toFormat("h:mm a")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {slot.Rink?.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!slot.isActive && <Badge variant="secondary" size="sm">Draft</Badge>}
                        <Badge
                          variant={lessons.length >= slot.maxStudents ? "default" : "outline"}
                          size="sm"
                        >
                          {lessons.length}/{slot.maxStudents}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `pnpm type-check`

**Step 3: Commit**

```bash
git add src/features/scheduling/components/calendar/MobileScheduleList.tsx
git commit -m "feat: add mobile schedule list view"
```

---

### Task 9: Create the New ScheduleManager Wrapper

**Files:**
- Create: `src/features/admin/components/scheduling/NewScheduleManager.tsx`

**Step 1: Create wrapper that combines context + calendar + dialogs**

This is the new entry point that replaces the old `ScheduleManager`. It wraps everything in the ScheduleProvider and renders the calendar plus all dialog components.

```tsx
// src/features/admin/components/scheduling/NewScheduleManager.tsx
"use client";

import { ScheduleProvider, useScheduleContext } from "@/features/scheduling/context/ScheduleContext";
import { ScheduleCalendar } from "@/features/scheduling/components/calendar/ScheduleCalendar";
import { CompactTimeSlotDialog } from "./CompactTimeSlotDialog";
import { TimeSlotDialogAdapter } from "./TimeSlotDialogAdapter";
import BlockedDateDialog from "./BlockedDateDialog";
import { BulkCreateSlotsDialog } from "./DialogComponents";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { useScheduleActions } from "@/hooks/useScheduleActions";

function ScheduleDialogs() {
  const { state, dispatch } = useScheduleContext();
  const { deleteBulkTimeSlots } = useScheduleActions();

  const closeDialog = () => dispatch({ type: "CLOSE_DIALOG" });

  return (
    <>
      {/* Create Time Slot Dialog */}
      {state.activeDialog.type === "create" && (
        <CompactTimeSlotDialog
          isOpen={true}
          onClose={closeDialog}
          selectedDate={state.activeDialog.date}
          selectedTime={state.activeDialog.time}
          preSelectedRinkId={state.selectedRinkId}
          isBlockedDate={state.activeDialog.isBlockedDate}
        />
      )}

      {/* Manage Time Slot Dialog */}
      {state.activeDialog.type === "manage" && (
        <TimeSlotDialogAdapter
          slot={state.activeDialog.slot}
          isOpen={true}
          onClose={closeDialog}
        />
      )}

      {/* Bulk Create Dialog */}
      {state.activeDialog.type === "bulkCreate" && (
        <BulkCreateSlotsDialog
          isOpen={true}
          onClose={closeDialog}
        />
      )}

      {/* Blocked Date Dialog */}
      {state.activeDialog.type === "blockedDate" && (
        <BlockedDateDialog
          isOpen={true}
          onClose={closeDialog}
          blockedRange={state.activeDialog.range}
        />
      )}

      {/* Bulk Actions (selection mode toolbar at bottom) */}
      {state.isSelectionMode && state.selectedSlotIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <BulkActionsToolbar
            isSelectionMode={true}
            selectedCount={state.selectedSlotIds.size}
            onToggleSelectionMode={() => dispatch({ type: "TOGGLE_SELECTION_MODE" })}
            onSelectAll={() => {/* populated by parent */}}
            onClearSelection={() => dispatch({ type: "CLEAR_SELECTION" })}
            onBulkDelete={() => {
              deleteBulkTimeSlots.mutate({ ids: [...state.selectedSlotIds] });
              dispatch({ type: "CLEAR_SELECTION" });
              dispatch({ type: "TOGGLE_SELECTION_MODE" });
            }}
            isDeleting={deleteBulkTimeSlots.isPending}
          />
        </div>
      )}
    </>
  );
}

export function NewScheduleManager() {
  return (
    <ScheduleProvider>
      <ScheduleCalendar />
      <ScheduleDialogs />
    </ScheduleProvider>
  );
}
```

**Step 2: Verify build**

Run: `pnpm type-check`
Expected: May have some type mismatches with dialog props (CompactTimeSlotDialog, TimeSlotDialogAdapter, etc. have slightly different prop shapes). Fix these by adjusting prop passing to match existing dialog APIs.

**Step 3: Commit**

```bash
git add src/features/admin/components/scheduling/NewScheduleManager.tsx
git commit -m "feat: add NewScheduleManager wrapper with context and dialogs"
```

---

### Task 10: Swap New Calendar into the Admin Schedule Page

**Files:**
- Modify: `src/app/(protected)/admin/schedule/page.tsx`

**Step 1: Replace old ScheduleManager with new one**

Change the dynamic import to use `NewScheduleManager`:

```tsx
// src/app/(protected)/admin/schedule/page.tsx
"use client";

import dynamic from "next/dynamic";
import { CalendarSkeleton } from "@/components/ui/loading-skeleton";

const NewScheduleManager = dynamic(
  () =>
    import("@/features/admin/components/scheduling/NewScheduleManager").then(
      (mod) => ({ default: mod.NewScheduleManager }),
    ),
  {
    ssr: false,
    loading: () => <CalendarSkeleton />,
  },
);

export default function AdminSchedulePage() {
  return (
    <div className="flex flex-col gap-4">
      <NewScheduleManager />
    </div>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build passes. If there are type errors from dialog prop mismatches, fix them by aligning the prop interfaces.

**Step 3: Visual verification**

Run: `pnpm dev`
Navigate to `/admin/schedule` and verify:
- Calendar renders with week view
- Events show with correct colors
- Clicking empty cell opens create dialog
- Clicking event opens manage dialog
- Drag-drop moves events
- Resize changes duration
- Toolbar navigation works (prev/next/today)
- View switching works (week/day/month)
- Rink filter works
- Coach filter works

**Step 4: Commit**

```bash
git add src/app/(protected)/admin/schedule/page.tsx
git commit -m "feat: swap admin schedule to use FullCalendar-based NewScheduleManager"
```

---

### Task 11: Add FullCalendar CSS and Clean Up Old Calendar

**Files:**
- Modify: `src/styles/globals.css` (add FullCalendar theme overrides)
- After verification: Remove `react-big-calendar` from package.json

**Step 1: Add FullCalendar theme overrides to globals.css**

Add at end of `src/styles/globals.css`:

```css
/* FullCalendar Theme Overrides */
.fc {
  --fc-border-color: hsl(var(--border));
  --fc-today-bg-color: hsl(var(--accent) / 0.05);
  --fc-now-indicator-color: hsl(var(--primary));
  --fc-event-border-color: transparent;
  font-family: inherit;
}

.fc .fc-col-header-cell {
  padding: 8px 0;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
}

.fc .fc-timegrid-slot {
  height: 2.5rem;
}

.fc .fc-event {
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.fc .fc-event:hover {
  filter: brightness(0.9);
}

.fc .fc-daygrid-day-number {
  font-size: 0.875rem;
  padding: 4px 8px;
}

.fc .fc-bg-event {
  opacity: 1;
}
```

**Step 2: Verify the calendar looks correct**

Run: `pnpm dev`
Check that colors, borders, and spacing look good with the brand theme.

**Step 3: Remove old react-big-calendar dependency**

Run: `pnpm remove react-big-calendar @types/react-big-calendar`

**Step 4: Fix any remaining imports**

Search for any remaining `react-big-calendar` imports:
Run: `grep -r "react-big-calendar" src/`

Remove or update files still importing from react-big-calendar. The old `DesktopCalendarView`, `MobileCalendarView`, and `useCalendarEvents` hook can be deleted once the coach and student calendars are also migrated (Task 12).

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add FullCalendar CSS overrides and remove react-big-calendar"
```

---

### Task 12: Migrate Coach and Student Calendars

**Files:**
- Modify: `src/features/coach/components/schedule/CoachScheduleManager.tsx` — use FullCalendar in read-only mode
- Modify: `src/features/student/components/booking/BookingCalendar.tsx` — use FullCalendar for booking view

**Step 1: Update Coach Calendar**

The coach calendar is read-only (no drag/drop, no create). Replace react-big-calendar usage with FullCalendar in read-only mode:

Set `editable={false}` and `selectable={false}`. Keep `eventClick` to open the read-only dialog.

**Step 2: Update Student Booking Calendar**

The student booking calendar is also non-editable. Replace with FullCalendar:
- `editable={false}`, `selectable={false}`
- `eventClick` opens booking dialog for available slots, shows toast for full slots

**Step 3: Delete old files that are no longer needed**

- `src/features/scheduling/components/display/DesktopCalendarView.tsx`
- `src/features/scheduling/components/display/MobileTimeSlotList.tsx`
- `src/hooks/useCalendarEvents.ts` (the "fake Date" hook)
- `src/lib/calendar/calendarLocalizer.ts`

**Step 4: Verify build**

Run: `pnpm build`
Expected: PASS with no react-big-calendar references remaining.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: migrate coach and student calendars to FullCalendar, remove old calendar code"
```

---

### Task 13: Full Build Verification for Phase 1

**Step 1:** Run `pnpm build`
**Step 2:** Run `pnpm type-check`
**Step 3:** Run `pnpm lint`

Fix any issues. This is the Phase 1 checkpoint.

**Step 4: Final commit for Phase 1 if fixes needed**

```bash
git add -A
git commit -m "fix: resolve type/lint issues from calendar migration"
```

---

## Phase 2: Admin Dashboard Redesign

### Task 14: Create Today's Timeline Component

**Files:**
- Create: `src/features/admin/components/dashboard/TodayTimeline.tsx`

**Step 1: Create the component**

A horizontal timeline showing today's lessons as blocks (like a Gantt for one day).

```tsx
// src/features/admin/components/dashboard/TodayTimeline.tsx
"use client";

import { format } from "date-fns";
import { DateTime } from "luxon";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export function TodayTimeline() {
  const today = useMemo(() => new Date(), []);
  const { data: timeSlots = [], isLoading } = api.admin.schedule.getTimeSlots.useQuery({
    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
  });

  // Filter to only slots with lessons (scheduled today)
  const todayLessons = useMemo(() => {
    return timeSlots
      .filter((slot) => (slot.Lesson || []).length > 0)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [timeSlots]);

  // Calculate timeline bounds (6am to 10pm default, expand if needed)
  const timelineBounds = useMemo(() => {
    let startHour = 6;
    let endHour = 22;
    for (const slot of todayLessons) {
      const h = new Date(slot.startTime).getHours();
      const eh = new Date(slot.endTime).getHours();
      if (h < startHour) startHour = h;
      if (eh > endHour) endHour = eh + 1;
    }
    return { startHour, endHour };
  }, [todayLessons]);

  const totalMinutes = (timelineBounds.endHour - timelineBounds.startHour) * 60;

  // Current time position
  const now = new Date();
  const nowMinutes = (now.getHours() - timelineBounds.startHour) * 60 + now.getMinutes();
  const nowPercent = Math.max(0, Math.min(100, (nowMinutes / totalMinutes) * 100));

  // Lesson type colors
  const typeColors: Record<string, string> = {
    PRIVATE: "bg-blue-500",
    CHOREOGRAPHY: "bg-purple-500",
    GROUP: "bg-green-500",
    COMPETITION_PREP: "bg-orange-500",
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="font-display text-lg">Today's Schedule</CardTitle></CardHeader>
        <CardContent><div className="h-16 animate-pulse bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg">
          Today's Schedule — {format(today, "EEEE, MMM d")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todayLessons.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No lessons scheduled today.</p>
        ) : (
          <div className="relative">
            {/* Hour markers */}
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              {Array.from({ length: timelineBounds.endHour - timelineBounds.startHour + 1 }, (_, i) => (
                <span key={i}>{format(new Date(2000, 0, 1, timelineBounds.startHour + i), "ha")}</span>
              ))}
            </div>

            {/* Timeline bar */}
            <div className="relative h-12 bg-muted/50 rounded-lg overflow-hidden">
              {/* Current time indicator */}
              {nowPercent > 0 && nowPercent < 100 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                  style={{ left: `${nowPercent}%` }}
                />
              )}

              {/* Lesson blocks */}
              {todayLessons.map((slot) => {
                const lessons = slot.Lesson || [];
                const startMin = (new Date(slot.startTime).getHours() - timelineBounds.startHour) * 60 + new Date(slot.startTime).getMinutes();
                const endMin = (new Date(slot.endTime).getHours() - timelineBounds.startHour) * 60 + new Date(slot.endTime).getMinutes();
                const leftPercent = (startMin / totalMinutes) * 100;
                const widthPercent = ((endMin - startMin) / totalMinutes) * 100;
                const lessonType = lessons[0]?.type || "PRIVATE";
                const studentName = lessons[0]?.Student?.User?.name || "Unknown";

                return (
                  <div
                    key={slot.id}
                    className={`absolute top-1 bottom-1 rounded ${typeColors[lessonType] || "bg-blue-500"} text-white px-1.5 flex items-center overflow-hidden cursor-pointer hover:brightness-110 transition-all`}
                    style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                    title={`${studentName} - ${format(new Date(slot.startTime), "h:mm a")} to ${format(new Date(slot.endTime), "h:mm a")}`}
                  >
                    <span className="text-[10px] font-medium truncate">{studentName}</span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Private</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" />Choreo</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Group</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />Comp</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify build**

Run: `pnpm type-check`

**Step 3: Commit**

```bash
git add src/features/admin/components/dashboard/TodayTimeline.tsx
git commit -m "feat: add TodayTimeline component for admin dashboard"
```

---

### Task 15: Create Enhanced Smart KPI Cards

**Files:**
- Create: `src/features/admin/components/dashboard/SmartKPICards.tsx`

**Step 1: Create enhanced KPI cards with sparklines and actionability**

```tsx
// src/features/admin/components/dashboard/SmartKPICards.tsx
"use client";

import { Calendar, Clock, CreditCard, TrendingUp, Users, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

export function SmartKPICards() {
  const { data: overview, isLoading } = api.admin.analytics.getOverview.useQuery(undefined, {
    refetchInterval: 30000,
  });

  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-4"><div className="h-20 animate-pulse bg-muted rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Today's Schedule",
      value: `${overview.activeLessons || 0} lessons`,
      subtitle: "scheduled today",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      shadowColor: "shadow-blue-200/50",
      href: "/admin/schedule",
    },
    {
      title: "Revenue This Month",
      value: `$${(overview.pendingPayments || 0).toLocaleString()}`,
      subtitle: "pending collection",
      icon: CreditCard,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      shadowColor: "shadow-emerald-200/50",
      href: "/admin/payments",
    },
    {
      title: "Active Students",
      value: `${overview.totalStudents || 0}`,
      subtitle: "enrolled students",
      icon: Users,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      shadowColor: "shadow-violet-200/50",
      href: "/admin/students",
    },
    {
      title: "Pending Actions",
      value: `${overview.pendingPayments || 0}`,
      subtitle: "need attention",
      icon: AlertCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      shadowColor: "shadow-amber-200/50",
      href: "/admin/students",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${card.shadowColor}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
                </div>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `pnpm type-check`

**Step 3: Commit**

```bash
git add src/features/admin/components/dashboard/SmartKPICards.tsx
git commit -m "feat: add SmartKPICards with actionable links"
```

---

### Task 16: Create Quick Actions and Activity Feed

**Files:**
- Create: `src/features/admin/components/dashboard/QuickActions.tsx`
- Create: `src/features/admin/components/dashboard/ActivityFeed.tsx`

**Step 1: Create QuickActions**

```tsx
// src/features/admin/components/dashboard/QuickActions.tsx
"use client";

import { Calendar, CreditCard, UserPlus, BarChart2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickActions() {
  const actions = [
    { label: "Create Time Slot", icon: Calendar, href: "/admin/schedule" },
    { label: "View Payments", icon: CreditCard, href: "/admin/payments" },
    { label: "Manage Students", icon: UserPlus, href: "/admin/students" },
    { label: "View Reports", icon: BarChart2, href: "/admin/reports" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Button key={action.label} variant="outline" className="h-auto py-3 flex-col gap-1" asChild>
            <Link href={action.href}>
              <action.icon className="h-5 w-5" />
              <span className="text-xs">{action.label}</span>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create ActivityFeed**

```tsx
// src/features/admin/components/dashboard/ActivityFeed.tsx
"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export function ActivityFeed() {
  // Use notifications as activity feed (they track bookings, payments, etc.)
  const { data: notifications = [], isLoading } = api.notifications.notifications.getNotifications.useQuery(
    undefined,
    { refetchInterval: 60000 },
  );

  const recentItems = notifications.slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 animate-pulse bg-muted rounded" />
            ))}
          </div>
        ) : recentItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No recent activity.</p>
        ) : (
          <div className="space-y-3">
            {recentItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${item.isRead ? "bg-muted" : "bg-blue-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 3: Verify build**

Run: `pnpm type-check`

**Step 4: Commit**

```bash
git add src/features/admin/components/dashboard/QuickActions.tsx src/features/admin/components/dashboard/ActivityFeed.tsx
git commit -m "feat: add QuickActions and ActivityFeed dashboard components"
```

---

### Task 17: Redesign Admin Dashboard Page

**Files:**
- Modify: `src/app/(protected)/admin/dashboard/page.tsx`

**Step 1: Replace page layout with new components**

Keep existing chart components (RevenueChart, StudentActivityChart) but add the new widgets above them.

```tsx
// src/app/(protected)/admin/dashboard/page.tsx

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { ChartSkeleton, LineChartSkeleton } from "@/components/ui/chart-skeleton";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { SmartKPICards } from "@/features/admin/components/dashboard/SmartKPICards";
import { TodayTimeline } from "@/features/admin/components/dashboard/TodayTimeline";
import { QuickActions } from "@/features/admin/components/dashboard/QuickActions";
import { ActivityFeed } from "@/features/admin/components/dashboard/ActivityFeed";
import { PendingApprovals } from "@/features/admin/components/management/PendingApprovals";

const RevenueChart = dynamic(
  () => import("@/features/admin/components/analytics/RevenueChart").then((mod) => ({ default: mod.RevenueChart })),
  { loading: () => <LineChartSkeleton /> },
);

const StudentActivityChart = dynamic(
  () => import("@/features/admin/components/analytics/StudentActivityChart").then((mod) => ({ default: mod.StudentActivityChart })),
  { loading: () => <ChartSkeleton /> },
);

const CoachOverviewCards = dynamic(
  () => import("@/features/admin/components/analytics/CoachOverviewCards").then((mod) => ({ default: mod.CoachOverviewCards })),
  { loading: () => <LoadingSkeleton /> },
);

const RevenueBreakdownChart = dynamic(
  () => import("@/features/admin/components/analytics/RevenueBreakdownChart").then((mod) => ({ default: mod.RevenueBreakdownChart })),
  { loading: () => <LoadingSkeleton /> },
);

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
        Dashboard
      </h1>

      {/* Smart KPI Cards */}
      <SmartKPICards />

      {/* Today's Timeline */}
      <TodayTimeline />

      {/* Quick Actions + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickActions />
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorBoundary>
          <RevenueChart />
        </ErrorBoundary>
        <ErrorBoundary>
          <StudentActivityChart />
        </ErrorBoundary>
      </div>

      {/* Coaches + Revenue Breakdown */}
      <ErrorBoundary>
        <CoachOverviewCards />
      </ErrorBoundary>
      <ErrorBoundary>
        <RevenueBreakdownChart />
      </ErrorBoundary>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Visual verification**

Run: `pnpm dev` → navigate to `/admin/dashboard`
Verify: KPI cards, timeline, quick actions, activity feed, charts all render.

**Step 4: Commit**

```bash
git add src/app/(protected)/admin/dashboard/page.tsx
git commit -m "feat: redesign admin dashboard with actionable intelligence layout"
```

---

## Phase 3: Student Dashboard Redesign

### Task 18: Create Student Progress Component

**Files:**
- Create: `src/features/student/components/dashboard/StudentProgress.tsx`

**Step 1: Create the component**

Shows: total completed, this-month progress ring, streak, lesson type breakdown.

```tsx
// src/features/student/components/dashboard/StudentProgress.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export function StudentProgress() {
  const { data: stats, isLoading } = api.student.profile.getStudentLessonStats.useQuery();

  if (isLoading || !stats) {
    return (
      <Card>
        <CardContent className="p-4"><div className="h-32 animate-pulse bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  const completed = stats.completedCount || 0;
  const upcoming = stats.upcomingCount || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg">My Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{completed}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{upcoming}</p>
            <p className="text-[10px] text-muted-foreground">Upcoming</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{stats.cancelledCount || 0}</p>
            <p className="text-[10px] text-muted-foreground">Cancelled</p>
          </div>
        </div>

        {/* Weekly progress bar */}
        {stats.weeklyMax && stats.weeklyMax > 0 && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>This week</span>
              <span>{stats.weeklyUsed || 0}/{stats.weeklyMax} lessons</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, ((stats.weeklyUsed || 0) / stats.weeklyMax) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify build**

Run: `pnpm type-check`

**Step 3: Commit**

```bash
git add src/features/student/components/dashboard/StudentProgress.tsx
git commit -m "feat: add StudentProgress component for student dashboard"
```

---

### Task 19: Create Next Lesson Hero Card

**Files:**
- Create: `src/features/student/components/dashboard/NextLessonHero.tsx`

**Step 1: Create the component**

Prominent card highlighting the student's next lesson with countdown.

```tsx
// src/features/student/components/dashboard/NextLessonHero.tsx
"use client";

import { Calendar, Clock, MapPin, User } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

export function NextLessonHero() {
  const { data: lessons = [], isLoading } = api.student.profile.getStudentLessons.useQuery({
    status: "SCHEDULED",
    startDate: new Date(),
    limit: 1,
  });

  const nextLesson = lessons[0];

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="h-20 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!nextLesson) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-3">No upcoming lessons scheduled</p>
          <Button asChild>
            <Link href="/student/book">Book a Lesson</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const lessonDate = new Date(nextLesson.startTime || nextLesson.RinkTimeSlot?.startTime);
  const endDate = new Date(nextLesson.endTime || nextLesson.RinkTimeSlot?.endTime);
  const timeUntil = formatDistanceToNow(lessonDate, { addSuffix: true });
  const lessonType = nextLesson.type || "PRIVATE";

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-primary">Next Lesson</p>
          <Badge variant="outline" size="sm">{timeUntil}</Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{format(lessonDate, "EEEE, MMMM d")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{format(lessonDate, "h:mm a")} - {format(endDate, "h:mm a")}</span>
          </div>
          {nextLesson.RinkTimeSlot?.Rink?.name && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{nextLesson.RinkTimeSlot.Rink.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <Badge>{lessonType.replace("_", " ")}</Badge>
          <Button size="sm" variant="outline" asChild>
            <Link href="/student/book">Book Another</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify build**

Run: `pnpm type-check`

**Step 3: Commit**

```bash
git add src/features/student/components/dashboard/NextLessonHero.tsx
git commit -m "feat: add NextLessonHero card for student dashboard"
```

---

### Task 20: Redesign Student Dashboard Page

**Files:**
- Modify: `src/app/(protected)/student/dashboard/page.tsx`

**Step 1: Replace page with new layout**

```tsx
// src/app/(protected)/student/dashboard/page.tsx
"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/error-boundary";
import { LessonSummary } from "@/features/student/components/dashboard/LessonSummary";
import { NextLessonHero } from "@/features/student/components/dashboard/NextLessonHero";
import { StudentProgress } from "@/features/student/components/dashboard/StudentProgress";
import { UpcomingLessons } from "@/features/student/components/dashboard/UpcomingLessons";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { WarmGreeting } from "@/components/warm-greeting";
import { useSession } from "next-auth/react";

export default function StudentDashboardPage() {
  const user = useCurrentUser();
  const { data: session } = useSession();

  return (
    <div className="flex flex-col gap-6">
      {/* Header with greeting */}
      <div className="flex justify-between items-center">
        <div>
          <WarmGreeting name={session?.user?.name || "Student"} role="student" />
        </div>
        {user.isApproved ? (
          <Button asChild>
            <Link href="/student/book">Book a Lesson</Link>
          </Button>
        ) : (
          <Button disabled variant="outline">Pending Approval</Button>
        )}
      </div>

      {/* Next Lesson Hero */}
      <ErrorBoundary>
        <NextLessonHero />
      </ErrorBoundary>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming lessons (2/3 width) */}
        <div className="lg:col-span-2">
          <ErrorBoundary>
            <UpcomingLessons />
          </ErrorBoundary>
        </div>

        {/* Sidebar (1/3 width) */}
        <div className="space-y-6">
          <ErrorBoundary>
            <StudentProgress />
          </ErrorBoundary>

          {/* Payment info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg">Payment Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Venmo</span>
                <span className="font-medium">@yura-min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zelle</span>
                <span className="font-medium">(714) 743-7071</span>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                <Link href="/student/payments">View Payment History</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add src/app/(protected)/student/dashboard/page.tsx
git commit -m "feat: redesign student dashboard with hero card and progress tracking"
```

---

## Phase 4: Coach Dashboard Redesign

### Task 21: Redesign Coach Dashboard Page

**Files:**
- Modify: `src/app/(protected)/coach/dashboard/page.tsx`

**Step 1: Enhance the coach dashboard layout**

```tsx
// src/app/(protected)/coach/dashboard/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import { ErrorBoundary } from "@/components/error-boundary";
import { WarmGreeting } from "@/components/warm-greeting";
import { CoachOverviewCards } from "@/features/coach/components/dashboard/CoachOverviewCards";
import { CoachPastLessons } from "@/features/coach/components/dashboard/CoachPastLessons";
import { CoachUpcomingLessons } from "@/features/coach/components/dashboard/CoachUpcomingLessons";

export default function CoachDashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <WarmGreeting name={session?.user?.name || "Coach"} role="coach" />

      {/* KPI Cards */}
      <ErrorBoundary>
        <CoachOverviewCards />
      </ErrorBoundary>

      {/* Lessons grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorBoundary>
          <CoachUpcomingLessons />
        </ErrorBoundary>
        <ErrorBoundary>
          <CoachPastLessons />
        </ErrorBoundary>
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build`

**Step 3: Commit**

```bash
git add src/app/(protected)/coach/dashboard/page.tsx
git commit -m "feat: enhance coach dashboard with greeting and error boundaries"
```

---

## Phase 5: Final Verification

### Task 22: Full Build and Cleanup

**Step 1:** `pnpm build` — full production build passes
**Step 2:** `pnpm type-check` — no type errors
**Step 3:** `pnpm lint` — no lint errors (run `pnpm lint:fix` if format-only issues)

**Step 4: Verify IMMUTABLE constraints preserved**

Check:
- Sidebar width `w-64` unchanged
- Main content offset `lg:pl-64` unchanged
- Header gradient unchanged (`from-slate-50 via-blue-50 to-indigo-50`)
- Active nav styling unchanged

**Step 5: Remove dead files (if not already removed)**

- `src/features/scheduling/components/display/DesktopCalendarView.tsx` (old RBC view)
- `src/hooks/useCalendarEvents.ts` (fake Date hook)
- `src/lib/calendar/calendarLocalizer.ts` (RBC localizer)
- Any remaining `react-big-calendar` CSS imports

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and verification for dashboard/calendar overhaul"
```

---

## Important Notes for Implementer

1. **IMMUTABLE per CLAUDE.md**: Sidebar w-64, header gradient, active nav styling — DO NOT MODIFY
2. **TimeSlotDialogAdapter**: The `castToLessons()` function logic is IMMUTABLE. Only the import path for the adapter may change, not its field mapping.
3. **Dialog prop compatibility**: When creating `NewScheduleManager`, the existing dialog components (`CompactTimeSlotDialog`, `TimeSlotDialogAdapter`, `BlockedDateDialog`, `BulkCreateSlotsDialog`) have specific prop APIs. Match those exactly rather than refactoring the dialogs.
4. **Build after each task**: Run `pnpm build` after every task to catch issues early.
5. **The coach calendar** reuses admin calendar components. When migrating, ensure the coach version stays read-only (`editable={false}`).
6. **FullCalendar CSS**: Import `@fullcalendar/core/main.css` is NOT needed — FullCalendar 6 uses CSS custom properties. Use the theme overrides in globals.css instead.
7. **Student booking calendar**: Keep the existing booking validation logic (full slots → toast, past slots → hidden). Only change the calendar rendering library.
