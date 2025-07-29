// src/features/admin/api/queries/student/pricingQueries.ts

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { defaultPricingSchema, studentPricingSchema } from "./schemas";

export const pricingQueries = createTRPCRouter({
  // Query: Get default pricing
  getDefaultPricing: protectedProcedure.query(async ({ ctx }) => {
    try {
      console.log("Fetching default pricing");
      // Get the first DefaultPricing record
      const defaultPricing = await ctx.prisma.defaultPricing.findFirst();

      if (!defaultPricing) {
        console.log("Default pricing not found, creating...");
        // Create default pricing if none exists
        return await ctx.prisma.defaultPricing.create({
          data: {
            privateLessonPrice: 75,
            groupLessonPrice: 45,
            choreographyPrice: 90,
            competitionPrice: 95,
          },
        });
      }

      return defaultPricing;
    } catch (error) {
      console.error("Error fetching default pricing:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch default pricing",
        cause: error,
      });
    }
  }),

  // Mutation: Update default pricing
  updateDefaultPricing: protectedProcedure
    .input(defaultPricingSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("Updating default pricing");
        // Get the first DefaultPricing record
        const existingPricing = await ctx.prisma.defaultPricing.findFirst();

        if (existingPricing) {
          // Update existing record
          return await ctx.prisma.defaultPricing.update({
            where: { id: existingPricing.id },
            data: input,
          });
        }

        // Create new record if none exists
        return await ctx.prisma.defaultPricing.create({
          data: input,
        });
      } catch (error) {
        console.error("Error updating default pricing:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update default pricing",
          cause: error,
        });
      }
    }),

  // Query: Get student-specific pricing
  getStudentPricing: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        console.log(`Fetching pricing for student ID: ${input.studentId}`);

        // Get the student with pricing fields
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          select: {
            customPricingEnabled: true,
            privateLessonPrice: true,
            groupLessonPrice: true,
            choreographyPrice: true,
            competitionPrepPrice: true,
          },
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Get default pricing
        const defaultPricing = (await ctx.prisma.defaultPricing.findFirst()) || {
          privateLessonPrice: 75,
          groupLessonPrice: 45,
          choreographyPrice: 90,
          competitionPrice: 95,
        };

        return {
          student,
          defaultPricing,
        };
      } catch (error) {
        console.error("Error fetching student pricing:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch student pricing",
          cause: error,
        });
      }
    }),

  // Mutation: Update student-specific pricing
  updateStudentPricing: protectedProcedure
    .input(studentPricingSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`Updating pricing for student ID: ${input.studentId}`);

        // Check if student exists
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          select: { id: true },
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student not found",
          });
        }

        // Update student pricing
        const updatedStudent = await ctx.prisma.student.update({
          where: { id: input.studentId },
          data: {
            customPricingEnabled: input.customPricingEnabled,
            privateLessonPrice: input.privateLessonPrice,
            groupLessonPrice: input.groupLessonPrice,
            choreographyPrice: input.choreographyPrice,
            competitionPrepPrice: input.competitionPrepPrice,
          },
        });

        return updatedStudent;
      } catch (error) {
        console.error("Error updating student pricing:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update student pricing",
          cause: error,
        });
      }
    }),
});
