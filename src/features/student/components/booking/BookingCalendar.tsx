// src/features/student/components/booking/BookingCalendar.tsx
"use client";
import { endOfDay, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DateTime } from "luxon";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core";
import { formatTimeWithTimezone, TimezoneNotice } from "@/components/TimezoneNotice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { displayInRinkLocalTime } from "@/lib/timezone";
import { toast } from "sonner";
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

interface BookingCalendarProps {
  coachId: string;
  coachName: string;
}

function BookingCalendarComponent({ coachId, coachName }: BookingCalendarProps) {
  const { id: studentId } = useCurrentUser();
  const isMobile = useIsMobile();

  const initialDate = useMemo(() => new Date(), []);
  const [date, setDate] = useState(initialDate);
  const [selectedRink, setSelectedRink] = useState<string>("");
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
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    firstDay.setDate(firstDay.getDate() - 6);
    const lastDay = new Date(year, month + 1, 0);
    lastDay.setDate(lastDay.getDate() + 6);
    return { start: startOfDay(firstDay), end: endOfDay(lastDay) };
  }, [date]);

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
    if (selectedRink && rinks) {
      const selectedRinkData = rinks.find((rink: Rink) => rink.id === selectedRink);
      return selectedRinkData?.timezone || "America/Los_Angeles";
    }
    return "America/Los_Angeles";
  }, [selectedRink, rinks]);

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

  // Convert to FullCalendar events
  const calendarEvents: EventInput[] = useMemo(() => {
    if (!availableSlots || !selectedRink) return [];

    return availableSlots.map((slot) => {
      const isAvailable = slot.isAvailable === true;
      const isSlotActive = slot.isActive === true;
      const studentCount = slot.currentStudents || 0;
      const timezone = (slot as any).Rink.timezone || rinkTimezone;

      const startTimeInfo = displayInRinkLocalTime(slot.startTime, timezone);
      const endTimeInfo = displayInRinkLocalTime(slot.endTime, timezone);

      return {
        id: slot.id,
        title: `${studentCount}/${slot.maxStudents}${isAvailable ? " - Available" : " - Full"}`,
        start: startTimeInfo.dateTime.toJSDate().toISOString(),
        end: endTimeInfo.dateTime.toJSDate().toISOString(),
        backgroundColor: isAvailable && isSlotActive ? "#22c55e" : "#ef4444",
        borderColor: isAvailable && isSlotActive ? "#16a34a" : "#dc2626",
        extendedProps: {
          interactive: isSlotActive && isAvailable,
          rinkName: (slot as any).Rink?.name || "",
          timezone,
          maxStudents: slot.maxStudents,
          currentStudents: studentCount,
          status: isAvailable && isSlotActive ? "available" : "unavailable",
          rawSlot: slot,
        },
      };
    });
  }, [availableSlots, selectedRink, rinkTimezone]);

  // Custom event content for booking calendar
  const renderEventContent = useCallback(
    ({ event, timeText }: EventContentArg) => {
      const props = event.extendedProps;
      const isAvailable = props.status === "available";

      return (
        <div className="px-1 py-0.5 h-full overflow-hidden text-white">
          <div className="text-[10px] font-medium leading-tight">{timeText}</div>
          <div className="text-xs font-semibold leading-tight truncate">{event.title}</div>
          <div className="text-[10px] leading-tight opacity-90">{props.rinkName}</div>
        </div>
      );
    },
    [],
  );

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
    setDate(dateInfo.start);
  }, []);

  // Mobile list processing
  const processEventsForCustomList = useCallback(() => {
    if (!availableSlots || !selectedRink) return [];

    const groupedEvents = availableSlots.reduce(
      (groups, slot) => {
        const slotDateTime = DateTime.fromJSDate(
          typeof slot.startTime === "string" ? new Date(slot.startTime) : slot.startTime,
        ).setZone(rinkTimezone);
        const dateKey = slotDateTime.toFormat("yyyy-MM-dd");

        if (!groups[dateKey]) {
          groups[dateKey] = { date: slotDateTime.toJSDate(), slots: [] };
        }
        groups[dateKey].slots.push(slot as any);
        return groups;
      },
      {} as Record<string, { date: Date; slots: ApiTimeSlot[] }>,
    );

    return Object.values(groupedEvents).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [availableSlots, selectedRink, rinkTimezone]);

  const formatTimeInRinkTimezone = useCallback(
    (timeStr: string | Date) => {
      const dateTime =
        typeof timeStr === "string"
          ? DateTime.fromISO(timeStr, { zone: "utc" }).setZone(rinkTimezone)
          : DateTime.fromJSDate(timeStr, { zone: "utc" }).setZone(rinkTimezone);
      if (!dateTime.isValid) return "Invalid time";
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

  const handleNavigate = useCallback(
    (action: "PREV" | "NEXT" | "TODAY") => {
      if (action === "PREV") {
        const newDate = new Date(date);
        newDate.setDate(date.getDate() - 7);
        setDate(newDate);
      } else if (action === "NEXT") {
        const newDate = new Date(date);
        newDate.setDate(date.getDate() + 7);
        setDate(newDate);
      } else {
        setDate(new Date());
      }
    },
    [date],
  );

  // No rink selected - prompt
  if (!selectedRink && rinks && rinks.length > 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Book a Lesson</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6">
            <h3 className="text-lg font-medium mb-4">
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Book a Lesson</CardTitle>
        <Select value={selectedRink} onValueChange={setSelectedRink}>
          <SelectTrigger className="w-[320px] flex-shrink-0">
            <SelectValue placeholder="Select a Rink" />
          </SelectTrigger>
          <SelectContent>
            {rinks?.map((rink: Rink) => (
              <SelectItem key={rink.id} value={rink.id}>
                {rink.name} ({rink.timezone.split("/").pop()?.replace("_", " ")})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent>
        {selectedRink && (
          <TimezoneNotice
            rinkTimezone={rinkTimezone}
            rinkName={rinks?.find((rink: Rink) => rink.id === selectedRink)?.name || "the rink"}
            className="mb-4"
          />
        )}

        {isLoading || !isReady ? (
          <div className="flex justify-center items-center h-[600px]">
            <p>Loading calendar...</p>
          </div>
        ) : isMobile ? (
          <div className="h-[600px] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <Button variant="outline" size="sm" onClick={() => handleNavigate("PREV")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigate("TODAY")}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigate("NEXT")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {processEventsForCustomList().map((day) => {
              const dayDate = DateTime.fromJSDate(day.date).setZone(rinkTimezone);
              return (
                <div key={dayDate.toFormat("yyyy-MM-dd")} className="mb-4">
                  <div className="py-2 px-3 bg-muted rounded-t-md">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{dayDate.toFormat("EEEE")}</span>
                      <span>{dayDate.toFormat("MMMM d, yyyy")}</span>
                    </div>
                  </div>
                  <div className="border border-border rounded-b-md">
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
                            className={`p-3 border-b last:border-0 cursor-pointer transition-colors w-full text-left ${
                              isSlotBookable
                                ? "hover:bg-green-50 hover:text-green-900"
                                : "hover:bg-red-50 hover:text-red-900"
                            }`}
                            onClick={() => handleCustomSlotClick(slot)}
                            disabled={!isSlotBookable}
                          >
                            <div className="flex justify-between">
                              <div className="font-medium">{`${startTime} - ${endTime}`}</div>
                              <div className={isSlotBookable ? "text-green-700" : "text-red-700"}>
                                {`${currentStudents}/${slot.maxStudents} students`}
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {(slot as any).Rink.name}{" "}
                              {isSlotBookable ? "- Available" : "- Not Available"}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="timeGridWeek"
            initialDate={date}
            timeZone={rinkTimezone}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "timeGridWeek,dayGridMonth",
            }}
            selectable={false}
            editable={false}
            slotDuration="00:15:00"
            slotMinTime="05:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            nowIndicator={true}
            events={calendarEvents}
            eventContent={renderEventContent}
            eventClick={handleFCEventClick}
            datesSet={handleDatesSet}
            height={600}
            expandRows={true}
            dayMaxEvents={3}
          />
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
      </CardContent>
    </Card>
  );
}

const BookingCalendar = memo(BookingCalendarComponent);
export default BookingCalendar;
