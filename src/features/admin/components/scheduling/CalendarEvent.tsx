import React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarEventProps {
  event: {
    title: string;
    start: Date;
    end: Date;
    status?: string;
  };
  style?: React.CSSProperties;
}

export const CalendarEvent: React.FC<CalendarEventProps> = ({ event, style }) => {
  const duration = Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60));
  const isShort = duration < 30;
  
  const statusClassName = event.status ? getStatusClass(event.status) : "";
  
  return (
    <div 
      className={cn(
        "overflow-hidden text-sm border-l-4 rounded-sm px-2 py-1", 
        statusClassName,
        isShort ? "truncate" : ""
      )}
      style={style}
    >
      <div className="font-medium">{event.title}</div>
      {!isShort && (
        <div className="text-xs opacity-80">
          {format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}
        </div>
      )}
    </div>
  );
};

// Helper function to determine CSS class based on status
const getStatusClass = (status: string): string => {
  switch (status.toUpperCase()) {
    case "CONFIRMED":
      return "bg-green-100 border-l-green-500 text-green-800";
    case "TENTATIVE":
      return "bg-yellow-100 border-l-yellow-500 text-yellow-800";
    case "CANCELLED":
      return "bg-red-100 border-l-red-500 text-red-800 line-through";
    default:
      return "bg-blue-100 border-l-blue-500 text-blue-800";
  }
};