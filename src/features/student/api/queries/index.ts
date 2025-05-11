// src/features/student/api/queries/index.ts
import { createTRPCRouter } from "@/lib/trpc";
import { availabilityRouter } from "./availabilityQueries";
import { bookingRouter } from "./bookingQueries";
import { lessonRouter } from "./lessonQueries";
import { profileRouter } from "./profileQueries";

export const studentRouter = createTRPCRouter({
  booking: bookingRouter,
  profile: profileRouter,
  lessons: lessonRouter, // Add the new namespace
  availability: availabilityRouter,
});
