// src/features/scheduling/components/display/DesktopCalendarView.tsx
import { Button } from "@/components/ui/button";
import { formatRinkTime } from "@/lib/timezone";
import { localizer } from "@/lib/calendar/calendarLocalizer";
import { Calendar, Event, Views, SlotInfo, View } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useCallback } from "react";

interface CalendarEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    rink: {
      id: string;
      name: string;
      timezone: string;
    };
    [key: string]: unknown;
  };
}

interface DesktopCalendarViewProps {
  calendarView: typeof Views.WEEK | typeof Views.MONTH;
  date: Date;
  events: CalendarEvent[];
  onDateSelect: (selection: SlotInfo) => void;
  onEventClick: (event: CalendarEvent) => void;
  // Remove onEventDrop prop since we're not using drag and drop
  onViewChange: (view: typeof Views.WEEK | typeof Views.MONTH) => void;
  onDateChange: (date: Date) => void;
}

export function DesktopCalendarView({
  calendarView,
  date,
  events,
  onDateSelect,
  onEventClick,
  // Remove onEventDrop from destructuring
  onViewChange,
  onDateChange,
}: DesktopCalendarViewProps) {
  // Custom event component
  const EventComponent = useCallback(
    ({ event }: { event: CalendarEvent }) => {
      const rink = event.extendedProps?.rink || {};
      const timezone = rink.timezone || "UTC";

      // Format times with the rink's timezone
      const startFormatted = formatRinkTime(event.start || new Date(), timezone, "HH:mm");
      const endFormatted = formatRinkTime(event.end || new Date(), timezone, "HH:mm");

      return (
        <div className="p-1 h-full">
          <div className="font-medium">{`${startFormatted} - ${endFormatted}`}</div>
          <div className="text-sm whitespace-normal">{event.title}</div>
          <div className="text-xs whitespace-normal">{rink.name || ""}</div>
        </div>
      );
    },
    []
  );

  // Map FullCalendar view types to React Big Calendar view types
  const getViewType = (view: typeof Views.WEEK | typeof Views.MONTH): View => {
    return view;
  };

  // Event styling
  const eventPropGetter = useCallback((event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.backgroundColor || "#3174ad",
        borderColor: event.borderColor || "#2c6aa0",
      },
    };
  }, []);

  return (
    <div>
      <div className="p-4 flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant={calendarView === Views.WEEK ? "default" : "outline"}
            onClick={() => onViewChange(Views.WEEK)}
          >
            Week
          </Button>
          <Button
            variant={calendarView === Views.MONTH ? "default" : "outline"}
            onClick={() => onViewChange(Views.MONTH)}
          >
            Month
          </Button>
        </div>
      </div>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 700 }}
        view={getViewType(calendarView)}
        date={date}
        onView={(newView) => onViewChange(newView as typeof Views.WEEK | typeof Views.MONTH)}
        onNavigate={onDateChange}
        onSelectSlot={onDateSelect}
        onSelectEvent={(event) => onEventClick(event as CalendarEvent)}
        selectable
        components={{
          event: EventComponent,
          toolbar: () => null, // Disable the default toolbar
        }}
        eventPropGetter={eventPropGetter}
        min={new Date(date.getFullYear(), date.getMonth(), date.getDate(), 5, 0)} // 5 AM
        max={new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0)} // 6 PM
        defaultView={Views.WEEK}
        views={[Views.WEEK, Views.MONTH]}
        formats={{
          timeGutterFormat: (date: Date) => {
            return new Date(date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
          },
        }}
        popup
      />
    </div>
  );
}