import { format } from "date-fns";
import type React from "react";
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
        isShort ? "truncate" : "",
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

// Helper function to determine CSS class based on status using semantic design tokens
const getStatusClass = (status: string): string => {
  switch (status.toUpperCase()) {
    case "CONFIRMED":
      return "bg-green-50 border-l-green-500 text-green-700 hover:bg-green-100";
    case "TENTATIVE":
      return "bg-yellow-50 border-l-yellow-500 text-yellow-700 hover:bg-yellow-100";
    case "CANCELLED":
      return "bg-red-50 border-l-red-500 text-red-700 hover:bg-red-100 line-through opacity-75";
    default:
      return "bg-blue-50 border-l-blue-500 text-blue-700 hover:bg-blue-100";
  }
};
