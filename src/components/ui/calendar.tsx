"use client"
import React from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core'

interface CalendarProps {
  initialView?: 'timeGridWeek' | 'timeGridDay' | 'dayGridMonth'
  events?: any[]
  resources?: any[]
  selectable?: boolean
  onDateSelect?: (info: DateSelectArg) => void
  onEventClick?: (info: EventClickArg) => void
  onEventDrop?: (info: EventDropArg) => void
  businessHours?: {
    daysOfWeek?: number[]
    startTime?: string
    endTime?: string
  }
  slotMinTime?: string // New prop for visible start time
  slotMaxTime?: string // New prop for visible end time
}

export function Calendar({
  initialView = 'timeGridWeek',
  events = [],
  resources,
  selectable = true,
  onDateSelect,
  onEventClick,
  onEventDrop,
  businessHours = {
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // 0 = Sunday, 1 = Monday, etc.
    startTime: '05:00',
    endTime: '18:00',
  },
  slotMinTime, // optionally provided
  slotMaxTime, // optionally provided
}: CalendarProps) {
  return (
    <div className="h-[calc(100vh-12rem)]"> {/* Adjust height as needed */}
      <FullCalendar
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        // Use provided slotMinTime/slotMaxTime or fallback to default values
        slotMinTime={slotMinTime || "05:00:00"}
        slotMaxTime={slotMaxTime || "18:00:00"}
        expandRows={true}
        selectable={selectable}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        events={events}
        resources={resources}
        select={onDateSelect}
        eventClick={onEventClick}
        eventDrop={onEventDrop}
        businessHours={businessHours}
        editable={true}
        droppable={true}
        allDaySlot={false}
        slotDuration="00:30:00"
        slotLabelInterval="00:30"
        stickyHeaderDates={true}
        nowIndicator={true}
        height="100%"
      />
    </div>
  )
}