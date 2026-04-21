// src/features/scheduling/components/calendar/ScheduleCalendar.tsx
"use client";

import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import interactionPlugin from "@fullcalendar/interaction";
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

  // Auto-select coach on mount
  useEffect(() => {
    if (currentUserCoachId && !state.selectedCoachId) {
      dispatch({ type: "SET_COACH", coachId: currentUserCoachId });
    }
  }, [currentUserCoachId, state.selectedCoachId, dispatch]);

  // Calculate date range for data fetching — timezone-aware
  const dateRange = useMemo(() => {
    const dt = DateTime.fromJSDate(state.currentDate, { zone: state.timezoneFilter });
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
    // Month view
    return {
      start: dt.startOf("month").startOf("day").toJSDate(),
      end: dt.endOf("month").endOf("day").toJSDate(),
    };
  }, [state.currentDate, state.view, state.timezoneFilter]);

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
    if (!timeSlots) {
      return [];
    }
    if (state.selectedRinkId) {
      return timeSlots;
    }
    return timeSlots.filter((slot) => slot.Rink?.timezone === state.timezoneFilter);
  }, [timeSlots, state.selectedRinkId, state.timezoneFilter]);

  // Determine rink timezone for FullCalendar
  const calendarTimezone = useMemo(() => {
    if (state.selectedRinkId && rinks) {
      const rink = rinks.find(
        (r: { id: string; timezone: string }) => r.id === state.selectedRinkId,
      );
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

  // Sync FullCalendar when our toolbar state changes
  // (our custom toolbar is the sole source of truth since headerToolbar={false})
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) {
      return;
    }
    if (api.view.type !== state.view) {
      api.changeView(state.view, state.currentDate);
    } else {
      api.gotoDate(state.currentDate);
    }
  }, [state.currentDate, state.view]);

  // Dynamic time range — fit to actual event data instead of hardcoded 6am-10pm
  const timeRange = useMemo(() => {
    if (state.view === "dayGridMonth" || !filteredTimeSlots?.length) {
      return { min: "06:00:00", max: "22:00:00" };
    }
    let minHour = 23;
    let maxHour = 0;
    for (const slot of filteredTimeSlots) {
      const startStr =
        typeof slot.startTime === "string" ? slot.startTime : slot.startTime.toISOString();
      const endStr = typeof slot.endTime === "string" ? slot.endTime : slot.endTime.toISOString();
      const startDt = DateTime.fromISO(startStr, { zone: calendarTimezone });
      const endDt = DateTime.fromISO(endStr, { zone: calendarTimezone });
      if (startDt.hour < minHour) {
        minHour = startDt.hour;
      }
      const eh = endDt.minute > 0 ? endDt.hour + 1 : endDt.hour;
      if (eh > maxHour) {
        maxHour = eh;
      }
    }
    // Pad 1 hour on each side, min 4-hour window
    minHour = Math.max(0, minHour - 1);
    maxHour = Math.min(24, maxHour + 1);
    if (maxHour - minHour < 4) {
      const mid = Math.floor((minHour + maxHour) / 2);
      minHour = Math.max(0, mid - 2);
      maxHour = Math.min(24, mid + 2);
    }
    return {
      min: `${String(minHour).padStart(2, "0")}:00:00`,
      max: `${String(maxHour).padStart(2, "0")}:00:00`,
    };
  }, [filteredTimeSlots, calendarTimezone, state.view]);

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
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
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
