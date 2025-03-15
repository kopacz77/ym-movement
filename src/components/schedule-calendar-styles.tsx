// src/components/schedule-calendar-styles.tsx
import React from 'react';

export function ScheduleCalendarStyles() {
  return (
    <style jsx global>{`
      /* Basic calendar styling */
      .fc {
        width: 100% !important;
        height: 100% !important;
      }
      
      /* Key fix for mobile: Enable horizontal scrolling in timeGridWeek/Day views */
      @media (max-width: 768px) {
        /* Make sure the main table has a minimum width so it can be scrolled */
        .fc-timeGridWeek-view .fc-scrollgrid-sync-table,
        .fc-timeGridDay-view .fc-scrollgrid-sync-table {
          min-width: 600px !important; /* Forces content to be wider than viewport */
        }
        
        /* Critical fix: ensure the horizontal scrollbar appears */
        .fc-scroller-harness {
          overflow: visible !important;
        }
        
        /* Enable horizontal scrolling on the view area */
        .fc-view-harness {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
          min-height: 400px !important;
        }
        
        /* Make sure the scrollbars are visible and work properly */
        .fc-scroller {
          overflow: visible !important;
        }
        
        /* Ensure time slots and events are tall enough to be clickable */
        .fc-timegrid-slot {
          height: 2em !important;
        }
        
        /* Make events more visible */
        .fc-event {
          min-height: 1.5em !important;
          margin: 1px 0 !important;
        }
        
        /* Fix list view on mobile */
        .fc-list-table {
          width: 100% !important;
        }
      }
    `}</style>
  );
}