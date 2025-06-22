/**
 * Calendar Preview Component
 * 
 * Visual calendar showing selected dates and time slots for bulk creation
 * 
 * @version 1.0.0
 */

"use client";

import { addDays, format, parse } from "date-fns";
import { Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarPreviewProps {
  startDate: string;
  endDate: string;
  selectedDays: number[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  breaks: Array<{ startTime: string; duration: number }>;
}

interface PreviewDay {
  date: Date;
  isSelected: boolean;
  slotCount: number;
  dayOfWeek: number;
}

export function CalendarPreview({
  startDate,
  endDate,
  selectedDays,
  startTime,
  endTime,
  slotDuration,
  breaks,
}: CalendarPreviewProps) {
  // Return early if required data is missing
  if (!startDate || !endDate || selectedDays.length === 0) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Select dates and days to see preview</p>
        </CardContent>
      </Card>
    );
  }

  let parsedStartDate: Date;
  let parsedEndDate: Date;

  try {
    parsedStartDate = parse(startDate, "yyyy-MM-dd", new Date());
    parsedEndDate = parse(endDate, "yyyy-MM-dd", new Date());
  } catch {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6 text-center text-red-600">
          <p>Invalid date range</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate slots per day (excluding breaks)
  const calculateSlotsForDay = () => {
    if (!startTime || !endTime || slotDuration <= 0) {
      return 0;
    }

    try {
      const start = parse(startTime, "HH:mm", new Date());
      const end = parse(endTime, "HH:mm", new Date());
      const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

      // Calculate break time
      const breakTime = breaks
        .filter(b => b.startTime && b.duration > 0)
        .reduce((total, b) => total + b.duration, 0);

      const availableMinutes = totalMinutes - breakTime;
      return Math.floor(availableMinutes / slotDuration);
    } catch {
      return 0;
    }
  };

  const slotsPerDay = calculateSlotsForDay();

  // Generate preview days
  const generatePreviewDays = (): PreviewDay[] => {
    const days: PreviewDay[] = [];
    let currentDate = parsedStartDate;

    while (currentDate <= parsedEndDate) {
      const dayOfWeek = currentDate.getDay();
      const isSelected = selectedDays.includes(dayOfWeek);
      
      days.push({
        date: new Date(currentDate),
        isSelected,
        slotCount: isSelected ? slotsPerDay : 0,
        dayOfWeek,
      });

      currentDate = addDays(currentDate, 1);
    }

    return days;
  };

  const previewDays = generatePreviewDays();
  const selectedDaysData = previewDays.filter(day => day.isSelected);
  const totalSlots = selectedDaysData.reduce((sum, day) => sum + day.slotCount, 0);

  // Group days by month for better organization
  const daysByMonth = previewDays.reduce((acc, day) => {
    const monthKey = format(day.date, "yyyy-MM");
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(day);
    return acc;
  }, {} as Record<string, PreviewDay[]>);

  const getDayLabel = (dayOfWeek: number) => {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return labels[dayOfWeek];
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          Preview ({totalSlots} slots total)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex flex-wrap gap-2">
          {selectedDays.map(dayNum => (
            <Badge key={dayNum} variant="secondary" className="text-xs">
              {getDayLabel(dayNum)}s: {slotsPerDay} slots
            </Badge>
          ))}
        </div>

        {/* Time Range */}
        {startTime && endTime && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {startTime} - {endTime} ({slotDuration}min slots)
          </div>
        )}

        {/* Calendar Grid */}
        <div className="space-y-3">
          {Object.entries(daysByMonth).map(([monthKey, monthDays]) => (
            <div key={monthKey}>
              <h4 className="text-sm font-medium mb-2">
                {format(parse(monthKey, "yyyy-MM", new Date()), "MMMM yyyy")}
              </h4>
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                  <div key={`day-header-${day}-${i}`} className="text-xs text-center text-muted-foreground p-1">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {monthDays.map((day, index) => (
                  <div
                    key={`${monthKey}-${format(day.date, "yyyy-MM-dd")}`}
                    className={`
                      relative text-xs p-1 rounded text-center transition-colors
                      ${day.isSelected 
                        ? "bg-blue-100 text-blue-800 border border-blue-200" 
                        : "bg-gray-50 text-gray-400"
                      }
                    `}
                  >
                    <div className="font-medium">
                      {format(day.date, "d")}
                    </div>
                    {day.isSelected && day.slotCount > 0 && (
                      <div className="text-[10px] text-blue-600 font-medium">
                        {day.slotCount}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Breaks Summary */}
        {breaks.some(b => b.startTime && b.duration > 0) && (
          <div className="text-xs text-muted-foreground">
            <div className="font-medium mb-1">Breaks:</div>
            {breaks
              .filter(b => b.startTime && b.duration > 0)
              .map((b, i) => (
                <div key={`break-${b.startTime}-${b.duration}-${i}`}>• {b.startTime} ({b.duration}min)</div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}