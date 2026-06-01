// src/features/student/components/booking/BookingCalendar.tsx
"use client";
import type { EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import luxon3Plugin from "@fullcalendar/luxon3";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { format } from "date-fns";
import { endOfDay, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { DateTime } from "luxon";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { displayInRinkLocalTime } from "@/lib/timezone";
import { BookingDialog } from "./BookingDialog";

interface Rink {
  id: string;
  name: string;
  address: string;
  timezone: string;
}

interface ApiRink {
  id?: string;
  name: string;
  address: string;
  timezone?: string;
}

interface BookingTimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  currentStudents?: number;
  lessons?: unknown[];
  isActive: boolean;
  rink: Rink;
  interactive?: boolean;
}

interface ApiTimeSlot {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  maxStudents: number;
  currentStudents?: number;
  lessons?: unknown[];
  isActive: boolean;
  isAvailable?: boolean;
  rink: ApiRink;
  [key: string]: unknown;
}

type CalendarView = "timeGridWeek" | "timeGridDay" | "dayGridMonth";

const VIEW_OPTIONS: { label: string; value: CalendarView }[] = [
  { label: "Week", value: "timeGridWeek" },
  { label: "Day", value: "timeGridDay" },
  { label: "Month", value: "dayGridMonth" },
];

const TIMEZONE_OPTIONS = [
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/New_York", label: "Eastern Time" },
];

interface BookingCalendarProps {
  coachId: string;
  coachName: string;
}

function BookingCalendarComponent({ coachId, coachName }: BookingCalendarProps) {
  const { id: studentId } = useCurrentUser();
  const isMobile = useIsMobile();
  const calendarRef = useRef<FullCalendar>(null);

  const initialDate = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [currentView, setCurrentView] = useState<CalendarView>("timeGridWeek");
  const [selectedRink, setSelectedRink] = useState<string>("");
  const [timezoneOverride, setTimezoneOverride] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<BookingTimeSlot | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);

  // Calculate date range (month + buffer for week views spanning months)
  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    firstDay.setDate(firstDay.getDate() - 6);
    const lastDay = new Date(year, month + 1, 0);
    lastDay.setDate(lastDay.getDate() + 6);
    return { start: startOfDay(firstDay), end: endOfDay(lastDay) };
  }, [currentDate]);

  const cacheKey = useMemo(() => {
    const hashStr = `${dateRange.start.getTime()}-${dateRange.end.getTime()}-${selectedRink}-${coachId}`;
    return hashStr.split("").reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) & 0xffffffff;
    }, 0);
  }, [dateRange.start, dateRange.end, selectedRink, coachId]);

  const { data: rinks } = api.student.availability.getRinks.useQuery(undefined, {
    enabled: isReady,
  });

  useEffect(() => {
    const firstRinkId = rinks?.[0]?.id;
    if (firstRinkId && !selectedRink) {
      setSelectedRink(firstRinkId);
    }
  }, [rinks, selectedRink]);

  const rinkTimezone = useMemo(() => {
    if (timezoneOverride) {
      return timezoneOverride;
    }
    if (selectedRink && rinks) {
      const selectedRinkData = rinks.find((rink: Rink) => rink.id === selectedRink);
      return selectedRinkData?.timezone || "America/Los_Angeles";
    }
    return "America/Los_Angeles";
  }, [selectedRink, rinks, timezoneOverride]);

  const { data: availableSlots, isLoading } =
    api.student.availability.getAvailableTimeSlots.useQuery(
      {
        startDate: dateRange.start,
        endDate: dateRange.end,
        rinkId: selectedRink,
        coachId,
        _cache: cacheKey,
      },
      {
        enabled: isReady && !!selectedRink,
        refetchOnWindowFocus: false,
        staleTime: 30000,
      },
    );

  // Convert to FullCalendar events with transparent tinted blocks
  const calendarEvents: EventInput[] = useMemo(() => {
    if (!availableSlots || !selectedRink) {
      return [];
    }

    return availableSlots.map((slot) => {
      const isAvailable = slot.isAvailable === true;
      const isSlotActive = slot.isActive === true;
      const studentCount = slot.currentStudents || 0;
      const timezone = (slot as any).Rink.timezone || rinkTimezone;

      const startTimeInfo = displayInRinkLocalTime(slot.startTime, timezone);
      const endTimeInfo = displayInRinkLocalTime(slot.endTime, timezone);

      let bg: string;
      let border: string;
      let textClass: string;

      if (isAvailable && isSlotActive) {
        bg = "rgba(34, 197, 94, 0.25)";
        border = "rgba(34, 197, 94, 0.55)";
        textClass = "text-green-800";
      } else {
        bg = "rgba(239, 68, 68, 0.15)";
        border = "rgba(239, 68, 68, 0.40)";
        textClass = "text-red-800";
      }

      return {
        id: slot.id,
        title: `${studentCount}/${slot.maxStudents}${isAvailable ? " - Available" : " - Full"}`,
        start: startTimeInfo.dateTime.toJSDate().toISOString(),
        end: endTimeInfo.dateTime.toJSDate().toISOString(),
        backgroundColor: bg,
        borderColor: border,
        extendedProps: {
          interactive: isSlotActive && isAvailable,
          rinkName: (slot as any).Rink?.name || "",
          timezone,
          maxStudents: slot.maxStudents,
          currentStudents: studentCount,
          status: isAvailable && isSlotActive ? "available" : "unavailable",
          textClass,
          rawSlot: slot,
        },
      };
    });
  }, [availableSlots, selectedRink, rinkTimezone]);

  // Custom event content matching admin FCEventContent pattern
  const renderEventContent = useCallback(({ event, timeText }: EventContentArg) => {
    const props = event.extendedProps;
    const textClass = (props.textClass as string) || "text-slate-800";

    return (
      <div className={cn("fc-event-scaled px-2 py-1 h-full overflow-hidden flex flex-col gap-0.5", textClass)}>
        <div className="fc-ev-time font-medium leading-tight opacity-70">{timeText}</div>
        <div className="fc-ev-primary font-semibold leading-tight truncate">
          {props.rinkName || "Available"}
        </div>
        <div className="fc-ev-secondary leading-tight opacity-70">
          {props.currentStudents}/{props.maxStudents} students
        </div>
      </div>
    );
  }, []);

  // Handle FullCalendar event click
  const handleFCEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      const props = clickInfo.event.extendedProps;
      const rawSlot = props.rawSlot;

      if (!props.interactive) {
        toast("Non-bookable time slot", {
          description: "This time slot is not available for booking.",
        });
        return;
      }

      const currentStudents = props.currentStudents || 0;
      if (currentStudents >= (props.maxStudents || 0)) {
        toast.error("Time slot unavailable", {
          description: "This time slot is already fully booked.",
        });
        return;
      }

      const slot: BookingTimeSlot = {
        id: clickInfo.event.id,
        startTime: rawSlot.startTime.toString(),
        endTime: rawSlot.endTime.toString(),
        maxStudents: props.maxStudents || 0,
        currentStudents: props.currentStudents,
        isActive: true,
        rink: {
          id: selectedRink,
          name: props.rinkName || "",
          address: "",
          timezone: props.timezone || rinkTimezone,
        },
        interactive: props.interactive,
      };

      setSelectedSlot(slot);
      setIsBookingDialogOpen(true);
    },
    [selectedRink, rinkTimezone],
  );

  const handleDatesSet = useCallback((dateInfo: { start: Date }) => {
    setCurrentDate(dateInfo.start);
  }, []);

  // --- Toolbar navigation ---
  const navigatePrev = useCallback(() => {
    const calApi = calendarRef.current?.getApi();
    if (calApi) {
      calApi.prev();
      setCurrentDate(calApi.getDate());
    }
  }, []);

  const navigateNext = useCallback(() => {
    const calApi = calendarRef.current?.getApi();
    if (calApi) {
      calApi.next();
      setCurrentDate(calApi.getDate());
    }
  }, []);

  const navigateToday = useCallback(() => {
    const calApi = calendarRef.current?.getApi();
    if (calApi) {
      calApi.today();
      setCurrentDate(calApi.getDate());
    }
  }, []);

  const changeView = useCallback((view: CalendarView) => {
    setCurrentView(view);
    const calApi = calendarRef.current?.getApi();
    if (calApi) {
      calApi.changeView(view);
    }
  }, []);

  // --- Mobile navigation (view-aware) ---
  const handleMobileNavigate = useCallback(
    (action: "PREV" | "NEXT" | "TODAY") => {
      if (action === "TODAY") {
        setCurrentDate(new Date());
        return;
      }
      const delta = action === "PREV" ? -1 : 1;
      const newDate = new Date(currentDate);
      if (currentView === "timeGridDay") {
        newDate.setDate(currentDate.getDate() + delta);
      } else if (currentView === "timeGridWeek") {
        newDate.setDate(currentDate.getDate() + delta * 7);
      } else {
        newDate.setMonth(currentDate.getMonth() + delta);
      }
      setCurrentDate(newDate);
    },
    [currentDate, currentView],
  );

  // --- Mobile list: filter slots to current visible range ---
  const mobileVisibleRange = useMemo(() => {
    const dt = DateTime.fromJSDate(currentDate, { zone: rinkTimezone });
    if (currentView === "timeGridDay") {
      return {
        start: dt.startOf("day"),
        end: dt.endOf("day"),
      };
    }
    if (currentView === "timeGridWeek") {
      const startOfWeek = dt.startOf("week"); // Monday (ISO)
      return {
        start: startOfWeek.startOf("day"),
        end: startOfWeek.plus({ days: 6 }).endOf("day"),
      };
    }
    // Month
    return {
      start: dt.startOf("month").startOf("day"),
      end: dt.endOf("month").endOf("day"),
    };
  }, [currentDate, currentView, rinkTimezone]);

  const mobileSlots = useMemo(() => {
    if (!availableSlots || !selectedRink) return [];

    return availableSlots.filter((slot) => {
      const slotDt = DateTime.fromJSDate(
        typeof slot.startTime === "string" ? new Date(slot.startTime) : slot.startTime,
      ).setZone(rinkTimezone);
      return slotDt >= mobileVisibleRange.start && slotDt <= mobileVisibleRange.end;
    });
  }, [availableSlots, selectedRink, rinkTimezone, mobileVisibleRange]);

  const mobileGroupedByDay = useMemo(() => {
    const groups: Record<string, { date: DateTime; slots: ApiTimeSlot[] }> = {};
    for (const slot of mobileSlots) {
      const slotDt = DateTime.fromJSDate(
        typeof slot.startTime === "string" ? new Date(slot.startTime) : slot.startTime,
      ).setZone(rinkTimezone);
      const dateKey = slotDt.toFormat("yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = { date: slotDt.startOf("day"), slots: [] };
      }
      groups[dateKey].slots.push(slot as any);
    }
    return Object.values(groups).sort(
      (a, b) => a.date.toMillis() - b.date.toMillis(),
    );
  }, [mobileSlots, rinkTimezone]);

  const formatTimeInRinkTimezone = useCallback(
    (timeStr: string | Date) => {
      const dateTime =
        typeof timeStr === "string"
          ? DateTime.fromISO(timeStr, { zone: "utc" }).setZone(rinkTimezone)
          : DateTime.fromJSDate(timeStr, { zone: "utc" }).setZone(rinkTimezone);
      if (!dateTime.isValid) {
        return "Invalid time";
      }
      return dateTime.toFormat("h:mm a");
    },
    [rinkTimezone],
  );

  const handleCustomSlotClick = useCallback(
    (rawSlot: ApiTimeSlot) => {
      const processedSlot: BookingTimeSlot = {
        id: rawSlot.id,
        startTime: rawSlot.startTime.toString(),
        endTime: rawSlot.endTime.toString(),
        maxStudents: rawSlot.maxStudents,
        currentStudents: rawSlot.currentStudents,
        lessons: rawSlot.lessons,
        isActive: rawSlot.isActive,
        rink: {
          name: (rawSlot as any).Rink.name,
          address: (rawSlot as any).Rink.address,
          id: (rawSlot as any).Rink.id || "unknown",
          timezone: (rawSlot as any).Rink.timezone || rinkTimezone,
        },
        interactive: rawSlot.isAvailable,
      };

      if (!processedSlot.isActive) {
        toast("Non-bookable time slot", {
          description: "This time slot is not available for booking.",
        });
        return;
      }

      const currentStudents = processedSlot.currentStudents || processedSlot.lessons?.length || 0;
      if (currentStudents >= processedSlot.maxStudents) {
        toast.error("Time slot unavailable", {
          description: "This time slot is already fully booked.",
        });
        return;
      }

      setSelectedSlot(processedSlot);
      setIsBookingDialogOpen(true);
    },
    [rinkTimezone],
  );

  // Date label for toolbar — view-aware
  const dateLabel = useMemo(() => {
    if (currentView === "dayGridMonth") return format(currentDate, "MMMM yyyy");
    if (currentView === "timeGridDay") return format(currentDate, "EEEE, MMM d, yyyy");
    return format(currentDate, "MMM d, yyyy");
  }, [currentDate, currentView]);

  // No rink selected - prompt
  if (!selectedRink && rinks && rinks.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
          <h3 className="text-base font-semibold text-slate-800 mb-4">
            Please select a rink to view available times
          </h3>
          <Select value={selectedRink} onValueChange={setSelectedRink}>
            <SelectTrigger className="w-[280px] mx-auto">
              <SelectValue placeholder="Select a Rink" />
            </SelectTrigger>
            <SelectContent>
              {rinks.map((rink: Rink) => (
                <SelectItem key={rink.id} value={rink.id}>
                  {rink.name} ({rink.timezone.split("/").pop()?.replace("_", " ")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Custom Toolbar — matching admin CalendarToolbar */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Navigation + View switcher */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Left: Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={isMobile ? () => handleMobileNavigate("TODAY") : navigateToday}>
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={isMobile ? () => handleMobileNavigate("PREV") : navigatePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={isMobile ? () => handleMobileNavigate("NEXT") : navigateNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-lg">{dateLabel}</span>
          </div>

          {/* Right: View switcher */}
          <div className="flex items-center gap-2">
            <div className="flex border rounded-md overflow-hidden">
              {VIEW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => changeView(opt.value)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    currentView === opt.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedRink} onValueChange={setSelectedRink}>
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Select Rink" />
            </SelectTrigger>
            <SelectContent>
              {rinks?.map((rink: Rink) => (
                <SelectItem key={rink.id} value={rink.id}>
                  {rink.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={timezoneOverride || rinkTimezone}
            onValueChange={(v) => setTimezoneOverride(v)}
          >
            <SelectTrigger className="w-[180px] h-8">
              <Globe className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar content */}
      {isLoading || !isReady ? (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="flex justify-center items-center h-[400px]">
            <p className="text-muted-foreground">Loading calendar...</p>
          </div>
        </div>
      ) : isMobile ? (
        /* ---- Mobile list view ---- */
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-y-auto max-h-[70vh] p-4">
            {mobileGroupedByDay.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No available slots for this period.
              </div>
            ) : (
              <div className="space-y-4">
                {mobileGroupedByDay.map((day) => (
                  <div key={day.date.toFormat("yyyy-MM-dd")}>
                    <div className="py-2.5 px-4 bg-slate-50 border border-slate-200/60 rounded-t-xl">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-800 text-sm">
                          {day.date.toFormat("EEEE")}
                        </span>
                        <span className="text-xs text-slate-500">
                          {day.date.toFormat("MMMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <div className="border border-t-0 border-slate-200/60 rounded-b-xl overflow-hidden">
                      {day.slots
                        .sort(
                          (a, b) =>
                            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
                        )
                        .map((slot) => {
                          const currentStudents = slot.currentStudents || 0;
                          const isAvailable = slot.isAvailable === true;
                          const isSlotActive = slot.isActive === true;
                          const isSlotBookable = isSlotActive && isAvailable;
                          const startTime = formatTimeInRinkTimezone(slot.startTime);
                          const endTime = formatTimeInRinkTimezone(slot.endTime);

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              className={cn(
                                "p-3.5 border-b border-slate-100 last:border-0 cursor-pointer transition-all w-full text-left",
                                isSlotBookable
                                  ? "hover:bg-green-50/80 active:scale-[0.99]"
                                  : "opacity-60 cursor-not-allowed",
                              )}
                              onClick={() => handleCustomSlotClick(slot)}
                              disabled={!isSlotBookable}
                            >
                              <div className="flex justify-between items-center">
                                <div className="font-semibold text-sm text-slate-800">
                                  {startTime} - {endTime}
                                </div>
                                <div
                                  className={cn(
                                    "text-xs font-medium px-2 py-0.5 rounded-full",
                                    isSlotBookable
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700",
                                  )}
                                >
                                  {isSlotBookable ? "Available" : "Full"}
                                </div>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {(slot as any).Rink.name} · {currentStudents}/{slot.maxStudents}{" "}
                                students
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ---- Desktop FullCalendar ---- */
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <FullCalendar
            key={rinkTimezone}
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, luxon3Plugin]}
            initialView={currentView}
            initialDate={currentDate}
            timeZone={rinkTimezone}
            headerToolbar={false}
            firstDay={1}
            selectable={false}
            editable={false}
            slotDuration="00:15:00"
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            nowIndicator={true}
            events={calendarEvents}
            eventContent={renderEventContent}
            eventClick={handleFCEventClick}
            datesSet={handleDatesSet}
            height="auto"
            expandRows={true}
            stickyHeaderDates={true}
            dayMaxEvents={3}
          />
        </div>
      )}

      {isBookingDialogOpen && selectedSlot && studentId && (
        <BookingDialog
          slot={selectedSlot}
          studentId={studentId}
          rinkTimezone={rinkTimezone}
          coachName={coachName}
          coachId={coachId}
          onCloseAction={() => {
            setIsBookingDialogOpen(false);
            setSelectedSlot(null);
          }}
        />
      )}
    </div>
  );
}

const BookingCalendar = memo(BookingCalendarComponent);
export default BookingCalendar;
