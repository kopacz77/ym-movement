"use client"
import React from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction'
import { DateSelectArg, EventClickArg, EventDropArg, DayCellContentArg } from '@fullcalendar/core'

interface CalendarProps {
  initialView?: 'timeGridWeek' | 'timeGridDay' | 'dayGridMonth'
  events?: any[]
  resources?: any[]
  selectable?: boolean
  onDateSelect?: (info: DateSelectArg) => void
  onEventClick?: (info: EventClickArg) => void
  onEventDrop?: (info: EventDropArg) => void
  businessHours?: {
    daysOfWeek?: number[],
    startTime?: string,
    endTime?: string
  }
  slotMinTime?: string
  slotMaxTime?: string
  // Additional props for date selection (expected by StudentAttendance.tsx)
  selected?: Date
  onSelect?: (date: Date | null) => void
  components?: {
    Day?: React.ComponentType<{ day: Date; [key: string]: any }>
  }
}

export function Calendar({
  initialView = 'dayGridMonth',
  events = [],
  resources,
  selectable = true,
  onDateSelect,
  onEventClick,
  onEventDrop,
  businessHours = {
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startTime: '05:00',
    endTime: '18:00',
  },
  slotMinTime,
  slotMaxTime,
  selected,
  onSelect,
  components,
}: CalendarProps) {
  const calendarProps = React.useMemo(() => {
    const props: any = {
      plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin],
      initialView,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      },
      slotMinTime: slotMinTime || "05:00:00",
      slotMaxTime: slotMaxTime || "18:00:00",
      selectable,
      selectMirror: true,
      dayMaxEvents: true,
      weekends: true,
      events,
      ...(resources ? { resources } : {}),
      select: onDateSelect,
      eventClick: onEventClick,
      eventDrop: onEventDrop,
      businessHours,
      editable: true,
      droppable: true,
      allDaySlot: false,
      slotDuration: "00:30:00",
      slotLabelInterval: "00:30",
      stickyHeaderDates: true,
      nowIndicator: true,
      height: "100%",
    };
    // Map onSelect prop to FullCalendar's dateClick event
    if (onSelect) {
      props.dateClick = (arg: DateClickArg) => {
        onSelect(new Date(arg.date));
      }
    }
    // Map custom day renderer to FullCalendar's dayCellContent
    if (components?.Day) {
      const DayComponent = components.Day;
      props.dayCellContent = (arg: DayCellContentArg) => {
        return <DayComponent day={arg.date} {...arg} />;
      }
    }
    // Add custom class to highlight the selected day
    if (selected) {
      props.dayCellClassNames = (arg: { date: Date }) => {
        const classes: string[] = [];
        const selectedStr = selected.toISOString().split("T")[0];
        const cellStr = arg.date.toISOString().split("T")[0];
        if (selectedStr === cellStr) {
          classes.push("selected-day"); // You can style .selected-day in your CSS
        }
        return classes;
      }
    }
    return props;
  }, [
    initialView,
    events,
    resources,
    selectable,
    onDateSelect,
    onEventClick,
    onEventDrop,
    businessHours,
    slotMinTime,
    slotMaxTime,
    onSelect,
    components,
    selected,
  ]);

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <div className="h-[calc(100vh-12rem)] w-full">
        <FullCalendar {...calendarProps} />
      </div>
    </div>
  )
}
