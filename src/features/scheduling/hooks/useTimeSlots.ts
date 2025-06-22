// src/features/scheduling/hooks/useTimeSlots.ts
import { api } from "@/lib/api";
import { type TimeSlot } from "@/types/scheduling";
import { useCallback } from "react";
import { toast } from "sonner";

// Define a date range type for the hook
export interface DateRange {
  start: Date;
  end: Date;
}

export function useTimeSlots(dateRange?: DateRange, selectedRink?: string) {
  const utils = api.useUtils();

  // Get rinks data
  const getRinks = () => {
    return api.admin.schedule.getRinks.useQuery();
  };

  // Get students data
  const getStudents = () => {
    return api.admin.student.getStudents.useQuery();
  };

  // Get time slots data with optional parameters
  const getTimeSlots = (params?: {
    startDate?: Date;
    endDate?: Date;
    rinkId?: string;
  }) => {
    return api.admin.schedule.getTimeSlots.useQuery(
      {
        startDate: params?.startDate || dateRange?.start,
        endDate: params?.endDate || dateRange?.end,
        rinkId: params?.rinkId || selectedRink,
      },
      {
        refetchOnWindowFocus: false,
        staleTime: 30000,
        enabled: !!(params?.startDate || dateRange?.start),
      },
    );
  };

  // Define mutations
  const createTimeSlot = api.admin.schedule.createTimeSlot.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Time slot created successfully",
      });
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const updateTimeSlot = api.admin.schedule.updateTimeSlot.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Time slot updated successfully",
      });
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err) => {
      toast.error("Error", {
        description: err.message || "Failed to update time slot",
      });
    },
  });

  const deleteTimeSlot = api.admin.schedule.deleteTimeSlot.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Time slot deleted successfully",
      });
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err) => {
      toast.error("Error", {
        description: err.message,
      });
    },
  });

  const assignStudent = api.admin.schedule.assignStudentToTimeSlot.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Student assigned successfully",
      });
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err) => {
      toast.error("Error", {
        description: err.message,
      });
    },
  });

  const unassignStudent = api.admin.schedule.unassignStudent.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Student unassigned successfully",
      });
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err) => {
      toast.error("Error", {
        description: err.message,
      });
    },
  });

  const createBulkTimeSlots = api.admin.schedule.createBulkTimeSlots.useMutation({
    onSuccess: (data) => {
      toast("Success", {
        description: `${data.count} time slots created successfully`,
      });
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  // Add time range validation function
  const validateTimeRange = useCallback(
    ({ startTime, endTime }: { startTime: Date; endTime: Date }) => {
      if (startTime >= endTime) {
        return "End time must be after start time";
      }

      // Calculate duration in minutes
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

      if (durationMinutes < 15) {
        return "Time slot must be at least 15 minutes";
      }

      if (durationMinutes > 180) {
        return "Time slot must be less than 3 hours";
      }

      return null; // No validation error
    },
    [],
  );

  // Convenience methods that wrap the mutations
  const createSlot = useCallback(
    (data: {
      rinkId: string;
      startTime: Date;
      endTime: Date;
      maxStudents: number;
      isActive?: boolean;
    }) => {
      return createTimeSlot.mutate(data);
    },
    [createTimeSlot],
  );

  const updateSlot = useCallback(
    (id: string, startTime: Date, endTime: Date) => {
      return updateTimeSlot.mutate({ id, startTime, endTime });
    },
    [updateTimeSlot],
  );

  const deleteSlot = useCallback(
    (id: string) => {
      return deleteTimeSlot.mutate({ id });
    },
    [deleteTimeSlot],
  );

  const assignStudentToSlot = useCallback(
    (timeSlotId: string, studentId: string) => {
      return assignStudent.mutate({ timeSlotId, studentId });
    },
    [assignStudent],
  );

  const unassignStudentFromSlot = useCallback(
    (lessonId: string) => {
      return unassignStudent.mutate({ lessonId });
    },
    [unassignStudent],
  );

  const createBulkSlots = useCallback(
    (data: Parameters<typeof createBulkTimeSlots.mutate>[0]) => {
      return createBulkTimeSlots.mutate(data);
    },
    [createBulkTimeSlots],
  );

  // Get the time slots data
  const timeSlotsData = getTimeSlots().data;

  // Convert time slots to FullCalendar events
  const events =
    dateRange && timeSlotsData
      ? timeSlotsData.map((slot: TimeSlot) => {
          const studentCount = slot.lessons?.length || 0;
          const studentNames = slot.lessons?.map((lesson) => lesson.student.user.name).join(", ");
          const title = `${studentCount}/${slot.maxStudents} students${
            studentNames ? ` (${studentNames})` : ""
          } - ${slot.rink.name}`;

          // Determine if the slot is booked (has at least one student)
          const isBooked = studentCount > 0;

          return {
            id: slot.id,
            title,
            start: slot.startTime,
            end: slot.endTime,
            backgroundColor: isBooked ? "#10b981" : undefined, // Green color for booked slots
            borderColor: isBooked ? "#059669" : undefined, // Slightly darker green border for booked slots
            extendedProps: {
              ...slot,
              currentStudents: studentCount,
              isBooked,
            },
          };
        })
      : [];

  // Process events for display in the custom list view
  const processedEventsList =
    dateRange && timeSlotsData
      ? (() => {
          if (!timeSlotsData) {
            return [];
          }

          // Group events by day
          const groupedEvents = timeSlotsData.reduce(
            (groups, slot) => {
              const dateStr = new Date(slot.startTime).toISOString().split("T")[0];

              if (!groups[dateStr]) {
                groups[dateStr] = {
                  date: new Date(slot.startTime),
                  slots: [],
                };
              }

              groups[dateStr].slots.push(slot);
              return groups;
            },
            {} as Record<string, { date: Date; slots: TimeSlot[] }>,
          );

          // Convert to array and sort by date
          return Object.values(groupedEvents).sort((a, b) => a.date.getTime() - b.date.getTime());
        })()
      : [];

  return {
    // Data fetching
    getRinks,
    getStudents,
    getTimeSlots,

    // Methods
    createSlot,
    updateSlot,
    deleteSlot,
    assignStudentToSlot,
    unassignStudentFromSlot,
    createBulkSlots,

    // Add direct access to mutations for components that need them
    createTimeSlot,
    validateTimeRange,

    // Data
    events,
    processedEventsList,

    // Loading states
    loading: {
      create: createTimeSlot.isPending,
      update: updateTimeSlot.isPending,
      delete: deleteTimeSlot.isPending,
      assign: assignStudent.isPending,
      unassign: unassignStudent.isPending,
      bulkCreate: createBulkTimeSlots.isPending,
    },
  };
}
