import { api } from "@/lib/api";
import { toast } from "sonner";

export function useScheduleActions() {
  const utils = api.useUtils();

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

  // Assign student mutation
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

  // Unassign student mutation
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
    deleteTimeSlot,
    assignStudent,
    unassignStudent,
    updateTimeSlot,
  };
}