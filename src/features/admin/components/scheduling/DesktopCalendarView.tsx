import { type FC, type SyntheticEvent, useCallback, useMemo, useRef } from "react";
import { Calendar, type EventProps, type SlotInfo, Views } from "react-big-calendar";
import withDragAndDrop, {
  type EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import { formatTimeWithTimezone, TimezoneNotice } from "@/components/TimezoneNotice";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Add a type for the localizer
import type { DateLocalizer } from "react-big-calendar";
// src/features/admin/components/scheduling/DesktopCalendarView.tsx
import { CalendarHeader } from "./CalendarHeader";
import { CustomMonthView } from "./CustomMonthView";
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
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  type: "travel" | "competition" | "other";
}

interface DesktopCalendarViewProps {
  localizer: DateLocalizer;
  events: ExtendedCalendarEvent[];
  date: Date;
  calendarView: string;
  onSelectSlot: (slotInfo: SlotInfo) => void;
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
  onDayClick,
  onCreateSlot,
  onEditSlot,
  onDeleteSlot,
  useEnhancedHeader = true,
  blockedDateRanges = [],
}) => {
  const calendarRef = useRef(null);

  // Check if a date is blocked
  const isDateBlocked = useCallback(
    (date: Date) => {
      return blockedDateRanges.some((range) => {
        if (!range.dateRange.from || !range.dateRange.to) return false;
        const start = new Date(range.dateRange.from);
        const end = new Date(range.dateRange.to);
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
      if (range.dateRange.from && range.dateRange.to) {
        const start = new Date(range.dateRange.from);
        const end = new Date(range.dateRange.to);

        // Create events for each day in the blocked range
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayKey = d.toDateString();

          // Create a blocked event
          blocked.push({
            id: `blocked-${range.id}-${d.toISOString().split("T")[0]}`,
            title: `🚫 ${range.title}`,
            start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0),
            end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0),
            allDay: false,
            resourceId: `blocked-${dayKey}`,
            backgroundColor:
              range.type === "travel"
                ? "#ef4444"
                : range.type === "competition"
                  ? "#f97316"
                  : "#6b7280",
            slot: {
              id: `blocked-${range.id}`,
              isBlocked: true,
              blockedRange: range,
            } as any,
          });
        }
      }
    });
    return blocked;
  }, [blockedDateRanges]);

  // Process events for month view - create daily summary events
  const processedMonthEvents = useMemo(() => {
    if (calendarView !== "month" || !timeSlots) return [...events, ...blockedEvents];

    // Group time slots by day
    const dayGroups = new Map<string, TimeSlot[]>();

    timeSlots.forEach((slot) => {
      const slotDate = new Date(slot.startTime);
      const dayKey = slotDate.toDateString();

      if (!dayGroups.has(dayKey)) {
        dayGroups.set(dayKey, []);
      }
      dayGroups.get(dayKey)!.push(slot);
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

      if (!title) title = "No activity";

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
  }, [calendarView, timeSlots, events, blockedDateRanges, blockedEvents]);

  // rinkTimezone and rinkName are now passed as props

  // Custom event component for React Big Calendar
  const EventComponent = useCallback(
    (props: EventProps<object>) => {
      const event = props.event as ExtendedCalendarEvent;
      const timezone = event.slot?.rink?.timezone || "America/New_York";
      const isSelected = selectedSlotIds.has(event.slot.id);

      // Check if this is a blocked date event
      if (event.slot?.isBlocked) {
        const blockedRange = event.slot.blockedRange;
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
              {blockedRange?.description && (
                <div className="text-xs opacity-90 mt-1">{blockedRange.description}</div>
              )}
            </div>
          </div>
        );
      }

      // Get both local and rink formatted times
      const start = new Date(event.start);
      const end = new Date(event.end);

      const startTimeObj = formatTimeWithTimezone(start, timezone, "h:mm a");
      const endTimeObj = formatTimeWithTimezone(end, timezone, "h:mm a");

      // Format the times for display
      const localTimeStr = `${startTimeObj.localTime} - ${endTimeObj.localTime}`;
      const rinkTimeStr = `${startTimeObj.rinkTime} - ${endTimeObj.rinkTime}`;

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
          <div className="text-xs whitespace-normal">
            {localTimeStr}
            {timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone && (
              <span className="block text-xs opacity-80">
                ({rinkTimeStr} {rinkName} time)
              </span>
            )}
          </div>
        </div>
      );
    },
    [rinkName, isSelectionMode, selectedSlotIds, calendarView],
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
      // Check if the selected date is blocked
      if (isDateBlocked(slotInfo.start)) {
        // Find which blocked range this date falls into
        const blockedRange = blockedDateRanges.find((range) => {
          if (!range.dateRange.from || !range.dateRange.to) return false;
          const start = new Date(range.dateRange.from);
          const end = new Date(range.dateRange.to);
          const checkDate = new Date(
            slotInfo.start.getFullYear(),
            slotInfo.start.getMonth(),
            slotInfo.start.getDate(),
          );
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          return checkDate >= start && checkDate <= end;
        });

        // Show a message about the blocked date
        const rangeTitle = blockedRange?.title || "blocked period";
        alert(
          `Cannot create time slots on ${slotInfo.start.toLocaleDateString()} - this date is blocked for ${rangeTitle}.`,
        );
        return;
      }

      // Date is not blocked, proceed with normal slot creation
      onSelectSlot(slotInfo);
    },
    [onSelectSlot, isDateBlocked, blockedDateRanges],
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

      {/* React Big Calendar implementation - with custom month view events */}
      <div className="pb-8">
        <DnDCalendar
          ref={calendarRef}
          localizer={localizer}
          events={calendarView === "month" ? processedMonthEvents : [...events, ...blockedEvents]}
          startAccessor={startAccessor}
          endAccessor={endAccessor}
          style={{ height: 700 }}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          resizable
          defaultView={Views.WEEK}
          view={calendarView as (typeof Views)[keyof typeof Views]}
          date={date}
          step={15}
          timeslots={4}
          components={{
            event: EventComponent,
            toolbar: () => null, // Disable the default toolbar
          }}
          eventPropGetter={eventPropGetter}
          onEventDrop={handleEventDrop}
        />
      </div>
    </div>
  );
};
