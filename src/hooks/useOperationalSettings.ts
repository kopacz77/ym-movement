// src/hooks/useOperationalSettings.ts

import { useMemo } from "react";
import { api } from "@/lib/api";

export interface OperationalSettings {
  days: {
    [key: string]: {
      active: boolean;
      startTime: string;
      endTime: string;
    };
  };
  defaultLessonDuration: string;
  minBookingNotice: number;
  cancellationDeadline: number;
  allowOverlapping: boolean;
  autoApproval: boolean;
}

export interface BusinessHours {
  startHour: number;
  endHour: number;
  startMinutes: number;
  endMinutes: number;
  displayStartTime: Date;
  displayEndTime: Date;
}

export interface DayValidation {
  isOpen: boolean;
  startTime: string;
  endTime: string;
}

/**
 * Hook to access operational settings and provide utilities for scheduling validation
 */
export function useOperationalSettings() {
  // Fetch settings from the database
  const { data: settings, isLoading, error } = api.admin.settings.getSettings.useQuery();

  // Extract operational settings with fallback defaults
  const operationalSettings: OperationalSettings = useMemo(() => {
    if (!settings?.operational) {
      // Fallback defaults if no settings found
      return {
        days: {
          monday: { active: true, startTime: "09:00", endTime: "18:00" },
          tuesday: { active: true, startTime: "09:00", endTime: "18:00" },
          wednesday: { active: true, startTime: "09:00", endTime: "18:00" },
          thursday: { active: true, startTime: "09:00", endTime: "18:00" },
          friday: { active: true, startTime: "09:00", endTime: "18:00" },
          saturday: { active: true, startTime: "09:00", endTime: "18:00" },
          sunday: { active: false, startTime: "", endTime: "" },
        },
        defaultLessonDuration: "60",
        minBookingNotice: 24,
        cancellationDeadline: 48,
        allowOverlapping: false,
        autoApproval: true,
      };
    }
    return settings.operational;
  }, [settings]);

  // Calculate overall business hours (earliest start to latest end of active days)
  const businessHours: BusinessHours = useMemo(() => {
    const activeDays = Object.values(operationalSettings.days).filter((day) => day.active);

    if (activeDays.length === 0) {
      // No active days - use fallback
      return {
        startHour: 9,
        endHour: 18,
        startMinutes: 0,
        endMinutes: 0,
        displayStartTime: new Date(2024, 0, 1, 9, 0),
        displayEndTime: new Date(2024, 0, 1, 18, 0),
      };
    }

    // Find earliest start time and latest end time
    let earliestStart = "23:59";
    let latestEnd = "00:00";

    activeDays.forEach((day) => {
      if (day.startTime < earliestStart) earliestStart = day.startTime;
      if (day.endTime > latestEnd) latestEnd = day.endTime;
    });

    // Parse time strings
    const [startHour, startMinutes] = earliestStart.split(":").map(Number);
    const [endHour, endMinutes] = latestEnd.split(":").map(Number);

    return {
      startHour,
      endHour,
      startMinutes,
      endMinutes,
      displayStartTime: new Date(2024, 0, 1, startHour, startMinutes),
      displayEndTime: new Date(2024, 0, 1, endHour, endMinutes),
    };
  }, [operationalSettings]);

  // Get day validation for a specific date
  const getDayValidation = (date: Date): DayValidation => {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = dayNames[date.getDay()];
    const daySettings = operationalSettings.days[dayName];

    if (!daySettings || !daySettings.active) {
      return {
        isOpen: false,
        startTime: "",
        endTime: "",
      };
    }

    return {
      isOpen: true,
      startTime: daySettings.startTime,
      endTime: daySettings.endTime,
    };
  };

  // Validate if a time slot is within business hours for a specific day
  const validateTimeSlot = (start: Date, end: Date): { isValid: boolean; message?: string } => {
    const dayValidation = getDayValidation(start);

    // Check if day is open
    if (!dayValidation.isOpen) {
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayName = dayNames[start.getDay()];
      return {
        isValid: false,
        message: `${dayName} is not an active business day. Please select a different day.`,
      };
    }

    // Parse day's business hours
    const [dayStartHour, dayStartMinutes] = dayValidation.startTime.split(":").map(Number);
    const [dayEndHour, dayEndMinutes] = dayValidation.endTime.split(":").map(Number);

    // Get time slot hours and minutes
    const slotStartHour = start.getHours();
    const slotStartMinutes = start.getMinutes();
    const slotEndHour = end.getHours();
    const slotEndMinutes = end.getMinutes();

    // Convert to minutes since midnight for easier comparison
    const dayStartTotalMinutes = dayStartHour * 60 + dayStartMinutes;
    const dayEndTotalMinutes = dayEndHour * 60 + dayEndMinutes;
    const slotStartTotalMinutes = slotStartHour * 60 + slotStartMinutes;
    const slotEndTotalMinutes = slotEndHour * 60 + slotEndMinutes;

    // Check if slot is within business hours
    if (slotStartTotalMinutes < dayStartTotalMinutes || slotEndTotalMinutes > dayEndTotalMinutes) {
      return {
        isValid: false,
        message: `Time slots must be scheduled between ${dayValidation.startTime} and ${dayValidation.endTime} on this day.`,
      };
    }

    // Check minimum duration (15 minutes)
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (durationMinutes < 15) {
      return {
        isValid: false,
        message: "Time slots must be at least 15 minutes long.",
      };
    }

    return { isValid: true };
  };

  // Get list of active days
  const getActiveDays = (): string[] => {
    return Object.entries(operationalSettings.days)
      .filter(([_, daySettings]) => daySettings.active)
      .map(([dayName, _]) => dayName);
  };

  // Check if a specific day is active
  const isDayActive = (date: Date): boolean => {
    return getDayValidation(date).isOpen;
  };

  return {
    // Raw settings
    operationalSettings,
    businessHours,

    // Loading states
    isLoading,
    error,

    // Utility functions
    getDayValidation,
    validateTimeSlot,
    getActiveDays,
    isDayActive,
  };
}
