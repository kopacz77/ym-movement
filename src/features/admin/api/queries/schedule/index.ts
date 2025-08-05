// src/features/admin/api/queries/schedule/index.ts
import { createTRPCRouter } from "@/lib/trpc";
import { blockedDateRouter } from "./blockedDateQueries";
import { lessonRouter } from "./lessonQueries";
import { recurringPatternRouter } from "./recurringPatternQueries";
import { rinkRouter } from "./rinkQueries";
import { timeSlotRouter } from "./timeSlotQueries";

// Combine all routers into a single scheduleRouter
// We directly export the combined router - don't need to extract individual procedures
export const scheduleRouter = createTRPCRouter({
  // Include all procedures from the rinkRouter
  getRinks: rinkRouter.getRinks,

  // Include all procedures from the timeSlotRouter
  getTimeSlots: timeSlotRouter.getTimeSlots,
  createTimeSlot: timeSlotRouter.createTimeSlot,
  deleteTimeSlot: timeSlotRouter.deleteTimeSlot,
  deleteBulkTimeSlots: timeSlotRouter.deleteBulkTimeSlots, // Add the new procedure
  updateTimeSlot: timeSlotRouter.updateTimeSlot,
  createBulkTimeSlots: timeSlotRouter.createBulkTimeSlots,

  // Include all procedures from the lessonRouter
  createLesson: lessonRouter.createLesson,
  cancelLesson: lessonRouter.cancelLesson,
  getLessonsByDate: lessonRouter.getLessonsByDate,
  getStudents: lessonRouter.getStudents,
  assignStudentToTimeSlot: lessonRouter.assignStudentToTimeSlot,
  unassignStudent: lessonRouter.unassignStudent,

  // Include all procedures from the recurringPatternRouter
  createRecurringPattern: recurringPatternRouter.createRecurringPattern,

  // Include all procedures from the blockedDateRouter
  getBlockedDates: blockedDateRouter.getBlockedDates,
  createBlockedDate: blockedDateRouter.createBlockedDate,
  updateBlockedDate: blockedDateRouter.updateBlockedDate,
  deleteBlockedDate: blockedDateRouter.deleteBlockedDate,
});
