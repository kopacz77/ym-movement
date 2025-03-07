// src/features/student/api/queries/lessonQueries.ts (NEW FILE)
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';

export const lessonRouter = createTRPCRouter({
  // New endpoint to get a specific lesson by ID
  getLesson: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        console.log(`[LESSON] Fetching lesson details for ${input.id}`);
        
        // Get the lesson with related data
        const lesson = await ctx.prisma.lesson.findUnique({
          where: { 
            id: input.id,
          },
          include: {
            payment: true,
            rink: true
          }
        });

        if (!lesson) {
          console.log(`[LESSON] Lesson ${input.id} not found`);
          throw new TRPCError({ 
            code: "NOT_FOUND", 
            message: "Lesson not found" 
          });
        }

        console.log(`[LESSON] Successfully retrieved lesson ${input.id}`);
        return lesson;
      } catch (error) {
        console.error('[LESSON] Error fetching lesson:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve lesson details',
          cause: error,
        });
      }
    }),

  // This is a wrapper around the existing cancelLesson in bookingQueries
  // to make it accessible from the expected API path
  cancelLesson: publicProcedure
    .input(z.object({ 
      lessonId: z.string(),
      reason: z.string().optional().default('No reason provided'),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`[LESSON] Forwarding cancel request for lesson ${input.lessonId}`);
        
        // The actual cancelLesson implementation remains in bookingQueries
        // This is just a wrapper to make it available at the expected API path
        const result = await ctx.prisma.lesson.update({
          where: { id: input.lessonId },
          data: {
            status: 'CANCELLED',
            cancellationReason: input.reason,
            cancellationTime: new Date()
          }
        });
        
        console.log(`[LESSON] Successfully cancelled lesson ${input.lessonId}`);
        return result;
      } catch (error) {
        console.error('[LESSON] Error cancelling lesson:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel lesson',
          cause: error,
        });
      }
    }),
});