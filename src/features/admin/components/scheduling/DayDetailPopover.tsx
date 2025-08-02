// src/features/admin/components/scheduling/DayDetailPopover.tsx
"use client";

import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Edit,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { formatTimeWithTimezone } from "@/components/TimezoneNotice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { TimeSlot } from "./calendarUtils";

interface DayDetailPopoverProps {
  date: Date;
  timeSlots: TimeSlot[];
  timezone: string;
  rinkName?: string;
  onCreateSlot?: (date: Date) => void;
  onEditSlot?: (slot: TimeSlot) => void;
  onDeleteSlot?: (slotId: string) => void;
  onBackToMonth?: () => void;
  trigger?: React.ReactNode;
}

export function DayDetailPopover({
  date,
  timeSlots,
  timezone,
  rinkName,
  onCreateSlot,
  onEditSlot,
  onDeleteSlot,
  onBackToMonth,
  trigger,
}: DayDetailPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filter slots for this specific date
  const daySlots = timeSlots.filter((slot) => {
    const slotDate = new Date(slot.startTime);
    return slotDate.toDateString() === date.toDateString();
  });

  // Sort slots by start time
  const sortedSlots = [...daySlots].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  // Calculate day statistics
  const stats = sortedSlots.reduce(
    (acc, slot) => {
      const startTime = new Date(slot.startTime);
      const endTime = new Date(slot.endTime);
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      const studentsInSlot = slot.Lesson?.length || 0;
      if (studentsInSlot > 0) {
        acc.totalHours += hours;
        acc.studentCount += studentsInSlot;
      } else {
        acc.availableSlots++;
      }
      return acc;
    },
    { totalHours: 0, studentCount: 0, availableSlots: 0 },
  );

  const formatSlotTime = (slot: TimeSlot) => {
    const startTime = new Date(slot.startTime);
    const endTime = new Date(slot.endTime);

    const startTimeObj = formatTimeWithTimezone(startTime, timezone, "h:mm a");
    const endTimeObj = formatTimeWithTimezone(endTime, timezone, "h:mm a");

    return {
      local: `${startTimeObj.localTime} - ${endTimeObj.localTime}`,
      rink: `${startTimeObj.rinkTime} - ${endTimeObj.rinkTime}`,
    };
  };

  const getSlotStatusColor = (slot: TimeSlot) => {
    const studentsInSlot = slot.Lesson?.length || 0;
    if (studentsInSlot === 0) return "bg-slate-100 text-slate-700";
    if (studentsInSlot === 1) return "bg-green-100 text-green-700";
    if (studentsInSlot <= 3) return "bg-blue-100 text-blue-700";
    return "bg-purple-100 text-purple-700";
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="h-auto p-1">
      <CalendarIcon className="h-4 w-4" />
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{trigger || defaultTrigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="right">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                {date.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              {rinkName && <p className="text-sm text-muted-foreground">{rinkName}</p>}
            </div>
            {onBackToMonth && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  onBackToMonth();
                }}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Day Statistics */}
          <div className="flex items-center gap-2 mt-3">
            {stats.totalHours > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {stats.totalHours.toFixed(1)}h scheduled
              </Badge>
            )}
            {stats.studentCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {stats.studentCount} student{stats.studentCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {stats.availableSlots > 0 && (
              <Badge variant="outline" className="text-xs">
                {stats.availableSlots} open
              </Badge>
            )}
          </div>
        </div>

        {/* Create New Slot Button */}
        <div className="p-4 border-b">
          <Button
            onClick={() => {
              onCreateSlot?.(date);
              setIsOpen(false);
            }}
            className="w-full h-8"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Time Slot
          </Button>
        </div>

        {/* Time Slots List */}
        <div className="max-h-60 overflow-y-auto">
          {sortedSlots.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No time slots scheduled</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {sortedSlots.map((slot) => {
                const timeInfo = formatSlotTime(slot);
                const studentsInSlot = slot.Lesson?.length || 0;

                return (
                  <div
                    key={slot.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            className={`text-xs ${getSlotStatusColor(slot)}`}
                            variant="secondary"
                          >
                            {studentsInSlot === 0
                              ? "Available"
                              : `${studentsInSlot} student${studentsInSlot !== 1 ? "s" : ""}`}
                          </Badge>
                        </div>

                        <p className="text-sm font-medium">{timeInfo.local}</p>

                        {timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone && (
                          <p className="text-xs text-muted-foreground">
                            {timeInfo.rink} {rinkName} time
                          </p>
                        )}

                        {/* Show assigned students */}
                        {slot.Lesson && slot.Lesson.length > 0 && (
                          <div className="mt-2">
                            {slot.Lesson.map((lesson) => (
                              <p key={lesson.id} className="text-xs text-muted-foreground">
                                {lesson.Student?.User?.name || "Student"}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onEditSlot?.(slot);
                            setIsOpen(false);
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onDeleteSlot?.(slot.id);
                          }}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
