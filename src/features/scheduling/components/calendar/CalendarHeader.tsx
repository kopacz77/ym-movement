// src/features/admin/components/scheduling/CalendarHeader.tsx
"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CalendarHeaderProps {
  dateRangeText: string;
  calendarView: string;
  onViewChangeAction: (view: string) => void;
  onPrevAction: () => void;
  onNextAction: () => void;
  onTodayAction: () => void;
}

export function CalendarHeader({
  dateRangeText,
  calendarView,
  onViewChangeAction,
  onPrevAction,
  onNextAction,
  onTodayAction,
}: CalendarHeaderProps) {
  // Map FullCalendar view names to TUI Calendar view names
  const getViewButtonClass = (view: string) => {
    return cn(
      "px-3 py-1.5 text-sm",
      calendarView === view
        ? "bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900"
        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-between p-4 border-b">
      <div className="flex items-center space-x-1 mb-2 md:mb-0">
        <Button variant="outline" size="sm" onClick={onPrevAction} className="h-8 w-8 p-0">
          <span className="sr-only">Previous</span>
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onNextAction} className="h-8 w-8 p-0">
          <span className="sr-only">Next</span>
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onTodayAction} className="ml-2 h-8">
          Today
        </Button>
        <h2 className="text-lg font-semibold ml-2">{dateRangeText}</h2>
      </div>
      <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
        <button
          type="button"
          onClick={() => onViewChangeAction("month")}
          className={getViewButtonClass("month")}
        >
          Month
        </button>
        <button
          type="button"
          onClick={() => onViewChangeAction("week")}
          className={getViewButtonClass("week")}
        >
          Week
        </button>
        <button
          type="button"
          onClick={() => onViewChangeAction("day")}
          className={getViewButtonClass("day")}
        >
          Day
        </button>
      </div>
    </div>
  );
}

// Icons (copied directly to avoid additional imports)
function ChevronLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <title>Left arrow</title>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <title>Right arrow</title>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
