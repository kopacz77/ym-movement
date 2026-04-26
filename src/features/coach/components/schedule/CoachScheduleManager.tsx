"use client";

import type { EventClickArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import luxon3Plugin from "@fullcalendar/luxon3";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { endOfDay, startOfDay } from "date-fns";
import { Globe, Plane } from "lucide-react";
import { DateTime } from "luxon";
import { memo, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeSlotDialogAdapter } from "@/features/admin/components/scheduling/TimeSlotDialogAdapter";
import { useCoachTimeSlots } from "@/features/coach/hooks/useCoachTimeSlots";
import { FCEventContent } from "@/features/scheduling/components/calendar/FCEventContent";
import { MobileScheduleList } from "@/features/scheduling/components/calendar/MobileScheduleList";
import {
  blockedDatesToBackgroundEvents,
  timeSlotsToEvents,
} from "@/features/scheduling/utils/fullcalendar-transforms";
import { useIsMobile } from "@/hooks/useMediaQuery";
import type { TimeSlot } from "@/types/scheduling";
import { CoachBlockedDates } from "./CoachBlockedDates";

interface Rink {
  id: string;
  name: string;
  timezone: string;
  address?: string;
}

const TIMEZONE_FILTERS = [
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/New_York", label: "Eastern Time" },
];

const CoachScheduleManagerComponent = () => {
  const initialDate = useMemo(() => new Date(), []);
  const [date, setDate] = useState(initialDate);
  const [calendarView, _setCalendarView] = useState<
    "timeGridWeek" | "timeGridDay" | "dayGridMonth"
  >("timeGridWeek");
  const [selectedRink, setSelectedRink] = useState<string | undefined>(undefined);
  const [timezoneFilter, setTimezoneFilter] = useState("America/Los_Angeles");

  // Dialog state (view-only for time slots)
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const isMobile = useIsMobile();

  // Calculate date range for fetching data
  const dateRange = useMemo(() => {
    if (calendarView === "timeGridWeek") {
      const dt = DateTime.fromJSDate(date);
      const weekday = dt.weekday;
      const startOfWeek = dt.minus({ days: weekday === 1 ? 0 : weekday - 1 });
      return {
        start: startOfDay(startOfWeek.toJSDate()),
        end: endOfDay(startOfWeek.plus({ days: 6 }).toJSDate()),
      };
    }
    if (calendarView === "timeGridDay") {
      return { start: startOfDay(date), end: endOfDay(date) };
    }
    const year = date.getFullYear();
    const month = date.getMonth();
    return {
      start: startOfDay(new Date(year, month, 1)),
      end: endOfDay(new Date(year, month + 1, 0)),
    };
  }, [date, calendarView]);

  // Fetch coach-scoped data
  const { rinks, timeSlots, blockedDates } = useCoachTimeSlots(dateRange, selectedRink);

  // Filter time slots by timezone when viewing "All Rinks"
  const filteredTimeSlots = useMemo(() => {
    if (!timeSlots) {
      return [];
    }
    if (selectedRink) {
      return timeSlots as TimeSlot[];
    }
    return (timeSlots as TimeSlot[]).filter((slot) => slot.Rink?.timezone === timezoneFilter);
  }, [timeSlots, selectedRink, timezoneFilter]);

  // Get current rink timezone
  const rinkTimezone = useMemo(() => {
    if (selectedRink && rinks) {
      const rinkData = (rinks as Rink[]).find((r) => r.id === selectedRink);
      return rinkData?.timezone || "America/Los_Angeles";
    }
    return timezoneFilter;
  }, [selectedRink, rinks, timezoneFilter]);

  // Transform to FullCalendar events
  const calendarEvents = useMemo(() => {
    const slotEvents = timeSlotsToEvents(filteredTimeSlots);
    const blockedEvents = blockedDatesToBackgroundEvents(
      (blockedDates || []).map((bd: any) => ({
        id: bd.id,
        startDate: bd.startDate,
        endDate: bd.endDate,
        type: bd.type,
        description: bd.description,
      })),
    );
    return [...slotEvents, ...blockedEvents];
  }, [filteredTimeSlots, blockedDates]);

  // Event click - view-only dialog
  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const props = clickInfo.event.extendedProps;
    if (props.isBlocked) {
      return;
    }
    if (props.slot) {
      setSelectedSlot(props.slot as TimeSlot);
      setIsManageDialogOpen(true);
    }
  }, []);

  // Mobile slot click
  const handleMobileSlotClick = useCallback((slot: TimeSlot) => {
    setSelectedSlot(slot);
    setIsManageDialogOpen(true);
  }, []);

  const handleDatesSet = useCallback((dateInfo: { start: Date }) => {
    setDate(dateInfo.start);
  }, []);

  const handleManageDialogClose = useCallback(() => {
    setSelectedSlot(null);
    setIsManageDialogOpen(false);
  }, []);

  // No-op handlers for read-only dialog
  const noop = useCallback(() => {}, []);
  const noopStr = useCallback((_: string) => {}, []);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Schedule</h1>
        <p className="text-muted-foreground text-sm">
          View your time slots and manage your blocked dates
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selectedRink || "all"}
          onValueChange={(value) => setSelectedRink(value === "all" ? undefined : value)}
        >
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="All Rinks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rinks</SelectItem>
            {(rinks as Rink[] | undefined)?.map((rink) => (
              <SelectItem key={rink.id} value={rink.id}>
                {rink.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!selectedRink && (
          <Select value={timezoneFilter} onValueChange={setTimezoneFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <Globe className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_FILTERS.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Plane className="h-3 w-3 mr-1" />
              Blocked Dates
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CoachBlockedDates />
          </PopoverContent>
        </Popover>
      </div>

      {/* Timezone banner */}
      {selectedRink && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-center text-amber-800 text-sm">
          <Globe className="h-4 w-4 mr-2" />
          <span className="truncate" suppressHydrationWarning>
            All times shown in {rinkTimezone.split("/").pop()?.replace("_", " ")} local time
          </span>
        </div>
      )}

      {/* Time Slot Dialog - read-only view */}
      <TimeSlotDialogAdapter
        isOpen={isManageDialogOpen}
        onClose={handleManageDialogClose}
        onEdit={noop}
        onDelete={noop}
        selectedEvent={null}
        selectedSlot={selectedSlot}
        students={[]}
        onAssignStudent={noopStr}
        onUnassignStudent={noopStr}
        isAssigning={false}
        isUnassigning={false}
      />

      {/* Calendar */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isMobile ? (
            <div className="p-4">
              <MobileScheduleList
                timeSlots={filteredTimeSlots}
                timezone={rinkTimezone}
                onSlotClick={handleMobileSlotClick}
              />
            </div>
          ) : (
            <div className="p-4">
              <FullCalendar
                key={rinkTimezone}
                plugins={[dayGridPlugin, timeGridPlugin, luxon3Plugin]}
                initialView={calendarView}
                initialDate={date}
                timeZone={rinkTimezone}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "timeGridWeek,timeGridDay,dayGridMonth",
                }}
                selectable={false}
                editable={false}
                slotDuration="00:15:00"
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                nowIndicator={true}
                events={calendarEvents}
                eventContent={FCEventContent}
                eventClick={handleEventClick}
                datesSet={handleDatesSet}
                height="auto"
                expandRows={true}
                stickyHeaderDates={true}
                dayMaxEvents={3}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const CoachScheduleManager = memo(CoachScheduleManagerComponent);
