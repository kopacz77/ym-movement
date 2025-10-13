import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function useScheduleActions() {
  const utils = api.useUtils();
  const queryClient = useQueryClient();

  // Create time slot mutation
  const createTimeSlot = api.admin.schedule.createTimeSlot.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Time slot created successfully",
      });
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err) => {
      toast.error("Error", {
        description: err.message,
      });
    },
  });

  // Delete time slot mutation
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

  // Bulk delete time slots mutation
  const deleteBulkTimeSlots = api.admin.schedule.deleteBulkTimeSlots.useMutation({
    onSuccess: (result) => {
      if (result.skipped && result.skipped > 0) {
        toast("Partial Success", {
          description: `Deleted ${result.count} time slots. ${result.skipped} slots with lessons were skipped.`,
        });
      } else {
        toast("Success", {
          description: `Successfully deleted ${result.count} time slots`,
        });
      }
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err) => {
      toast.error("Error", {
        description: err.message,
      });
    },
  });

  // Assign student mutation
  const assignStudent = api.admin.schedule.assignStudentToTimeSlot.useMutation({
    onMutate: async ({ timeSlotId, studentId }) => {
      try {
        // Cancel any outgoing refetches
        await utils.admin.schedule.getTimeSlots.cancel();
        await utils.admin.student.getStudents.cancel();

        // Get the query client to access all cached queries
        const queryClient = utils.client;

        // Get all cached getTimeSlots queries (with different parameters)
        const cachedQueries = (queryClient as any).getQueriesData({
          queryKey: ["admin", "schedule", "getTimeSlots"],
        });

        // Snapshot all previous values
        const previousData = cachedQueries.map(([queryKey, data]: [any, any]) => ({
          queryKey,
          data,
        }));

        // Get student data for optimistic update
        const studentsData = utils.admin.student.getStudents.getData({
          limit: 100,
          approved: true,
        });
        const student = studentsData?.students?.find((s) => s.id === studentId);

        if (student) {
          // Update all cached getTimeSlots queries
          previousData.forEach(({ queryKey, data }: { queryKey: any; data: any }, _index: any) => {
            if (data && Array.isArray(data)) {
              const updatedTimeSlots = data.map((slot: any) => {
                if (slot.id === timeSlotId) {
                  const updatedSlot = {
                    ...slot,
                    Lesson: [
                      ...(slot.Lesson || []),
                      {
                        id: `optimistic-${Date.now()}`,
                        Student: student,
                        timeSlotId: timeSlotId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                    ],
                  };
                  return updatedSlot;
                }
                return slot;
              });

              // Update this specific cached query
              (queryClient as any).setQueryData(queryKey, updatedTimeSlots);
            }
          });
        }
        return { previousData };
      } catch {
        return { previousData: [] };
      }
    },
    onSuccess: () => {
      toast("Success", {
        description: "Student assigned successfully",
      });
      // Invalidate to get the real data from server
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err, _variables, context) => {
      toast.error("Error", {
        description: err.message,
      });
      // Rollback on error
      if (context?.previousData) {
        const queryClient = utils.client;
        context.previousData.forEach(({ queryKey, data }: { queryKey: any; data: any }) => {
          (queryClient as any).setQueryData(queryKey, data);
        });
      }
    },
  });

  // Unassign student mutation
  const unassignStudent = api.admin.schedule.unassignStudent.useMutation({
    onMutate: async ({ lessonId }) => {
      console.log("unassignStudent onMutate - lessonId:", lessonId);
      // Cancel any outgoing refetches
      await utils.admin.schedule.getTimeSlots.cancel();

      // Get all cached getTimeSlots queries (with different parameters)
      const cachedQueries = queryClient.getQueriesData({
        queryKey: ["admin", "schedule", "getTimeSlots"],
      });

      console.log("cachedQueries count:", cachedQueries.length);

      // Snapshot all previous values
      const previousData = cachedQueries.map(([queryKey, data]: [any, any]) => ({
        queryKey,
        data,
      }));

      // Update all cached getTimeSlots queries
      previousData.forEach(({ queryKey, data }: { queryKey: any; data: any }) => {
        if (data && Array.isArray(data)) {
          const updatedTimeSlots = data.map((slot: any) => {
            // Ensure Lesson is an array before filtering
            const currentLessons = Array.isArray(slot.Lesson) ? slot.Lesson : [];
            return {
              ...slot,
              Lesson: currentLessons.filter((lesson: any) => lesson.id !== lessonId),
            };
          });

          // Update this specific cached query
          queryClient.setQueryData(queryKey, updatedTimeSlots);
          console.log("Updated cache for queryKey:", queryKey);
        }
      });

      return { previousData };
    },
    onSuccess: (data) => {
      console.log("unassignStudent onSuccess - data:", data);
      toast("Success", {
        description: "Student unassigned successfully",
      });
      // Invalidate to get the real data from server
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err, variables, context) => {
      console.error("unassignStudent onError - err:", err);
      console.error("unassignStudent onError - err.message:", err.message);
      console.error("unassignStudent onError - variables:", variables);
      toast.error("Error", {
        description: err.message,
      });
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(({ queryKey, data }: { queryKey: any; data: any }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
  });

  // Update time slot mutation
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

  return {
    createTimeSlot,
    deleteTimeSlot,
    deleteBulkTimeSlots,
    assignStudent,
    unassignStudent,
    updateTimeSlot,
    // Expose utils for manual cache updates if needed
    utils,
  };
}
