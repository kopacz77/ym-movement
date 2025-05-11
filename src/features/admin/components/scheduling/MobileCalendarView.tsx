// src/features/admin/components/scheduling/MobileCalendarView.tsx
"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { displayInRinkLocalTime } from "@/lib/timezone";
import React from "react";
import type { GroupedTimeSlot, TimeSlot } from "./calendarUtils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TimezoneNotice, formatTimeWithTimezone } from "@/components/TimezoneNotice";

interface MobileCalendarViewProps {
  dateRangeText: string;
  calendarView: string;
  onViewChangeAction: (view: string) => void;
  onPrevAction: () => void;
  onNextAction: () => void;
  onTodayAction: () => void;
  groupedSlots: GroupedTimeSlot[];
  onSlotClickAction: (slot: TimeSlot) => void;
}

export function MobileCalendarView({
  dateRangeText,
  calendarView,
  onViewChangeAction,
  onPrevAction,
  onNextAction,
  onTodayAction,
  groupedSlots,
  onSlotClickAction,
}: MobileCalendarViewProps) {
  // View switch buttons styling
  const getViewButtonClass = (view: string) => {
    return cn(
      "px-3 py-1.5 text-sm",
      calendarView === view
        ? "bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900"
        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    );
  };

  // Get status color for a slot
  const getSlotColor = (slot: TimeSlot) => {
    const lessonsCount = slot.lessons?.length || 0;
    
    if (!slot.isActive) {
      return "bg-slate-400";
    }
    
    if (lessonsCount >= slot.maxStudents) {
      return "bg-blue-500";
    }
    
    if (lessonsCount > 0) {
      return "bg-amber-400";
    }
    
    return "bg-green-500";
  };

  // Determine if we should show the timezone banner
  const showTimezoneBanner = groupedSlots.length > 0 && 
    groupedSlots[0].slots.length > 0 &&
    groupedSlots[0].slots[0].rink;

  // Get rink timezone from the first slot if available, default otherwise
  const rinkTimezone = showTimezoneBanner 
    ? groupedSlots[0].slots[0].rink.timezone 
    : "America/Los_Angeles";
    
  // Get rink name from the first slot if available, default otherwise
  const rinkName = showTimezoneBanner 
    ? groupedSlots[0].slots[0].rink.name 
    : "the rink";

  return (
    <div className="p-4">
      {/* Header with navigation */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevAction}
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">Previous</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNextAction}
            className="h-8 w-8 p-0"
          >
            <span className="sr-only">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onTodayAction}
            className="ml-2 h-8"
          >
            Today
          </Button>
        </div>

        <h2 className="text-base font-semibold">{dateRangeText}</h2>
        
        <div className="inline-flex rounded-md bg-gray-100 dark:bg-gray-800 p-0.5">
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

      {/* Add timezone notice banner */}
      {showTimezoneBanner && (
        <TimezoneNotice 
          rinkTimezone={rinkTimezone} 
          rinkName={rinkName}
          className="mb-4"
        />
      )}

      {/* Mobile list view for time slots */}
      <div className="space-y-6">
        {groupedSlots.length > 0 ? (
          groupedSlots.map((group) => (
            <div key={group.formattedDate} className="bg-white dark:bg-gray-800 rounded-md shadow">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 font-medium">
                {group.formattedDate}
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {group.slots.map((slot: TimeSlot) => {
                  // Format time in rink's timezone
                  const timezone = slot.rink.timezone;
                  const formattedStart = displayInRinkLocalTime(slot.startTime, timezone);
                  const formattedEnd = displayInRinkLocalTime(slot.endTime, timezone);
                  const timeDisplay = `${formattedStart.formattedTime} - ${formattedEnd.formattedTime}`;
                  
                  // Get user's timezone and check if we need to show local time
                  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  const showLocalTime = timezone !== userTimezone;
                  
                  // Format time in user's local timezone if needed
                  let localTimeDisplay = "";
                  if (showLocalTime) {
                    const startTimeObj = formatTimeWithTimezone(slot.startTime, timezone);
                    const endTimeObj = formatTimeWithTimezone(slot.endTime, timezone);
                    localTimeDisplay = `${startTimeObj.localTime} - ${endTimeObj.localTime}`;
                  }
                  
                  // Count lessons
                  const lessonsCount = slot.lessons?.length || 0;
                  
                  return (
                    <button
                      type="button"
                      key={slot.id}
                      className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left flex items-start"
                      onClick={() => onSlotClickAction(slot)}
                    >
                      <div className={`${getSlotColor(slot)} w-2 h-2 mt-1.5 rounded-full mr-3 flex-shrink-0`} />
                      <div className="flex-grow">
                        <div className="font-medium">{timeDisplay}</div>
                        {showLocalTime && (
                          <div className="text-xs text-gray-500">
                            Your time: {localTimeDisplay}
                          </div>
                        )}
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {slot.rink.name} ({slot.rink.timezone.split('/').pop()?.replace('_', ' ')})
                        </div>
                        <div className="text-sm">
                          {lessonsCount > 0 ? (
                            <span>
                              {lessonsCount}/{slot.maxStudents} students
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">
                              No students assigned
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-gray-800 p-8 text-center rounded-md shadow">
            <p className="text-gray-500 dark:text-gray-400">No time slots found for this period</p>
          </div>
        )}
      </div>
    </div>
  );
}