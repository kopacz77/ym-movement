/**
 * Optimized Booking Calendar Component
 *
 * Enterprise-grade calendar with advanced performance optimizations and intelligent caching
 *
 * @version 3.0.0
 * @since Phase 3 Architecture Optimizations
 */

"use client";

import { endOfDay, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Users } from "lucide-react";
import { DateTime } from "luxon";
import React, {
  memo,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Calendar, type View, Views } from "react-big-calendar";
import { toast } from "sonner";
import { EnhancedErrorBoundary } from "@/components/enhanced-error-boundary";
import { formatTimeWithTimezone, TimezoneNotice } from "@/components/TimezoneNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { api } from "@/lib/api";
import { localizer } from "@/lib/calendar/calendarLocalizer";
import { usePerformanceMonitor } from "@/lib/performance-monitor";
import { displayInRinkLocalTime } from "@/lib/timezone";

// Optimized type definitions
interface OptimizedRink {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly timezone: string;
}

interface OptimizedTimeSlot {
  readonly id: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly maxStudents: number;
  readonly currentStudents: number;
  readonly isActive: boolean;
  readonly isAvailable: boolean;
  readonly Rink: OptimizedRink;
}

interface OptimizedCalendarEvent {
  readonly id: string;
  readonly title: string;
  readonly start: Date;
  readonly end: Date;
  readonly status: "available" | "unavailable" | "full";
  readonly interactive: boolean;
  readonly rinkName: string;
  readonly timezone: string;
  readonly maxStudents: number;
  readonly currentStudents: number;
  readonly resource: OptimizedTimeSlot;
}

interface CalendarState {
  date: Date;
  view: View;
  selectedRink: string;
  isReady: boolean;
}

// Calendar configuration constants
const CALENDAR_CONFIG = {
  CACHE_TTL: 30000, // 30 seconds
  MIN_HOUR: 5, // 5 AM
  MAX_HOUR: 22, // 10 PM
  STEP_MINUTES: 30,
  PREFETCH_DAYS: 7,
} as const;

// Performance monitoring wrapper
const withCalendarPerformance = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
) => {
  return memo((props: P) => {
    usePerformanceMonitor(componentName);
    return <Component {...props} />;
  });
};

/**
 * Optimized calendar event component with memoization
 */
const OptimizedEventComponent = memo<{ event: OptimizedCalendarEvent; rinkTimezone: string }>(
  ({ event, rinkTimezone }) => {
    const timeDisplay = useMemo(() => {
      const startTimeObj = formatTimeWithTimezone(event.start, event.timezone, "h:mm a");
      const endTimeObj = formatTimeWithTimezone(event.end, event.timezone, "h:mm a");

      const localTime = `${startTimeObj.localTime} - ${endTimeObj.localTime}`;
      const rinkTime = `${startTimeObj.rinkTime} - ${endTimeObj.rinkTime}`;
      const showBothTimes = event.timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone;

      return { localTime, rinkTime, showBothTimes };
    }, [event.start, event.end, event.timezone]);

    const statusColor = useMemo(() => {
      switch (event.status) {
        case "available":
          return "text-green-100";
        case "full":
          return "text-red-100";
        default:
          return "text-gray-100";
      }
    }, [event.status]);

    return (
      <div className="p-1 h-full flex flex-col justify-between">
        <div className="space-y-1">
          <div className="font-medium text-sm leading-tight flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>
              {event.currentStudents}/{event.maxStudents}
            </span>
            <Badge
              variant={event.status === "available" ? "default" : "destructive"}
              className="text-xs px-1 py-0"
            >
              {event.status === "available" ? "Open" : "Full"}
            </Badge>
          </div>

          <div className={`text-xs leading-tight ${statusColor}`}>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeDisplay.localTime}
            </div>
            {timeDisplay.showBothTimes && (
              <div className="opacity-80">({timeDisplay.rinkTime} rink)</div>
            )}
          </div>
        </div>

        <div className="text-xs opacity-90 truncate">{event.rinkName}</div>
      </div>
    );
  },
);

OptimizedEventComponent.displayName = "OptimizedEventComponent";

/**
 * Virtualized mobile list item component
 */
