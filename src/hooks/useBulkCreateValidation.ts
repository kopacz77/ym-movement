/**
 * Real-time validation hook for bulk time slot creation
 * 
 * Provides immediate feedback and conflict detection
 * 
 * @version 1.0.0
 */

"use client";

import { addDays, differenceInDays, format, isAfter, parse } from "date-fns";
import { useCallback, useMemo } from "react";
import { api } from "@/lib/api";

export interface BulkCreateFormData {
  rinkId: string;
  startDate: string;
  endDate: string;
  dailyStartTime: string;
  dailyEndTime: string;
  slotDuration: number;
  breaks: Array<{ startTime: string; duration: number }>;
  maxStudents: number;
  daysOfWeek: number[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  estimatedSlots: number;
  conflicts?: Array<{
    date: string;
    time: string;
    reason: string;
  }>;
}

export function useBulkCreateValidation(formData: Partial<BulkCreateFormData>) {
  // Query existing time slots for conflict detection
  const { data: existingSlots } = api.admin.schedule.getTimeSlots.useQuery(
    { rinkId: formData.rinkId },
    { 
      enabled: Boolean(formData.rinkId),
      staleTime: 30000, // 30 seconds
    }
  );

  const validateFormData = useCallback((data: Partial<BulkCreateFormData>): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const conflicts: Array<{ date: string; time: string; reason: string }> = [];

    // Basic validation
    if (!data.rinkId) {
      errors.push("Please select a rink");
    }

    if (!data.startDate) {
      errors.push("Start date is required");
    }

    if (!data.endDate) {
      errors.push("End date is required");
    }

    if (!data.dailyStartTime) {
      errors.push("Daily start time is required");
    }

    if (!data.dailyEndTime) {
      errors.push("Daily end time is required");
    }

    if (!data.daysOfWeek || data.daysOfWeek.length === 0) {
      errors.push("Select at least one day of the week");
    }

    if (!data.slotDuration || data.slotDuration < 15) {
      errors.push("Minimum slot duration is 15 minutes");
    }

    if (!data.maxStudents || data.maxStudents < 1) {
      errors.push("At least 1 student per slot is required");
    }

    // Date range validation
    if (data.startDate && data.endDate) {
      try {
        const startDate = parse(data.startDate, "yyyy-MM-dd", new Date());
        const endDate = parse(data.endDate, "yyyy-MM-dd", new Date());

        if (isAfter(startDate, endDate)) {
          errors.push("End date must be after start date");
        }

        const dayDifference = differenceInDays(endDate, startDate);
        if (dayDifference > 30) {
          errors.push("Date range cannot exceed 30 days");
        }

        // Warning for large date ranges
        if (dayDifference > 14) {
          warnings.push("Large date range - consider creating smaller batches");
        }
      } catch {
        errors.push("Invalid date format");
      }
    }

    // Time validation
    if (data.dailyStartTime && data.dailyEndTime) {
      try {
        const startTime = parse(data.dailyStartTime, "HH:mm", new Date());
        const endTime = parse(data.dailyEndTime, "HH:mm", new Date());

        if (isAfter(startTime, endTime)) {
          errors.push("End time must be after start time");
        }

        const timeDifference = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        if (timeDifference < (data.slotDuration || 0)) {
          errors.push("Time range too short for slot duration");
        }
      } catch {
        errors.push("Invalid time format");
      }
    }

    // Break validation
    if (data.breaks && data.breaks.length > 0) {
      const validBreaks = data.breaks.filter(b => b.startTime && b.duration > 0);
      
      if (validBreaks.length > 3) {
        errors.push("Maximum 3 breaks allowed");
      }

      // Check if breaks overlap or are outside time range
      if (data.dailyStartTime && data.dailyEndTime) {
        try {
          const dailyStart = parse(data.dailyStartTime, "HH:mm", new Date());
          const dailyEnd = parse(data.dailyEndTime, "HH:mm", new Date());

          validBreaks.forEach((breakItem, index) => {
            const breakStart = parse(breakItem.startTime, "HH:mm", new Date());
            const breakEnd = addDays(breakStart, breakItem.duration / (24 * 60));

            if (breakStart < dailyStart || breakEnd > dailyEnd) {
              warnings.push(`Break ${index + 1} is outside daily time range`);
            }
          });

          // Check for overlapping breaks
          for (let i = 0; i < validBreaks.length - 1; i++) {
            for (let j = i + 1; j < validBreaks.length; j++) {
              const break1Start = parse(validBreaks[i].startTime, "HH:mm", new Date());
              const break1End = new Date(break1Start.getTime() + validBreaks[i].duration * 60000);
              const break2Start = parse(validBreaks[j].startTime, "HH:mm", new Date());
              const break2End = new Date(break2Start.getTime() + validBreaks[j].duration * 60000);

              if (break1Start < break2End && break2Start < break1End) {
                warnings.push(`Break ${i + 1} and Break ${j + 1} overlap`);
              }
            }
          }
        } catch {
          warnings.push("Invalid break times");
        }
      }
    }

    // Conflict detection with existing slots
    if (existingSlots && data.startDate && data.endDate && data.daysOfWeek) {
      try {
        const startDate = parse(data.startDate, "yyyy-MM-dd", new Date());
        const endDate = parse(data.endDate, "yyyy-MM-dd", new Date());
        
        let currentDate = startDate;
        while (currentDate <= endDate) {
          if (data.daysOfWeek.includes(currentDate.getDay())) {
            const dateStr = format(currentDate, "yyyy-MM-dd");
            
            // Check if there are existing slots on this day
            const existingSlotsOnDay = existingSlots.filter(slot => {
              const slotDate = new Date(slot.startTime);
              return format(slotDate, "yyyy-MM-dd") === dateStr;
            });

            if (existingSlotsOnDay.length > 0) {
              // Check for time conflicts
              if (data.dailyStartTime && data.dailyEndTime) {
                const dayStart = parse(data.dailyStartTime, "HH:mm", new Date());
                const dayEnd = parse(data.dailyEndTime, "HH:mm", new Date());

                existingSlotsOnDay.forEach(slot => {
                  const slotStart = new Date(slot.startTime);
                  const slotEnd = new Date(slot.endTime);
                  const slotStartTime = format(slotStart, "HH:mm");
                  const slotEndTime = format(slotEnd, "HH:mm");

                  // Check if there's overlap
                  if (
                    (parse(slotStartTime, "HH:mm", new Date()) < dayEnd) &&
                    (parse(slotEndTime, "HH:mm", new Date()) > dayStart)
                  ) {
                    conflicts.push({
                      date: dateStr,
                      time: `${slotStartTime} - ${slotEndTime}`,
                      reason: "Overlaps with existing time slot",
                    });
                  }
                });
              }
            }
          }
          currentDate = addDays(currentDate, 1);
        }
      } catch {
        // Ignore date parsing errors for conflict detection
      }
    }

    // Calculate estimated slots
    let estimatedSlots = 0;
    if (data.startDate && data.endDate && data.daysOfWeek && data.dailyStartTime && data.dailyEndTime && data.slotDuration) {
      try {
        const startDate = parse(data.startDate, "yyyy-MM-dd", new Date());
        const endDate = parse(data.endDate, "yyyy-MM-dd", new Date());
        const selectedDaysCount = data.daysOfWeek.length;
        const dateRangeInDays = differenceInDays(endDate, startDate) + 1;
        
        // Calculate approximate weeks and multiply by selected days
        const approximateWeeks = Math.ceil(dateRangeInDays / 7);
        const totalSelectedDays = approximateWeeks * selectedDaysCount;

        // Calculate slots per day
        const startTime = parse(data.dailyStartTime, "HH:mm", new Date());
        const endTime = parse(data.dailyEndTime, "HH:mm", new Date());
        const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

        // Subtract break time
        const breakTime = (data.breaks || [])
          .filter(b => b.startTime && b.duration > 0)
          .reduce((total, b) => total + b.duration, 0);

        const availableMinutes = totalMinutes - breakTime;
        const slotsPerDay = Math.floor(availableMinutes / data.slotDuration);

        estimatedSlots = Math.max(0, totalSelectedDays * slotsPerDay);
      } catch {
        // If calculation fails, keep estimatedSlots as 0
      }
    }

    // Add warnings for large batches
    if (estimatedSlots > 100) {
      warnings.push("Large number of slots - creation may take some time");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      estimatedSlots,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  }, [existingSlots]);

  // Memoize the result to prevent unnecessary recalculations
  const validationResult = useMemo(() => {
    return validateFormData(formData);
  }, [formData, validateFormData]);

  return validationResult;
}