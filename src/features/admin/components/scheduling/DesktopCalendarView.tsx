import { type FC, type SyntheticEvent, useCallback, useMemo, useRef } from "react";
import { Calendar, type EventProps, type SlotInfo, Views } from "react-big-calendar";
import withDragAndDrop, {
  type EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import { toast } from "sonner";
import { TimezoneNotice } from "@/components/TimezoneNotice";
import { useOperationalSettings } from "@/hooks/useOperationalSettings";
import { CalendarErrorBoundary } from "./CalendarErrorBoundary";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Add a type for the localizer
import type { DateLocalizer } from "react-big-calendar";
// src/features/admin/components/scheduling/DesktopCalendarView.tsx
import { CalendarHeader } from "./CalendarHeader";
import type { TimeSlot } from "./calendarUtils";
import { DayDetailPopover } from "./DayDetailPopover";
import { EnhancedCalendarHeader } from "./EnhancedCalendarHeader";

// Extended calendar event type for our specific needs
interface ExtendedCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: string;
  allDay: boolean;
  backgroundColor: string;
  slot: TimeSlot;
}

interface BlockedDateRange {
  id: string;
  title: string;
  description?: string;
  startDate: string | Date;
  endDate: string | Date;
  type: "TRAVEL" | "COMPETITION" | "OTHER";
  createdById: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface DesktopCalendarViewProps {
  localizer: DateLocalizer;
  events: ExtendedCalendarEvent[];
  date: Date;
  calendarView: string;
  onSelectSlot: (slotInfo: SlotInfo, options?: { isBlockedDate?: boolean }) => void;
  onSelectEvent: (event: ExtendedCalendarEvent) => void;
  onEventDrop: (eventData: EventInteractionArgs<ExtendedCalendarEvent>) => void;
  dateRangeText: string;
  onViewChange: (view: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onDateChange?: (date: Date) => void;
  rinkTimezone: string;
  rinkName?: string;
  isSelectionMode?: boolean;
  selectedSlotIds?: Set<string>;
  onSlotSelection?: (slotId: string, isSelected: boolean) => void;
  timeSlots?: TimeSlot[];
  onDayClick?: (date: Date) => void;
  onCreateSlot?: (date: Date) => void;
  onEditSlot?: (slot: TimeSlot) => void;
  onDeleteSlot?: (slotId: string) => void;
  useEnhancedHeader?: boolean;
  blockedDateRanges?: BlockedDateRange[];
}

// Create DnD Calendar outside component to prevent recreation on every render
const DnDCalendar = withDragAndDrop(Calendar);

export const DesktopCalendarView: FC<DesktopCalendarViewProps> = ({
  localizer,
  events,
  date,
  calendarView,
  onSelectSlot,
  onSelectEvent,
  onEventDrop,
  dateRangeText,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onDateChange,
  rinkTimezone,
  rinkName,
  isSelectionMode = false,
  selectedSlotIds = new Set(),
  onSlotSelection,
  timeSlots = [],
  onCreateSlot,
  onEditSlot,
  onDeleteSlot,
  useEnhancedHeader = true,
  blockedDateRanges = [],
}) => {
  const calendarRef = useRef(null);

  // Use operational settings for dynamic calendar hours
  const { businessHours, validateTimeSlot, isDayActive } = useOperationalSettings();

  // Check if a date is blocked
  const isDateBlocked = useCallback(
    (date: Date) => {
      return blockedDateRanges.some((range) => {
        const start = new Date(range.startDate);
        const end = new Date(range.endDate);
        const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return checkDate >= start && checkDate <= end;
      });
    },
    [blockedDateRanges],
  );

  // Create blocked date events for all views
  const blockedEvents = useMemo(() => {
    const blocked: ExtendedCalendarEvent[] = [];
    blockedDateRanges.forEach((range) => {
      const start = new Date(range.startDate);
      const end = new Date(range.endDate);

      // Validate dates before processing
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        console.error("Invalid date in blocked range:", range);
        return;
      }

      // Create events for each day in the blocked range
      // Use a safe iteration method that doesn't mutate the loop variable
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dayKey = currentDate.toDateString();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const date = currentDate.getDate();

        // Create a blocked event spanning multiple hours for visibility
        blocked.push({
          id: `blocked-${range.id}-${year}-${month + 1}-${date}`,
          title: `🚫 ${range.title}`,
          start: new Date(year, month, date, 10, 0), // 10 AM
          end: new Date(year, month, date, 14, 0), // 2 PM (4 hours span)
          allDay: false,
          resourceId: `blocked-${dayKey}`,
          backgroundColor:
            range.type === "TRAVEL"
              ? "#ef4444" // Red for travel
              : range.type === "COMPETITION"
                ? "#f97316" // Orange for competition
                : "#6b7280", // Gray for other
          slot: {
            id: `blocked-${range.id}`,
            isBlocked: true,
            blockedRange: {
              ...range,
              // Convert to old format for compatibility
              dateRange: {
                from: new Date(range.startDate),
                to: new Date(range.endDate),
              },
              type: range.type.toLowerCase(),
            },
          } as any,
        });

        // Move to next day safely
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    return blocked;
  }, [blockedDateRanges]);

  // Process events for month view - create daily summary events
  const processedMonthEvents = useMemo(() => {
    if (calendarView !== "month" || !timeSlots) {
      return [...events, ...blockedEvents];
    }

    // Group time slots by day
    const dayGroups = new Map<string, TimeSlot[]>();

    timeSlots.forEach((slot) => {
      const slotDate = new Date(slot.startTime);
      const dayKey = slotDate.toDateString();

      if (!dayGroups.has(dayKey)) {
        dayGroups.set(dayKey, []);
      }
      const daySlots = dayGroups.get(dayKey);
      if (daySlots) {
        daySlots.push(slot);
      }
    });

    // Create summary events for each day
    const summaryEvents = Array.from(dayGroups.entries()).map(([dayKey, slots]) => {
      const dayDate = new Date(dayKey);
      const isToday = dayDate.toDateString() === new Date().toDateString();
      const isPast = dayDate < new Date() && !isToday;

      // Calculate statistics
      let totalHours = 0;
      let studentCount = 0;
      let availableSlots = 0;

      slots.forEach((slot) => {
        const startTime = new Date(slot.startTime);
        const endTime = new Date(slot.endTime);
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        const studentsInSlot = slot.Lesson?.length || 0;
        if (studentsInSlot > 0) {
          totalHours += hours;
          studentCount += studentsInSlot;
        } else {
          availableSlots++;
        }
      });

      // Create title based on past/present/future
      let title = "";
      if (totalHours > 0) {
        const verb = isPast ? "worked" : "scheduled";
        title = `${totalHours.toFixed(1)}h ${verb}`;
      }
      if (studentCount > 0) {
        title += title
          ? `, ${studentCount} student${studentCount !== 1 ? "s" : ""}`
          : `${studentCount} student${studentCount !== 1 ? "s" : ""}`;
      }
      if (availableSlots > 0) {
        title += title
          ? `, ${availableSlots} open`
          : `${availableSlots} open slot${availableSlots !== 1 ? "s" : ""}`;
      }

      if (!title) {
        title = "No activity";
      }

      // Create a single event that spans 1 hour at the beginning of the day for better visibility
      return {
        id: `day-summary-${dayKey}`,
        title,
        start: new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 8, 0),
        end: new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 9, 0),
        allDay: false,
        resourceId: `day-${dayKey}`,
        backgroundColor: totalHours > 0 ? "#22c55e" : "#94a3b8",
        slot: { id: `summary-${dayKey}`, totalHours, studentCount, availableSlots } as any,
      };
    });

    // Combine blocked events and summary events
    return [...blockedEvents, ...summaryEvents];
  }, [calendarView, timeSlots, events, blockedEvents]);

  // rinkTimezone and rinkName are now passed as props

  // Custom event component for React Big Calendar
  const EventComponent = useCallback(
    (props: EventProps<object>) => {
      const event = props.event as ExtendedCalendarEvent;
      const timezone = event.slot?.Rink?.timezone || "America/New_York";
      const isSelected = event.slot?.id ? selectedSlotIds.has(event.slot.id) : false;

      // Check if this is a blocked date event
      if (event.slot && "isBlocked" in event.slot && event.slot.isBlocked) {
        const blockedRange = "blockedRange" in event.slot ? event.slot.blockedRange : null;
        return (
          <div
            style={{
              backgroundColor: event.backgroundColor,
              color: "white",
              borderRadius: "6px",
              padding: "4px 8px",
              height: "100%",
              overflow: "hidden",
              fontSize: "11px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              textAlign: "center",
              border: "2px solid rgba(255,255,255,0.3)",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <div className="w-full">
              <div className="font-bold">{event.title}</div>
              {blockedRange &&
                typeof blockedRange === "object" &&
                "description" in blockedRange &&
                (blockedRange as any).description && (
                  <div className="text-xs opacity-90 mt-1">
                    {String((blockedRange as any).description)}
                  </div>
                )}
            </div>
          </div>
        );
      }

      // For month view, show daily summary information with day detail popover
      if (calendarView === "month") {
        const eventDate = new Date(event.start);

        return (
          <div
            style={{
              backgroundColor: event.backgroundColor,
              color: "white",
              borderRadius: "4px",
              padding: "2px 6px",
              height: "100%",
              overflow: "hidden",
              border: isSelectionMode && isSelected ? "3px solid #3b82f6" : "none",
              boxSizing: "border-box",
              fontSize: "11px",
              lineHeight: "1.3",
              position: "relative",
            }}
          >
            {isSelectionMode && (
              <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-white">
                {isSelected && <div className="w-full h-full rounded-full bg-blue-500" />}
              </div>
            )}
            <div className="font-medium mb-1">{event.title}</div>

            {/* Day detail popover trigger - only show if not in selection mode */}
            {!isSelectionMode && (
              <div className="absolute bottom-1 right-1">
                <DayDetailPopover
                  date={eventDate}
                  timeSlots={timeSlots}
                  timezone={timezone}
                  rinkName={rinkName}
                  onCreateSlot={onCreateSlot}
                  onEditSlot={onEditSlot}
                  onDeleteSlot={onDeleteSlot}
                  trigger={
                    <button
                      type="button"
                      className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-bold text-white">•••</span>
                    </button>
                  }
                />
              </div>
            )}
          </div>
        );
      }

      // Detailed display for week/day views
      return (
        <div
          style={{
            backgroundColor: event.backgroundColor,
            color: "white",
            borderRadius: "4px",
            padding: "2px 4px",
            height: "100%",
            overflow: "hidden",
            border: isSelectionMode && isSelected ? "3px solid #3b82f6" : "none",
            boxSizing: "border-box",
          }}
        >
          {isSelectionMode && (
            <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-white">
              {isSelected && <div className="w-full h-full rounded-full bg-blue-500" />}
            </div>
          )}
          <div className="font-medium">{event.title}</div>
        </div>
      );
    },
    [
      rinkName,
      isSelectionMode,
      selectedSlotIds,
      calendarView,
      timeSlots,
      onCreateSlot,
      onEditSlot,
      onDeleteSlot,
    ],
  );

  // Accessor functions for calendar
  const startAccessor = useCallback((event: object) => {
    return (event as ExtendedCalendarEvent).start;
  }, []);

  const endAccessor = useCallback((event: object) => {
    return (event as ExtendedCalendarEvent).end;
  }, []);

  // Event prop getter
  const eventPropGetter = useCallback((event: object) => {
    const typedEvent = event as ExtendedCalendarEvent;
    return {
      style: {
        backgroundColor: typedEvent.backgroundColor,
      },
    };
  }, []);

  // Wrapper function to handle event selection with correct types
  const handleSelectEvent = useCallback(
    (event: object, _e: SyntheticEvent<HTMLElement, Event>) => {
      const typedEvent = event as ExtendedCalendarEvent;

      // Check if this is a blocked date event - handle specially
      if (typedEvent.slot && "isBlocked" in typedEvent.slot && typedEvent.slot.isBlocked) {
        onSelectEvent(typedEvent);
        return;
      }

      if (isSelectionMode && onSlotSelection) {
        // In selection mode, toggle the slot selection
        const slotId = typedEvent.slot.id;
        const isSelected = selectedSlotIds.has(slotId);
        onSlotSelection(slotId, !isSelected);
      } else {
        // Normal mode, open the management dialog
        onSelectEvent(typedEvent);
      }
    },
    [onSelectEvent, isSelectionMode, onSlotSelection, selectedSlotIds],
  );

  // Wrapper function to handle event dropping with correct types
  const handleEventDrop = useCallback(
    (eventDropInfo: EventInteractionArgs<object>) => {
      // Cast to the expected type
      onEventDrop(eventDropInfo as unknown as EventInteractionArgs<ExtendedCalendarEvent>);
    },
    [onEventDrop],
  );

  // Wrapper function to handle slot selection with blocked date checking
  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      // Check if the selected date is blocked — allow it but pass flag for virtual rink filtering
      const blocked = isDateBlocked(slotInfo.start);

      // Check if the selected day is active according to operational settings
      if (!blocked && !isDayActive(slotInfo.start)) {
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const dayName = dayNames[slotInfo.start.getDay()];
        toast.error("Cannot schedule on inactive day", {
          description: `${dayName} is not configured as an active business day. Please check your operational hours settings.`,
        });
        return;
      }

      // Validate the time slot against operational hours (skip for blocked dates — virtual lessons have flexible hours)
      if (!blocked) {
        const validation = validateTimeSlot(slotInfo.start, slotInfo.end);
        if (!validation.isValid) {
          toast.error("Invalid time slot", {
            description: validation.message,
          });
          return;
        }
      }

      // Proceed with slot creation, passing blocked date flag
      onSelectSlot(slotInfo, { isBlockedDate: blocked });
    },
    [onSelectSlot, isDateBlocked, isDayActive, validateTimeSlot],
  );

  return (
    <div>
      {useEnhancedHeader ? (
        <EnhancedCalendarHeader
          dateRangeText={dateRangeText}
          calendarView={calendarView}
          currentDate={date}
          onViewChangeAction={onViewChange}
          onPrevAction={onPrev}
          onNextAction={onNext}
          onTodayAction={onToday}
          onDateChange={onDateChange}
        />
      ) : (
        <CalendarHeader
          dateRangeText={dateRangeText}
          calendarView={calendarView}
          onViewChangeAction={onViewChange}
          onPrevAction={onPrev}
          onNextAction={onNext}
          onTodayAction={onToday}
        />
      )}

      {/* Add the timezone notice banner */}
      <TimezoneNotice rinkTimezone={rinkTimezone} rinkName={rinkName} className="mb-4" />

      {/* React Big Calendar implementation - with comprehensive configuration */}
      <div className="pb-8">
        <CalendarErrorBoundary>
          <DnDCalendar
            ref={calendarRef}
            localizer={localizer}
            events={calendarView === "month" ? processedMonthEvents : [...events, ...blockedEvents]}
            startAccessor={startAccessor}
            endAccessor={endAccessor}
            style={{ height: 700 }}
            // Selection configuration
            selectable={true}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onSelecting={() => true}
            longPressThreshold={0}
            // Drag and drop configuration
            resizable={true}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventDrop}
            // View configuration
            defaultView={Views.WEEK}
            view={calendarView as (typeof Views)[keyof typeof Views]}
            date={date}
            step={15}
            timeslots={4}
            min={businessHours.displayStartTime}
            max={businessHours.displayEndTime}
            // Custom components
            components={{
              event: EventComponent,
              toolbar: () => null, // Disable the default toolbar
            }}
            eventPropGetter={eventPropGetter}
            // Performance optimizations
            popup={false}
            showMultiDayTimes={true}
            rtl={false}
          />
        </CalendarErrorBoundary>
      </div>
    </div>
  );
};
