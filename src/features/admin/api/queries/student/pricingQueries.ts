// src/features/admin/api/queries/student/pricingQueries.ts

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/lib/trpc";
import { defaultPricingSchema, studentPricingSchema } from "./schemas";

export const pricingQueries = createTRPCRouter({
  // Query: Get default pricing
  getDefaultPricing: adminProcedure.query(async ({ ctx }) => {
    try {
      // Get the first DefaultPricing record
      const defaultPricing = await ctx.prisma.defaultPricing.findFirst();

      if (!defaultPricing) {
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
  updateDefaultPricing: adminProcedure
    .input(defaultPricingSchema)
    .mutation(async ({ ctx, input }) => {
      try {
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
  getStudentPricing: adminProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        // Get the student with pricing fields
        const student = await ctx.prisma.student.findUnique({
          where: { id: input.studentId },
          select: {
            customPricingEnabled: true,
            privateLessonPrice: true,
            groupLessonPrice: true,
            choreographyPrice: true,
            competitionPrepPrice: true,
            offIceDancePrice: true,
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
          offIceDancePrice: 75,
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
  updateStudentPricing: adminProcedure
    .input(studentPricingSchema)
    .mutation(async ({ ctx, input }) => {
      try {
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
            offIceDancePrice: input.offIceDancePrice,
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
