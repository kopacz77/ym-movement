// src/features/student/api/queries/index.ts (MODIFIED)
import { createTRPCRouter } from "@/lib/trpc";
import { bookingRouter } from "./bookingQueries";
import { lessonRouter } from "./lessonQueries"; // Import the new router

// Add any other imports for existing routers

export const studentRouter = createTRPCRouter({
  booking: bookingRouter,
  lessons: lessonRouter, // Add the new namespace
 
});