// src/components/ui/calendar.tsx
"use client"
import React from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
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
    daysOfWeek?: number[],
    startTime?: string,
    endTime?: string
  }
  slotMinTime?: string
  slotMaxTime?: string
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
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startTime: '05:00',
    endTime: '18:00',
  },
  slotMinTime,
  slotMaxTime,
}: CalendarProps) {
  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <div className="h-[calc(100vh-12rem)] w-full">
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin, resourceTimelinePlugin]}
          initialView={initialView}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          slotMinTime={slotMinTime || "05:00:00"}
          slotMaxTime={slotMaxTime || "18:00:00"}
          selectable={selectable}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={events}
          // Only include resources if they exist
          {...(resources ? { resources } : {})}
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
    </div>
  )
}