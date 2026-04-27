// src/features/scheduling/components/calendar/ScheduleCalendar.tsx
"use client";

import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import interactionPlugin from "@fullcalendar/interaction";
import luxon3Plugin from "@fullcalendar/luxon3";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Globe } from "lucide-react";
import { DateTime } from "luxon";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useScheduleContext } from "@/features/scheduling/context/ScheduleContext";
import {
  blockedDatesToBackgroundEvents,
  timeSlotsToEvents,
} from "@/features/scheduling/utils/fullcalendar-transforms";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useOperationalSettings } from "@/hooks/useOperationalSettings";
import { useScheduleActions } from "@/hooks/useScheduleActions";
import { useTimeSlots } from "@/hooks/useTimeSlots";
import { api } from "@/lib/api";
import type { TimeSlot } from "@/types/scheduling";
import { CalendarToolbar } from "./CalendarToolbar";
import { FCEventContent } from "./FCEventContent";
import { MobileScheduleList } from "./MobileScheduleList";

export function ScheduleCalendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const { state, dispatch } = useScheduleContext();
  const { updateTimeSlot } = useScheduleActions();
  const { coachId: currentUserCoachId } = useCurrentUser();
  const isMobile = useIsMobile();
  const { businessHours } = useOperationalSettings();

  // Auto-select coach on mount
  useEffect(() => {
    if (currentUserCoachId && !state.selectedCoachId) {
      dispatch({ type: "SET_COACH", coachId: currentUserCoachId });
    }
  }, [currentUserCoachId, state.selectedCoachId, dispatch]);

  // Fetch rinks independently (no date range dependency) to determine timezone early
  const { data: rinks } = api.admin.schedule.getRinks.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
  } as any);

  // Determine rink timezone for FullCalendar — computed before dateRange so day
  // boundaries align with the timezone FullCalendar will actually display
  const calendarTimezone = useMemo(() => {
    if (state.selectedRinkId && rinks) {
      const rink = rinks.find(
        (r: { id: string; timezone: string }) => r.id === state.selectedRinkId,
      );
      return rink?.timezone || state.timezoneFilter;
    }
    return state.timezoneFilter;
  }, [state.selectedRinkId, rinks, state.timezoneFilter]);

  // Calculate date range for data fetching — use calendarTimezone so day boundaries
  // align with what FullCalendar actually displays (not the browser's local timezone)
  const dateRange = useMemo(() => {
    const dt = DateTime.fromJSDate(state.currentDate, { zone: calendarTimezone });
    if (state.view === "timeGridWeek") {
      const startOfWeek = dt.startOf("week"); // Monday in Luxon (ISO)
      return {
        start: startOfWeek.startOf("day").toJSDate(),
        end: startOfWeek.plus({ days: 6 }).endOf("day").toJSDate(),
      };
    }
    if (state.view === "timeGridDay") {
      return {
        start: dt.startOf("day").toJSDate(),
        end: dt.endOf("day").toJSDate(),
      };
    }
    // Month view — pad ±7 days so events on partial weeks at edges are visible
    return {
      start: dt.startOf("month").minus({ days: 7 }).startOf("day").toJSDate(),
      end: dt.endOf("month").plus({ days: 7 }).endOf("day").toJSDate(),
    };
  }, [state.currentDate, state.view, calendarTimezone]);

  // Fetch time slots and other data
  const { rinks: _rinksDuplicate, timeSlots } = useTimeSlots(
    dateRange,
    state.selectedRinkId,
    state.selectedCoachId,
  );
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

  // Filter time slots by selected rink (timezone dropdown only controls display, not filtering)
  const filteredTimeSlots = useMemo(() => {
    if (!timeSlots) {
      return [];
    }
    return timeSlots;
  }, [timeSlots]);

  // Transform to FullCalendar events
  const calendarEvents = useMemo(() => {
    const slotEvents = timeSlotsToEvents(filteredTimeSlots);
    const blockedEvents = blockedDatesToBackgroundEvents(blockedDateRanges);
    return [...slotEvents, ...blockedEvents];
  }, [filteredTimeSlots, blockedDateRanges]);

  // --- Interaction Handlers ---

  const handleDateSelect = useCallback(
    (selectInfo: DateSelectArg) => {
      // Check if selection is on a blocked date
      const isBlocked = blockedDateRanges.some((range: any) => {
        const start = new Date(range.startDate);
        const end = new Date(range.endDate);
        return selectInfo.start >= start && selectInfo.start <= end;
      });

      const time = `${selectInfo.start.getHours().toString().padStart(2, "0")}:${selectInfo.start.getMinutes().toString().padStart(2, "0")}`;
      dispatch({
        type: "OPEN_CREATE_DIALOG",
        date: selectInfo.start,
        time,
        isBlockedDate: isBlocked,
      });
    },
    [blockedDateRanges, dispatch],
  );

  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
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
    },
    [state.isSelectionMode, dispatch],
  );

  const handleEventDrop = useCallback(
    (dropInfo: EventDropArg) => {
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
    },
    [updateTimeSlot],
  );

  const handleEventResize = useCallback(
    (resizeInfo: EventResizeDoneArg) => {
      const start = resizeInfo.event.start;
      const end = resizeInfo.event.end;
      if (start && end) {
        updateTimeSlot.mutate({
          id: resizeInfo.event.id,
          startTime: start,
          endTime: end,
        });
      }
    },
    [updateTimeSlot],
  );

  // Sync FullCalendar when our toolbar state changes.
  // Deferred via setTimeout because FullCalendar's API calls use flushSync,
  // which cannot run inside a React useEffect (commit phase).
  useEffect(() => {
    const handle = setTimeout(() => {
      const calApi = calendarRef.current?.getApi();
      if (!calApi) {
        return;
      }
      if (calApi.view.type !== state.view) {
        calApi.changeView(state.view, state.currentDate);
      } else {
        calApi.gotoDate(state.currentDate);
      }
    }, 0);
    return () => clearTimeout(handle);
  }, [state.currentDate, state.view]);

  // Dynamic time range — start with working hours from settings, expand if events fall outside
  const timeRange = useMemo(() => {
    // Month view is date-only; no time axis needed
    if (state.view === "dayGridMonth") {
      return { min: "00:00:00", max: "24:00:00" };
    }

    // Base range from operational settings (e.g. 06:00-18:00)
    let minHour = businessHours.startHour;
    let maxHour = businessHours.endHour;
    // If endMinutes > 0, round the end hour up so the full working period is visible
    if (businessHours.endMinutes > 0) {
      maxHour = Math.min(24, maxHour + 1);
    }

    // Scan events — expand window if any events fall outside working hours
    if (filteredTimeSlots?.length) {
      for (const slot of filteredTimeSlots) {
        const startStr =
          typeof slot.startTime === "string" ? slot.startTime : slot.startTime.toISOString();
        const endStr = typeof slot.endTime === "string" ? slot.endTime : slot.endTime.toISOString();
        const startDt = DateTime.fromISO(startStr, { zone: calendarTimezone });
        const endDt = DateTime.fromISO(endStr, { zone: calendarTimezone });

        // Event starts before working hours — expand with 1-hour padding
        if (startDt.hour < minHour) {
          minHour = Math.max(0, startDt.hour - 1);
        }
        // Event ends after working hours — expand with 1-hour padding
        const eventEndHour = endDt.minute > 0 ? endDt.hour + 1 : endDt.hour;
        if (eventEndHour > maxHour) {
          maxHour = Math.min(24, eventEndHour + 1);
        }
      }
    }

    // Enforce minimum 4-hour window for readability
    if (maxHour - minHour < 4) {
      const mid = Math.floor((minHour + maxHour) / 2);
      minHour = Math.max(0, mid - 2);
      maxHour = Math.min(24, mid + 2);
    }

    return {
      min: `${String(minHour).padStart(2, "0")}:00:00`,
      max: `${String(maxHour).padStart(2, "0")}:00:00`,
    };
  }, [filteredTimeSlots, calendarTimezone, state.view, businessHours]);

  // --- Render ---

  // Timezone banner - show when a specific rink is selected
  const timezoneBanner = state.selectedRinkId ? (
    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-center text-amber-800 text-sm">
      <Globe className="h-4 w-4 mr-2 shrink-0" />
      <span suppressHydrationWarning>
        All times shown in {calendarTimezone.split("/").pop()?.replace("_", " ")} local time
      </span>
    </div>
  ) : null;

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4">
        <CalendarToolbar
          rinks={rinks}
          coaches={activeCoaches}
          filteredTimeSlots={filteredTimeSlots}
        />
        {timezoneBanner}
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
      {timezoneBanner}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <FullCalendar
          key={calendarTimezone}
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, luxon3Plugin]}
          initialView={state.view}
          initialDate={state.currentDate}
          timeZone={calendarTimezone}
          headerToolbar={false}
          firstDay={1}
          selectable={!state.isSelectionMode}
          editable={!state.isSelectionMode}
          eventResizableFromStart={false}
          slotDuration="00:15:00"
          slotMinTime={timeRange.min}
          slotMaxTime={timeRange.max}
          allDaySlot={false}
          nowIndicator={true}
          events={calendarEvents}
          eventContent={FCEventContent}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          height="auto"
          expandRows={true}
          stickyHeaderDates={true}
          dayMaxEvents={3}
        />
      </div>
    </div>
  );
}
