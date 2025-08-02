import { toast } from "sonner";
import { api } from "@/lib/api";

export function useScheduleActions() {
  const utils = api.useUtils();

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
        const cachedQueries = queryClient.getQueriesData({
          queryKey: ["admin", "schedule", "getTimeSlots"],
        });

        // Snapshot all previous values
        const previousData = cachedQueries.map(([queryKey, data]) => ({ queryKey, data }));

        // Get student data for optimistic update
        const studentsData = utils.admin.student.getStudents.getData({
          limit: 100,
          approved: true,
        });
        const student = studentsData?.students?.find((s) => s.id === studentId);

        if (student) {
          // Update all cached getTimeSlots queries
          previousData.forEach(({ queryKey, data }, index) => {
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
              queryClient.setQueryData(queryKey, updatedTimeSlots);
            }
          });
        }
        return { previousData };
      } catch (error) {
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
    onError: (err, variables, context) => {
      toast.error("Error", {
        description: err.message,
      });
      // Rollback on error
      if (context?.previousData) {
        const queryClient = utils.client;
        context.previousData.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
  });

  // Unassign student mutation
  const unassignStudent = api.admin.schedule.unassignStudent.useMutation({
    onMutate: async ({ lessonId }) => {
      // Cancel any outgoing refetches
      await utils.admin.schedule.getTimeSlots.cancel();

      // Get the query client to access all cached queries
      const queryClient = utils.client;

      // Get all cached getTimeSlots queries (with different parameters)
      const cachedQueries = queryClient.getQueriesData({
        queryKey: ["admin", "schedule", "getTimeSlots"],
      });

      // Snapshot all previous values
      const previousData = cachedQueries.map(([queryKey, data]) => ({ queryKey, data }));

      // Update all cached getTimeSlots queries
      previousData.forEach(({ queryKey, data }) => {
        if (data && Array.isArray(data)) {
          const updatedTimeSlots = data.map((slot: any) => ({
            ...slot,
            Lesson: (slot.Lesson || []).filter((lesson: any) => lesson.id !== lessonId),
          }));

          // Update this specific cached query
          queryClient.setQueryData(queryKey, updatedTimeSlots);
        }
      });

      return { previousData };
    },
    onSuccess: () => {
      toast("Success", {
        description: "Student unassigned successfully",
      });
      // Invalidate to get the real data from server
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err, variables, context) => {
      toast.error("Error", {
        description: err.message,
      });
      // Rollback on error
      if (context?.previousData) {
        const queryClient = utils.client;
        context.previousData.forEach(({ queryKey, data }) => {
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
