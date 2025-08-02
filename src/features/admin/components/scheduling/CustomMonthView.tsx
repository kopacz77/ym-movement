// src/features/admin/components/scheduling/CustomMonthView.tsx
"use client";

import { DateTime } from "luxon";
import { useMemo } from "react";
import type { ExtendedCalendarEvent } from "@/hooks/useCalendarEvents";
import type { TimeSlot } from "./calendarUtils";

interface CustomMonthViewProps {
  date: Date;
  events: ExtendedCalendarEvent[];
  timeSlots: TimeSlot[];
  onDayClick: (date: Date) => void;
  rinkTimezone: string;
}

interface DayStats {
  date: Date;
  totalHours: number;
  studentCount: number;
  availableSlots: number;
  bookedSlots: number;
  isToday: boolean;
  isCurrentMonth: boolean;
}

export function CustomMonthView({
  date,
  events,
  timeSlots,
  onDayClick,
  rinkTimezone,
}: CustomMonthViewProps) {
  // Calculate daily statistics
  const dailyStats = useMemo(() => {
    const stats = new Map<string, DayStats>();
    const currentDate = DateTime.fromJSDate(date).setZone(rinkTimezone);
    const startOfMonth = currentDate.startOf("month");
    const endOfMonth = currentDate.endOf("month");

    // Start from the first day of the week containing the first day of the month
    const startOfCalendar = startOfMonth.startOf("week");
    // End at the last day of the week containing the last day of the month
    const endOfCalendar = endOfMonth.endOf("week");

    // Initialize all days in the calendar grid
    let currentDay = startOfCalendar;
    while (currentDay <= endOfCalendar) {
      const dayKey = currentDay.toFormat("yyyy-MM-dd");
      const isCurrentMonth = currentDay.month === currentDate.month;
      const isToday = currentDay.hasSame(DateTime.now().setZone(rinkTimezone), "day");

      stats.set(dayKey, {
        date: currentDay.toJSDate(),
        totalHours: 0,
        studentCount: 0,
        availableSlots: 0,
        bookedSlots: 0,
        isToday,
        isCurrentMonth,
      });

      currentDay = currentDay.plus({ days: 1 });
    }

    // Calculate statistics from time slots
    if (timeSlots) {
      timeSlots.forEach((slot) => {
        const slotStart = DateTime.fromJSDate(new Date(slot.startTime)).setZone(rinkTimezone);
        const slotEnd = DateTime.fromJSDate(new Date(slot.endTime)).setZone(rinkTimezone);
        const dayKey = slotStart.toFormat("yyyy-MM-dd");
        const dayStats = stats.get(dayKey);

        if (dayStats) {
          // Calculate duration in hours
          const durationHours = slotEnd.diff(slotStart, "hours").hours;

          // Count students in this slot
          const studentsInSlot = slot.Lesson?.length || 0;

          if (studentsInSlot > 0) {
            dayStats.bookedSlots++;
            dayStats.totalHours += durationHours;
            dayStats.studentCount += studentsInSlot;
          } else {
            dayStats.availableSlots++;
          }
        }
      });
    }

    return Array.from(stats.values());
  }, [date, timeSlots, rinkTimezone]);

  // Group days by weeks
  const weeks = useMemo(() => {
    const weeksArray: DayStats[][] = [];
    let currentWeek: DayStats[] = [];

    dailyStats.forEach((dayStats, index) => {
      currentWeek.push(dayStats);

      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      weeksArray.push(currentWeek);
    }

    return weeksArray;
  }, [dailyStats]);

  const getDayBusyLevel = (stats: DayStats) => {
    const totalSlots = stats.bookedSlots + stats.availableSlots;
    if (totalSlots === 0) return "none";

    const busyPercentage = (stats.bookedSlots / totalSlots) * 100;
    if (busyPercentage === 0) return "none";
    if (busyPercentage <= 25) return "light";
    if (busyPercentage <= 50) return "medium";
    if (busyPercentage <= 75) return "busy";
    return "very-busy";
  };

  const getBusyLevelColor = (level: string) => {
    switch (level) {
      case "none":
        return "bg-gray-50";
      case "light":
        return "bg-green-100";
      case "medium":
        return "bg-yellow-100";
      case "busy":
        return "bg-orange-100";
      case "very-busy":
        return "bg-red-100";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <div className="w-full">
      {/* Header with day names */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="p-2 text-center font-semibold text-gray-700 border-r border-gray-200 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="border-l border-gray-200">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200">
            {week.map((dayStats) => {
              const busyLevel = getDayBusyLevel(dayStats);
              const busyColor = getBusyLevelColor(busyLevel);

              return (
                <div
                  key={dayStats.date.toISOString()}
                  className={`
                    min-h-[100px] p-2 cursor-pointer transition-colors hover:bg-blue-50 border-r border-gray-200 last:border-r-0
                    ${busyColor}
                    ${dayStats.isToday ? "ring-2 ring-blue-500 ring-inset" : ""}
                    ${dayStats.isCurrentMonth ? "" : "opacity-40"}
                  `}
                  onClick={() => onDayClick(dayStats.date)}
                >
                  {/* Date number */}
                  <div
                    className={`
                    text-sm font-medium mb-2
                    ${dayStats.isToday ? "text-blue-600 font-bold" : dayStats.isCurrentMonth ? "text-gray-900" : "text-gray-400"}
                  `}
                  >
                    {dayStats.date.getDate()}
                  </div>

                  {/* Statistics */}
                  {dayStats.isCurrentMonth &&
                    (dayStats.totalHours > 0 || dayStats.availableSlots > 0) && (
                      <div className="space-y-1">
                        {/* Hours worked */}
                        {dayStats.totalHours > 0 && (
                          <div className="text-xs font-medium text-gray-700">
                            {dayStats.totalHours.toFixed(1)}h worked
                          </div>
                        )}

                        {/* Student count */}
                        {dayStats.studentCount > 0 && (
                          <div className="text-xs text-gray-600">
                            {dayStats.studentCount} student{dayStats.studentCount !== 1 ? "s" : ""}
                          </div>
                        )}

                        {/* Available slots */}
                        {dayStats.availableSlots > 0 && (
                          <div className="text-xs text-green-600">
                            {dayStats.availableSlots} open slot
                            {dayStats.availableSlots !== 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