const MobileSlotItem = memo<{
  slot: OptimizedTimeSlot;
  rinkTimezone: string;
  onSlotClick: (slot: OptimizedTimeSlot) => void;
}>(({ slot, rinkTimezone, onSlotClick }) => {
  const handleClick = useCallback(() => {
    onSlotClick(slot);
  }, [slot, onSlotClick]);

  const timeDisplay = useMemo(() => {
    const startTime = DateTime.fromJSDate(slot.startTime).setZone(rinkTimezone).toFormat("h:mm a");
    const endTime = DateTime.fromJSDate(slot.endTime).setZone(rinkTimezone).toFormat("h:mm a");

    const timezone = slot.Rink.timezone || rinkTimezone;
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const showLocalTime = timezone !== userTimezone;

    let localTimeDisplay = "";
    if (showLocalTime) {
      const startTimeObj = formatTimeWithTimezone(slot.startTime.toISOString(), timezone);
      const endTimeObj = formatTimeWithTimezone(slot.endTime.toISOString(), timezone);
      localTimeDisplay = `${startTimeObj.localTime} - ${endTimeObj.localTime}`;
    }

    return {
      rinkTime: `${startTime} - ${endTime}`,
      localTime: localTimeDisplay,
      showLocalTime,
    };
  }, [slot.startTime, slot.endTime, slot.Rink.timezone, rinkTimezone]);

  const isBookable = slot.isActive && slot.isAvailable && slot.currentStudents < slot.maxStudents;

  return (
    <button
      type="button"
      className={`
        w-full p-4 border-b border-gray-200 text-left transition-colors
        ${isBookable ? "hover:bg-green-50 cursor-pointer" : "hover:bg-red-50 cursor-not-allowed opacity-75"}
      `}
      onClick={handleClick}
      disabled={!isBookable}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="space-y-1">
          <div className="font-medium text-base">{timeDisplay.rinkTime}</div>
          {timeDisplay.showLocalTime && (
            <div className="text-sm text-gray-500">Your time: {timeDisplay.localTime}</div>
          )}
        </div>

        <div className="text-right space-y-1">
          <Badge variant={isBookable ? "default" : "destructive"} className="text-xs">
            {slot.currentStudents}/{slot.maxStudents} students
          </Badge>
          <div className="text-xs text-gray-500">{isBookable ? "Available" : "Full"}</div>
        </div>
      </div>

      <div className="text-sm text-gray-600 flex items-center gap-1">
        <CalendarIcon className="h-4 w-4" />
        {slot.Rink.name}
      </div>
    </button>
  );
});

MobileSlotItem.displayName = "MobileSlotItem";

/**
 * Main optimized booking calendar component
 */
