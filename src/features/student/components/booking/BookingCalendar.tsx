// src/features/student/components/booking/BookingCalendar.tsx
"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { BookingDialog } from "./BookingDialog";
import type { EventClickArg } from "@fullcalendar/core";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Define types for the rinks and time slots
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

interface TimeSlot {
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

function formatTimeDisplay(dateStr: string) {
  const date = new Date(dateStr);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(
    2,
    "0",
  )}`;
}

export const BookingCalendar = () => {
  const { id: studentId } = useCurrentUser();
  const isMobile = useIsMobile();
  
  const calendarRef = useRef(null);
  
  // Create a stable initial date
  const initialDate = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return addDays(now, -dayOfWeek);
  }, []);
  
  // State initialization
  const [date, setDate] = useState(initialDate);
  const [selectedRink, setSelectedRink] = useState<string>("all_rinks");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);

  // Calculate date range based on month for efficient data loading
  const dateRange = useMemo(() => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    
    return {
      start: startOfDay(firstDay),
      end: endOfDay(lastDay)
    };
  }, [date]);
  
  // Generate a stable cache key
  const cacheKey = useMemo(() => {
    const hashStr = `${dateRange.start.getTime()}-${dateRange.end.getTime()}-${selectedRink}`;
    return hashStr.split('').reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) & 0xFFFFFFFF;
    }, 0);
  }, [dateRange.start, dateRange.end, selectedRink]);

  // Fetch rinks
  const { data: rinks } = api.student.availability.getRinks.useQuery(
    undefined,
    { enabled: isReady }
  );

  // Fetch time slots
  const {
    data: availableSlots,
    isLoading,
  } = api.student.availability.getAvailableTimeSlots.useQuery(
    {
      startDate: dateRange.start,
      endDate: dateRange.end,
      rinkId: selectedRink === "all_rinks" ? undefined : selectedRink,
      _cache: cacheKey,
    },
    { 
      enabled: isReady,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  );

  // Format the date range for display
  const dateRangeText = useMemo(() => {
    const endDate = addDays(date, 6);
    const startMonth = format(date, "MMM");
    const endMonth = format(endDate, "MMM");

    if (startMonth === endMonth) {
      return `${startMonth} ${format(date, "d")} - ${format(endDate, "d")}, ${format(
        date,
        "yyyy",
      )}`;
    }
    
    return `${startMonth} ${format(date, "d")} - ${endMonth} ${format(endDate, "d")}, ${format(
      date,
      "yyyy",
    )}`;
  }, [date]);

  // Convert slots to events
  const events = useMemo(() => {
    if (!availableSlots) {
      return [];
    }
    
    return availableSlots.map((slot) => {
      const isAvailable = slot.isAvailable === true;
      const isYuraSlot = slot.isActive === true;
      const studentCount = slot.currentStudents || 0;
      
      const title = `${studentCount}/${slot.maxStudents} students${
        isAvailable ? " - Available" : " - Full"
      }`;

      return {
        id: slot.id,
        title: title,
        start: slot.startTime,
        end: slot.endTime,
        color: isAvailable && isYuraSlot ? "rgb(74 222 128)" : "rgb(239 68 68)",
        interactive: isYuraSlot && isAvailable,
        className: isYuraSlot && isAvailable ? "interactive-slot" : "non-interactive-slot",
        extendedProps: {
          ...slot,
          interactive: isYuraSlot && isAvailable,
          rinkName: slot.rink?.name || "",
        },
      };
    });
  }, [availableSlots]);

  // Event handlers
  const handleEventClick = (clickInfo: EventClickArg) => {
    const slot = clickInfo.event.extendedProps as TimeSlot;
    
    if (!slot.interactive) {
      toast("Non-bookable time slot", {
        description: "This time slot is not available for booking.",
      });
      return;
    }

    const currentStudents = slot.currentStudents || slot.lessons?.length || 0;
    if (currentStudents >= slot.maxStudents) {
      toast.error("Time slot unavailable", {
        description: "This time slot is already fully booked.",
      });
      return;
    }

    setSelectedSlot(slot);
    setIsBookingDialogOpen(true);
  };

  // Process events for list view
  const processEventsForCustomList = () => {
    if (!availableSlots) { return []; }

    // Group events by day
    const groupedEvents = availableSlots.reduce(
      (groups, slot) => {
        const date = format(new Date(slot.startTime), "yyyy-MM-dd");

        if (!groups[date]) {
          groups[date] = {
            date: new Date(slot.startTime),
            slots: [],
          };
        }

        groups[date].slots.push(slot);
        return groups;
      },
      {} as Record<string, { date: Date; slots: ApiTimeSlot[] }>,
    );

    // Convert to array and sort by date
    return Object.values(groupedEvents).sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  // Handle clicking a slot in the custom list view
  const handleCustomSlotClick = (rawSlot: ApiTimeSlot) => {
    // Ensure startTime and endTime are strings
    const stringifiedStartTime =
      typeof rawSlot.startTime === "object"
        ? format(rawSlot.startTime, "yyyy-MM-dd'T'HH:mm:ss")
        : rawSlot.startTime;

    const stringifiedEndTime =
      typeof rawSlot.endTime === "object"
        ? format(rawSlot.endTime, "yyyy-MM-dd'T'HH:mm:ss")
        : rawSlot.endTime;

    // Create a properly typed TimeSlot, filling in missing rink properties
    const processedSlot: TimeSlot = {
      id: rawSlot.id,
      startTime: stringifiedStartTime,
      endTime: stringifiedEndTime,
      maxStudents: rawSlot.maxStudents,
      currentStudents: rawSlot.currentStudents,
      lessons: rawSlot.lessons,
      isActive: rawSlot.isActive,
      rink: {
        // Use the ApiRink data but add missing properties
        name: rawSlot.rink.name,
        address: rawSlot.rink.address,
        id: rawSlot.rink.id || "unknown", // Placeholder for required id
        timezone: rawSlot.rink.timezone || "UTC", // Default timezone
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
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Book a Lesson</CardTitle>
        <Select value={selectedRink} onValueChange={setSelectedRink}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Rinks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_rinks">All Rinks</SelectItem>
            {rinks?.map((rink: Rink) => (
              <SelectItem key={rink.id} value={rink.id}>
                {rink.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading || !isReady ? (
          <div className="flex justify-center items-center h-[600px]">
            <p>Loading calendar...</p>
          </div>
        ) : isMobile ? (
          // Custom mobile list view
          <div className="h-[600px] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <Button variant="outline" size="sm" onClick={() => {
                setDate((prev) => addDays(prev, -7));
              }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <span className="font-medium">{dateRangeText}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                setDate((prev) => addDays(prev, 7));
              }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="w-full mb-4" onClick={() => {
              setDate(startOfDay(new Date()));
            }}>
              Today
            </Button>

            {processEventsForCustomList().map((day) => (
              <div key={format(day.date, "yyyy-MM-dd")} className="mb-4">
                {/* Day header */}
                <div className="py-2 px-3 bg-slate-100 rounded-t-md">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{format(day.date, "EEEE")}</span>
                    <span>{format(day.date, "MMMM d, yyyy")}</span>
                  </div>
                </div>

                {/* Time slots for the day */}
                <div className="border border-slate-200 rounded-b-md">
                  {day.slots
                    .sort(
                      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
                    )
                    .map((slot) => {
                      const currentStudents = slot.currentStudents || 0;
                      const isAvailable = slot.isAvailable === true;
                      const isSlotActive = slot.isActive === true;
                      const isSlotBookable = isSlotActive && isAvailable;
                      
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          className={`p-3 border-b last:border-0 cursor-pointer transition-colors w-full text-left ${
                            isSlotBookable ? "hover:bg-green-50" : "hover:bg-red-50"
                          }`}
                          onClick={() => handleCustomSlotClick(slot)}
                          disabled={!isSlotBookable}
                        >
                          <div className="flex justify-between">
                            <div className="font-medium">
                              {`${formatTimeDisplay(
                                typeof slot.startTime === "object"
                                  ? format(slot.startTime, "yyyy-MM-dd'T'HH:mm:ss")
                                  : slot.startTime,
                              )} - ${formatTimeDisplay(
                                typeof slot.endTime === "object"
                                  ? format(slot.endTime, "yyyy-MM-dd'T'HH:mm:ss")
                                  : slot.endTime,
                              )}`}
                            </div>
                            <div className={isSlotBookable ? "text-green-600" : "text-red-600"}>
                              {`${currentStudents}/${slot.maxStudents} students`}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {slot.rink.name} {isSlotBookable ? "- Available" : "- Not Available"}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Desktop calendar view
          <div className="h-[600px]">
            <FullCalendar
              ref={calendarRef}
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              initialDate={date}
              events={events}
              timeZone="UTC"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "timeGridWeek,dayGridMonth",
              }}
              selectable={false}
              eventClick={handleEventClick}
              slotMinTime="05:00:00"
              slotMaxTime="18:00:00"
              businessHours={{
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                startTime: "05:00",
                endTime: "18:00",
              }}
              allDaySlot={false}
              height="100%"
              displayEventTime={true}
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                omitZeroMinute: false,
                hour12: false,
              }}
              datesSet={(dateInfo) => {
                const newDate = new Date(dateInfo.start);
                
                // Only update if our date state is significantly different
                const currentDate = new Date(date);
                const daysDiff = Math.abs(
                  (newDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                
                // Only update if date changed by more than 1 day
                if (daysDiff > 1) {
                  setDate(newDate);
                }
              }}
              eventContent={(arg) => {
                const startTime = formatTimeDisplay(arg.event.startStr);
                const endTime = formatTimeDisplay(arg.event.endStr);
                const title = arg.event.title;
                const rinkName = arg.event.extendedProps.rinkName || "";
                const isInteractive = arg.event.extendedProps.interactive;
                const cursorStyle = isInteractive ? "cursor-pointer" : "cursor-not-allowed";

                return {
                  html: 
                  `<div class="fc-event-main-frame p-1 ${cursorStyle}">
                    <div class="fc-event-time font-medium">${startTime} - ${endTime}</div>
                    <div class="fc-event-title text-sm whitespace-normal">${title}</div>
                    <div class="fc-event-subtitle text-xs whitespace-normal">${rinkName}</div>
                  </div>
                  `,
                };
              }}
            />
          </div>
        )}

        {isBookingDialogOpen && selectedSlot && studentId && (
          <BookingDialog
            slot={selectedSlot}
            studentId={studentId}
            onCloseAction={() => {
              setIsBookingDialogOpen(false);
              setSelectedSlot(null);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};