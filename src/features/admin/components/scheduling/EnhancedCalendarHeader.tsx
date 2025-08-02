// src/features/admin/components/scheduling/EnhancedCalendarHeader.tsx
"use client";

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface EnhancedCalendarHeaderProps {
  dateRangeText: string;
  calendarView: string;
  currentDate: Date;
  onViewChangeAction: (view: string) => void;
  onPrevAction: () => void;
  onNextAction: () => void;
  onTodayAction: () => void;
  onDateChange?: (date: Date) => void;
}

export function EnhancedCalendarHeader({
  dateRangeText,
  calendarView,
  currentDate,
  onViewChangeAction,
  onPrevAction,
  onNextAction,
  onTodayAction,
  onDateChange,
}: EnhancedCalendarHeaderProps) {
  const getViewButtonClass = (view: string) => {
    return cn(
      "px-3 py-1.5 text-sm",
      calendarView === view
        ? "bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900"
        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
    );
  };

  // Generate month and year options
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

  const handleMonthChange = (monthIndex: string) => {
    if (onDateChange) {
      const newDate = new Date(currentDate);
      newDate.setMonth(Number.parseInt(monthIndex));
      onDateChange(newDate);
    }
  };

  const handleYearChange = (year: string) => {
    if (onDateChange) {
      const newDate = new Date(currentDate);
      newDate.setFullYear(Number.parseInt(year));
      onDateChange(newDate);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between p-4 border-b">
      {/* Left section: Navigation and date */}
      <div className="flex items-center space-x-1 mb-2 md:mb-0">
        <div className="flex items-center space-x-1">
          <Button variant="outline" size="sm" onClick={onPrevAction} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous</span>
          </Button>

          <Button variant="outline" size="sm" onClick={onNextAction} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next</span>
          </Button>

          <Button variant="outline" size="sm" onClick={onTodayAction} className="ml-2 h-8">
            <CalendarIcon className="h-4 w-4 mr-1" />
            Today
          </Button>
        </div>

        {/* Enhanced Date Display with Dropdowns for Month View */}
        {calendarView === "month" && onDateChange ? (
          <div className="flex items-center space-x-2 ml-2">
            <Select value={currentDate.getMonth().toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={currentDate.getFullYear().toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <h2 className="text-lg font-semibold ml-2">{dateRangeText}</h2>
        )}
      </div>

      {/* Right section: View toggle */}
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
