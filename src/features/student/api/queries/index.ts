// src/features/student/api/queries/index.ts
import { createTRPCRouter } from '@/lib/trpc';
import { bookingRouter } from './bookingQueries';
import { profileRouter } from './profileQueries';
import { lessonRouter } from './lessonQueries';

export const studentRouter = createTRPCRouter({
  booking: bookingRouter,
  profile: profileRouter,
  lessons: lessonRouter // Add the new namespace
});