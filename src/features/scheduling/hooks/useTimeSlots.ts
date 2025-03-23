import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { CalendarSlot, TimeRange, BookingConstraints } from "../types";
import { toast } from "sonner";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/server/api/roots";

export const useTimeSlots = (constraints?: BookingConstraints) => {
  const [loading, setLoading] = useState(false);

  const createTimeSlot = api.admin.schedule.createTimeSlot.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Time slot created successfully",
      });
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const validateTimeRange = useCallback((range: TimeRange) => {
    const { startTime, endTime } = range;
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const validations = [
      {
        passed: duration >= 30,
        message: "Time slot must be at least 30 minutes",
      },
      {
        passed: duration % 30 === 0,
        message: "Time slot must be in 30-minute increments",
      },
      {
        passed: startTime < endTime,
        message: "Start time must be before end time",
      },
    ];
    return validations.every((v) => v.passed) ? null : validations.find((v) => !v.passed)?.message;
  }, []);

  return { loading, createTimeSlot, validateTimeRange };
};
