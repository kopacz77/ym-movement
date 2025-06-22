import { TimezoneNotice, formatTimeWithTimezone } from "@/components/TimezoneNotice";
import { FC, SyntheticEvent, useCallback, useRef } from "react";
import { Calendar, EventProps, SlotInfo, Views } from "react-big-calendar";
import withDragAndDrop, { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
// src/features/admin/components/scheduling/DesktopCalendarView.tsx
import { CalendarHeader } from "./CalendarHeader";
import { TimeSlot } from "./calendarUtils";

// Add a type for the localizer
import { DateLocalizer } from "react-big-calendar";

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
  rinkTimezone: string;
  rinkName?: string;
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
  rinkTimezone,
  rinkName,
}) => {
  const calendarRef = useRef(null);

  // rinkTimezone and rinkName are now passed as props

  // Custom event component for React Big Calendar
  const EventComponent = useCallback(
    (props: EventProps<object>) => {
      const event = props.event as ExtendedCalendarEvent;
      const timezone = event.slot?.rink?.timezone || defaultRinkTimezone;

      // Get both local and rink formatted times
      const start = new Date(event.start);
      const end = new Date(event.end);

      const startTimeObj = formatTimeWithTimezone(start, timezone, "h:mm a");
      const endTimeObj = formatTimeWithTimezone(end, timezone, "h:mm a");

      // Format the times for display
      const localTimeStr = `${startTimeObj.localTime} - ${endTimeObj.localTime}`;
      const rinkTimeStr = `${startTimeObj.rinkTime} - ${endTimeObj.rinkTime}`;

      return (
        <div
          style={{
            backgroundColor: event.backgroundColor,
            color: "white",
            borderRadius: "4px",
            padding: "2px 4px",
            height: "100%",
            overflow: "hidden",
          }}
        >
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
    [rinkName],
  ); // Removed defaultRinkTimezone as it's a constant and doesn't need to be in the dependency array

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
      onSelectEvent(event as ExtendedCalendarEvent);
    },
    [onSelectEvent],
  );

  // Wrapper function to handle event dropping with correct types
  const handleEventDrop = useCallback(
    (eventDropInfo: EventInteractionArgs<object>) => {
      // Cast to the expected type
      onEventDrop(eventDropInfo as unknown as EventInteractionArgs<ExtendedCalendarEvent>);
    },
    [onEventDrop],
  );

  return (
    <div>
      <CalendarHeader
        dateRangeText={dateRangeText}
        calendarView={calendarView}
        onViewChangeAction={onViewChange}
        onPrevAction={onPrev}
        onNextAction={onNext}
        onTodayAction={onToday}
      />

      {/* Add the timezone notice banner */}
      <TimezoneNotice rinkTimezone={rinkTimezone} rinkName={rinkName} className="mb-4" />

      {/* React Big Calendar implementation - disable the default toolbar */}
      <DnDCalendar
        ref={calendarRef}
        localizer={localizer}
        events={events}
        startAccessor={startAccessor}
        endAccessor={endAccessor}
        style={{ height: 700 }}
        selectable
        onSelectSlot={onSelectSlot}
        onSelectEvent={handleSelectEvent}
        resizable
        defaultView={Views.WEEK}
        view={calendarView as (typeof Views)[keyof typeof Views]}
        date={date}
        step={30}
        timeslots={2}
        components={{
          event: EventComponent,
          toolbar: () => null, // Disable the default toolbar
        }}
        eventPropGetter={eventPropGetter}
        onEventDrop={handleEventDrop}
      />
    </div>
  );
};
