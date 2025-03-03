// src/features/student/api/queries/index.ts
import { createTRPCRouter } from '@/lib/trpc';
import { availabilityRouter } from './availabilityQueries';
import { bookingRouter } from './bookingQueries';
import { profileRouter } from './profileQueries';

export const studentRouter = createTRPCRouter({
  availability: availabilityRouter,
  booking: bookingRouter,
  profile: profileRouter,
});