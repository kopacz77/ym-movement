// src/features/scheduling/components/calendar/ScheduleCalendar.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
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
  useEffect(() => {
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
      return {
        start: startOfDay(startOfWeek.toJSDate()),
        end: endOfDay(startOfWeek.plus({ days: 6 }).toJSDate()),
      };
    }
    if (state.view === "timeGridDay") {
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    // Month view
    const year = d.getFullYear();
    const month = d.getMonth();
    return {
      start: startOfDay(new Date(year, month, 1)),
      end: endOfDay(new Date(year, month + 1, 0)),
    };
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

  // Sync FullCalendar navigation with our state
  const handleDatesSet = useCallback(
    (dateInfo: { start: Date; view: { type: string } }) => {
      dispatch({ type: "SET_DATE", date: dateInfo.start });
    },
    [dispatch],
  );

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
