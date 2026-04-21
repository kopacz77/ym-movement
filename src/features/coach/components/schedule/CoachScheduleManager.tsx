"use client";

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
import {
  formatDateRange,
  type TimeSlot,
} from "@/features/admin/components/scheduling/calendarUtils";
import { DesktopCalendarView } from "@/features/admin/components/scheduling/DesktopCalendarView";
import { MobileCalendarView } from "@/features/admin/components/scheduling/MobileCalendarView";
import { TimeSlotDialogAdapter } from "@/features/admin/components/scheduling/TimeSlotDialogAdapter";
import { useCoachTimeSlots } from "@/features/coach/hooks/useCoachTimeSlots";
import { type ExtendedCalendarEvent, useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { localizer } from "@/lib/calendar/calendarLocalizer";
import { CoachBlockedDates } from "./CoachBlockedDates";

// Rink interface
interface Rink {
  id: string;
  name: string;
  timezone: string;
  address?: string;
}

// US timezones for filtering
const TIMEZONE_FILTERS = [
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/New_York", label: "Eastern Time" },
];

const CoachScheduleManagerComponent = () => {
  // Calendar state
  const initialDate = useMemo(() => new Date(), []);
  const [date, setDate] = useState(initialDate);
  const [calendarView, setCalendarView] = useState("week");
  const [selectedRink, setSelectedRink] = useState<string | undefined>(undefined);
  const [timezoneFilter, setTimezoneFilter] = useState("America/Los_Angeles");

  // Dialog state (view-only for time slots)
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Media query
  const isMobile = useIsMobile();

  // Calculate date range for fetching data
  const dateRange = useMemo(() => {
    if (calendarView === "week") {
      const dateTime = DateTime.fromJSDate(date);
      const currentWeekday = dateTime.weekday;
      const daysToSubtract = currentWeekday === 1 ? 0 : currentWeekday - 1;
      const startOfWeek = dateTime.minus({ days: daysToSubtract });
      const endOfWeek = startOfWeek.plus({ days: 6 });
      return {
        start: startOfDay(startOfWeek.toJSDate()),
        end: endOfDay(endOfWeek.toJSDate()),
      };
    }

    if (calendarView === "day") {
      return {
        start: startOfDay(date),
        end: endOfDay(date),
      };
    }

    // Month view
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
      return undefined;
    }
    if (selectedRink) {
      return timeSlots;
    }
    return timeSlots.filter((slot: any) => slot.Rink?.timezone === timezoneFilter);
  }, [timeSlots, selectedRink, timezoneFilter]);

  // Get current rink timezone for display
  const rinkTimezone = useMemo(() => {
    if (selectedRink && rinks) {
      const rinkData = (rinks as Rink[]).find((r) => r.id === selectedRink);
      return rinkData?.timezone || "America/Los_Angeles";
    }
    return timezoneFilter;
  }, [selectedRink, rinks, timezoneFilter]);

  // Convert time slots to calendar events
  const displayTimezoneOverride = selectedRink ? undefined : timezoneFilter;
  const { events, processedEvents } = useCalendarEvents(filteredTimeSlots, displayTimezoneOverride);

  // Convert blocked dates to BlockedDateRange shape for DesktopCalendarView
  const calendarBlockedDates = useMemo(() => {
    return (blockedDates || []).map((bd: any) => ({
      id: bd.id,
      title: bd.title,
      description: bd.description || undefined,
      startDate: bd.startDate,
      endDate: bd.endDate,
      type: bd.type as "TRAVEL" | "COMPETITION" | "OTHER",
      createdById: bd.createdById,
      createdAt: bd.createdAt,
      updatedAt: bd.updatedAt,
    }));
  }, [blockedDates]);

  // No-op handlers - coach view is read-only for time slots
  const handleSelectSlot = useCallback(() => {
    // Coaches cannot create time slots directly; they use the proposal workflow
  }, []);

  const handleEventDrop = useCallback(() => {
    // Coaches cannot drag/drop time slots
  }, []);

  // Event selection handler (view-only)
  const handleSelectEvent = useCallback((event: object) => {
    const typedEvent = event as ExtendedCalendarEvent;
    if (typedEvent.slot) {
      // Skip blocked date events
      if ("isBlocked" in typedEvent.slot && typedEvent.slot.isBlocked) {
        return;
      }
      setSelectedSlot(typedEvent.slot);
      setIsManageDialogOpen(true);
    }
  }, []);

  // Mobile slot click handler
  const handleMobileSlotClick = useCallback((slot: TimeSlot) => {
    setSelectedSlot(slot);
    setIsManageDialogOpen(true);
  }, []);

  // Navigation callbacks
  const goToPrev = useCallback(() => {
    setDate((prev) => {
      const newDate = new Date(prev);
      if (calendarView === "month") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (calendarView === "week") {
        newDate.setDate(newDate.getDate() - 7);
      } else if (calendarView === "day") {
        newDate.setDate(newDate.getDate() - 1);
      }
      return newDate;
    });
  }, [calendarView]);

  const goToNext = useCallback(() => {
    setDate((prev) => {
      const newDate = new Date(prev);
      if (calendarView === "month") {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (calendarView === "week") {
        newDate.setDate(newDate.getDate() + 7);
      } else if (calendarView === "day") {
        newDate.setDate(newDate.getDate() + 1);
      }
      return newDate;
    });
  }, [calendarView]);

  const goToToday = useCallback(() => {
    setDate(new Date());
    setCalendarView("day");
  }, []);

  const handleViewChange = useCallback((newView: string) => {
    setCalendarView(newView);
  }, []);

  const handleDateChange = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  // Format the date range text for display
  const dateRangeText = useMemo(() => {
    return formatDateRange(date, calendarView);
  }, [date, calendarView]);

  const handleManageDialogClose = useCallback(() => {
    setSelectedSlot(null);
    setIsManageDialogOpen(false);
  }, []);

  // Empty handlers for read-only dialog
  const noopEdit = useCallback(() => {}, []);
  const noopDelete = useCallback(() => {}, []);
  const noopAssign = useCallback((_studentId: string) => {}, []);
  const noopUnassign = useCallback((_lessonId: string) => {}, []);

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
        {/* Rink selector */}
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

        {/* Timezone selector (when viewing all rinks) */}
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

        {/* Blocked dates management popover */}
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

      {/* Timezone Information Banner */}
      {selectedRink && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-center text-amber-800 text-sm">
          <span className="mr-2">
            <Globe className="h-4 w-4" />
          </span>
          <span className="truncate" suppressHydrationWarning>
            All times shown in {rinkTimezone.split("/").pop()?.replace("_", " ")} local time
          </span>
        </div>
      )}

      {/* Time Slot Dialog - read-only view */}
      <TimeSlotDialogAdapter
        isOpen={isManageDialogOpen}
        onClose={handleManageDialogClose}
        onEdit={noopEdit}
        onDelete={noopDelete}
        selectedEvent={null}
        selectedSlot={selectedSlot}
        students={[]}
        onAssignStudent={noopAssign}
        onUnassignStudent={noopUnassign}
        isAssigning={false}
        isUnassigning={false}
      />

      {/* Calendar */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isMobile ? (
            <MobileCalendarView
              dateRangeText={dateRangeText}
              calendarView={calendarView}
              onViewChangeAction={handleViewChange}
              onPrevAction={goToPrev}
              onNextAction={goToNext}
              onTodayAction={goToToday}
              groupedSlots={processedEvents}
              onSlotClickAction={handleMobileSlotClick}
              rinkTimezone={rinkTimezone}
              rinkName={
                selectedRink
                  ? (rinks as Rink[] | undefined)?.find((r) => r.id === selectedRink)?.name
                  : undefined
              }
              isSelectionMode={false}
              selectedSlotIds={new Set()}
            />
          ) : (
            <DesktopCalendarView
              localizer={localizer}
              events={events}
              date={date}
              calendarView={calendarView}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              onEventDrop={handleEventDrop}
              dateRangeText={dateRangeText}
              onViewChange={handleViewChange}
              onPrev={goToPrev}
              onNext={goToNext}
              onToday={goToToday}
              onDateChange={handleDateChange}
              rinkTimezone={rinkTimezone}
              rinkName={
                selectedRink
                  ? (rinks as Rink[] | undefined)?.find((r) => r.id === selectedRink)?.name
                  : undefined
              }
              isSelectionMode={false}
              selectedSlotIds={new Set()}
              timeSlots={timeSlots as TimeSlot[] | undefined}
              useEnhancedHeader={true}
              blockedDateRanges={calendarBlockedDates}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const CoachScheduleManager = memo(CoachScheduleManagerComponent);