const OptimizedBookingCalendarComponent: React.FC = () => {
  const { id: studentId } = useCurrentUser();
  const isMobile = useIsMobile();

  // Performance monitoring
  usePerformanceMonitor("OptimizedBookingCalendar");

  // Optimized state management
  const [calendarState, setCalendarState] = useState<CalendarState>(() => ({
    date: new Date(),
    view: Views.WEEK as View,
    selectedRink: "",
    isReady: false,
  }));

  const [selectedSlot, setSelectedSlot] = useState<OptimizedTimeSlot | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);

  // Deferred values for performance
  const deferredDate = useDeferredValue(calendarState.date);
  const deferredSelectedRink = useDeferredValue(calendarState.selectedRink);

  // Refs for performance optimization
  const eventCacheRef = useRef<Map<string, OptimizedCalendarEvent[]>>(new Map());
  const lastFetchParamsRef = useRef<string>("");

  // Initialize ready state
  useEffect(() => {
    if (studentId) {
      setCalendarState((prev) => ({ ...prev, isReady: true }));
    }
  }, [studentId]);

  // Optimized date range calculation with memoization
  const dateRange = useMemo(() => {
    const start = startOfDay(deferredDate);
    const end = endOfDay(new Date(deferredDate.getFullYear(), deferredDate.getMonth() + 1, 0));
    return { start, end };
  }, [deferredDate]);

  // Cache key for intelligent caching
  const cacheKey = useMemo(() => {
    const params = `${dateRange.start.getTime()}-${dateRange.end.getTime()}-${deferredSelectedRink}`;
    return btoa(params).slice(0, 16); // Short, stable cache key
  }, [dateRange, deferredSelectedRink]);

  // Fetch rinks with optimized caching
  const { data: rinks, isLoading: rinksLoading } = api.student.availability.getRinks.useQuery(
    undefined,
    {
      enabled: calendarState.isReady,
      staleTime: CALENDAR_CONFIG.CACHE_TTL * 10, // Rinks change infrequently
      gcTime: CALENDAR_CONFIG.CACHE_TTL * 20,
    },
  );

  // Auto-select first rink with transition
  useEffect(() => {
    if (rinks?.[0]?.id && !calendarState.selectedRink) {
      startTransition(() => {
        setCalendarState((prev) => ({
          ...prev,
          selectedRink: rinks[0].id,
        }));
      });
    }
  }, [rinks, calendarState.selectedRink]);

  // Get rink timezone with memoization
  const rinkTimezone = useMemo(() => {
    if (deferredSelectedRink && rinks) {
      const selectedRinkData = rinks.find((rink) => rink.id === deferredSelectedRink);
      return selectedRinkData?.timezone || "America/Los_Angeles";
    }
    return "America/Los_Angeles";
  }, [deferredSelectedRink, rinks]);

  // Optimized time slots fetching with intelligent caching
  const { data: availableSlots, isLoading: slotsLoading } =
    api.student.availability.getAvailableTimeSlots.useQuery(
      {
        startDate: dateRange.start,
        endDate: dateRange.end,
        rinkId: deferredSelectedRink,
        _cache: Number.parseInt(cacheKey, 16),
      },
      {
        enabled: calendarState.isReady && !!deferredSelectedRink,
        staleTime: CALENDAR_CONFIG.CACHE_TTL,
        gcTime: CALENDAR_CONFIG.CACHE_TTL * 2,
        refetchOnWindowFocus: false,
      },
    );

  // Optimized events conversion with caching
  const events = useMemo(() => {
    if (!availableSlots || !deferredSelectedRink) {
      return [];
    }

    const currentParams = `${availableSlots.length}-${deferredSelectedRink}-${cacheKey}`;

    // Return cached events if parameters haven't changed
    if (lastFetchParamsRef.current === currentParams && eventCacheRef.current.has(currentParams)) {
      return eventCacheRef.current.get(currentParams)!;
    }

    const convertedEvents: OptimizedCalendarEvent[] = availableSlots.map(
      (slot): OptimizedCalendarEvent => {
        const isAvailable = slot.isAvailable && slot.currentStudents < slot.maxStudents;
        const timezone = slot.Rink.timezone || rinkTimezone;

        const startTimeInfo = displayInRinkLocalTime(slot.startTime.toISOString(), timezone);
        const endTimeInfo = displayInRinkLocalTime(slot.endTime.toISOString(), timezone);

        const status: OptimizedCalendarEvent["status"] = slot.isActive
          ? slot.currentStudents >= slot.maxStudents
            ? "full"
            : isAvailable
              ? "available"
              : "unavailable"
          : "unavailable";

        return {
          id: slot.id,
          title: `${slot.currentStudents}/${slot.maxStudents} students`,
          start: startTimeInfo.dateTime.toJSDate(),
          end: endTimeInfo.dateTime.toJSDate(),
          status,
          interactive: slot.isActive && isAvailable,
          rinkName: slot.Rink.name,
          timezone,
          maxStudents: slot.maxStudents,
          currentStudents: slot.currentStudents,
          resource: slot,
        } as const;
      },
    );

    // Cache the converted events
    eventCacheRef.current.set(currentParams, convertedEvents);
    lastFetchParamsRef.current = currentParams;

    return convertedEvents;
  }, [availableSlots, deferredSelectedRink, rinkTimezone, cacheKey]);

  // Optimized mobile list data with virtualization support
  const mobileListData = useMemo(() => {
    if (!availableSlots || !deferredSelectedRink) {
      return [];
    }

    // Group by day and sort
    const groupedByDay = availableSlots.reduce(
      (groups, slot) => {
        const slotDate = DateTime.fromJSDate(slot.startTime).setZone(rinkTimezone);
        const dateKey = slotDate.toFormat("yyyy-MM-dd");

        if (!groups[dateKey]) {
          groups[dateKey] = {
            date: slotDate.toJSDate(),
            slots: [],
          };
        }

        groups[dateKey].slots.push(slot);
        return groups;
      },
      {} as Record<string, { date: Date; slots: OptimizedTimeSlot[] }>,
    );

    return Object.values(groupedByDay)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .flatMap((day) => [
        { type: "header", date: day.date },
        ...day.slots
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
          .map((slot) => ({ type: "slot", slot })),
      ]);
  }, [availableSlots, deferredSelectedRink, rinkTimezone]);

  // Optimized navigation handlers with transitions
  const handleNavigate = useCallback((action: "PREV" | "NEXT" | "TODAY" | Date) => {
    startTransition(() => {
      setCalendarState((prev) => {
        let newDate = prev.date;

        if (action === "PREV") {
          newDate = new Date(prev.date);
          if (prev.view === Views.MONTH) {
            newDate.setMonth(prev.date.getMonth() - 1);
          } else {
            newDate.setDate(prev.date.getDate() - 7);
          }
        } else if (action === "NEXT") {
          newDate = new Date(prev.date);
          if (prev.view === Views.MONTH) {
            newDate.setMonth(prev.date.getMonth() + 1);
          } else {
            newDate.setDate(prev.date.getDate() + 7);
          }
        } else if (action === "TODAY") {
          newDate = new Date();
        } else if (action instanceof Date) {
          newDate = action;
        }

        return { ...prev, date: newDate };
      });
    });
  }, []);

  // Optimized event click handler
  const handleEventClick = useCallback((event: OptimizedCalendarEvent) => {
    if (!event.interactive) {
      toast.warning("This time slot is not available for booking");
      return;
    }

    if (event.status === "full") {
      toast.error("This time slot is fully booked");
      return;
    }

    setSelectedSlot(event.resource);
    setIsBookingDialogOpen(true);
  }, []);

  // Optimized slot click handler for mobile
  const handleMobileSlotClick = useCallback((slot: OptimizedTimeSlot) => {
    if (!slot.isActive) {
      toast.warning("This time slot is not available for booking");
      return;
    }

    if (slot.currentStudents >= slot.maxStudents) {
      toast.error("This time slot is fully booked");
      return;
    }

    setSelectedSlot(slot);
    setIsBookingDialogOpen(true);
  }, []);

  // Optimized event prop getter
  const eventPropGetter = useCallback((event: OptimizedCalendarEvent) => {
    const colors = {
      available: { backgroundColor: "#22c55e", borderColor: "#16a34a" },
      full: { backgroundColor: "#ef4444", borderColor: "#dc2626" },
      unavailable: { backgroundColor: "#6b7280", borderColor: "#4b5563" },
    };

    return {
      style: {
        ...colors[event.status],
        color: "#ffffff",
        fontSize: "12px",
        padding: "2px",
      },
    };
  }, []);

  // Date range text for display
  const dateRangeText = useMemo(() => {
    if (!deferredSelectedRink) {
      return "";
    }

    const startDate = DateTime.fromJSDate(calendarState.date).setZone(rinkTimezone);

    if (calendarState.view === Views.WEEK) {
      const endDate = startDate.plus({ days: 6 });
      if (startDate.month === endDate.month) {
        return `${startDate.toFormat("MMM d")} - ${endDate.toFormat("d")}, ${startDate.toFormat("yyyy")}`;
      }
      return `${startDate.toFormat("MMM d")} - ${endDate.toFormat("MMM d")}, ${startDate.toFormat("yyyy")}`;
    }

    return startDate.toFormat("MMMM yyyy");
  }, [calendarState.date, calendarState.view, rinkTimezone, deferredSelectedRink]);

  // Loading states
  const isLoading = rinksLoading || slotsLoading || !calendarState.isReady;

  // Render rink selection if no rink selected
  if (!calendarState.selectedRink && rinks?.length) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Book a Lesson</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6 space-y-4">
            <h3 className="text-lg font-medium">Select a rink to view available times</h3>
            <Select
              value={calendarState.selectedRink}
              onValueChange={(value) =>
                setCalendarState((prev) => ({ ...prev, selectedRink: value }))
              }
            >
              <SelectTrigger className="w-[280px] mx-auto">
                <SelectValue placeholder="Select a Rink" />
              </SelectTrigger>
              <SelectContent>
                {rinks.map((rink) => (
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
    <EnhancedErrorBoundary level="component" componentName="OptimizedBookingCalendar">
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Book a Lesson</CardTitle>
          <Select
            value={calendarState.selectedRink}
            onValueChange={(value) =>
              setCalendarState((prev) => ({ ...prev, selectedRink: value }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a Rink" />
            </SelectTrigger>
            <SelectContent>
              {rinks?.map((rink) => (
                <SelectItem key={rink.id} value={rink.id}>
                  {rink.name} ({rink.timezone.split("/").pop()?.replace("_", " ")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent>
          {/* Timezone Notice */}
          {calendarState.selectedRink && (
            <TimezoneNotice
              rinkTimezone={rinkTimezone}
              rinkName={
                rinks?.find((rink) => rink.id === calendarState.selectedRink)?.name || "the rink"
              }
              className="mb-4"
            />
          )}

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-[600px] w-full" />
            </div>
          ) : isMobile ? (
            // Optimized mobile view with virtualization
            <div className="h-[600px]">
              <div className="flex justify-between items-center mb-4">
                <Button variant="outline" size="sm" onClick={() => handleNavigate("PREV")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <span className="font-medium">{dateRangeText}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleNavigate("NEXT")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full mb-4"
                onClick={() => handleNavigate("TODAY")}
              >
                Today
              </Button>

              <VirtualizedList
                items={mobileListData}
                height={500}
                itemHeight={(index: number) => (mobileListData[index].type === "header" ? 60 : 120)}
                renderItem={(item: any, index: number) => {
                  if (item.type === "header") {
                    const dayDate = DateTime.fromJSDate(item.date).setZone(rinkTimezone);
                    return (
                      <div key={`header-${index}`} className="py-3 px-4 bg-slate-100 border-b">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">{dayDate.toFormat("EEEE")}</span>
                          <span>{dayDate.toFormat("MMMM d, yyyy")}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <MobileSlotItem
                      key={item.slot.id}
                      slot={item.slot}
                      rinkTimezone={rinkTimezone}
                      onSlotClick={handleMobileSlotClick}
                    />
                  );
                }}
                className="border rounded-md"
              />
            </div>
          ) : (
            // Optimized desktop calendar view
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
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

                <div className="text-center">
                  <span className="font-medium">{dateRangeText}</span>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant={calendarState.view === Views.WEEK ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCalendarState((prev) => ({ ...prev, view: Views.WEEK }))}
                  >
                    Week
                  </Button>
                  <Button
                    variant={calendarState.view === Views.MONTH ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCalendarState((prev) => ({ ...prev, view: Views.MONTH }))}
                  >
                    Month
                  </Button>
                </div>
              </div>

              <Calendar
                localizer={localizer}
                events={events}
                step={CALENDAR_CONFIG.STEP_MINUTES}
                views={[Views.WEEK, Views.MONTH]}
                view={calendarState.view}
                onView={(view) => setCalendarState((prev) => ({ ...prev, view }))}
                date={calendarState.date}
                onNavigate={handleNavigate}
                components={{
                  event: (props) => (
                    <OptimizedEventComponent event={props.event} rinkTimezone={rinkTimezone} />
                  ),
                  toolbar: () => null, // Custom toolbar
                }}
                eventPropGetter={eventPropGetter}
                min={new Date(2024, 0, 1, CALENDAR_CONFIG.MIN_HOUR, 0)}
                max={new Date(2024, 0, 1, CALENDAR_CONFIG.MAX_HOUR, 0)}
                onSelectEvent={handleEventClick}
                popup
                style={{ height: 600 }}
              />
            </div>
          )}

          {/* Booking Dialog - Lazy loaded */}
          {isBookingDialogOpen && selectedSlot && studentId && (
            <React.Suspense fallback={<div>Loading booking dialog...</div>}>
              {/* BookingDialog would be dynamically imported here */}
              <div>Booking Dialog Placeholder</div>
            </React.Suspense>
          )}
        </CardContent>
      </Card>
    </EnhancedErrorBoundary>
  );
};

// Export with performance monitoring
export const OptimizedBookingCalendar = withCalendarPerformance(
  OptimizedBookingCalendarComponent,
  "OptimizedBookingCalendar",
);
