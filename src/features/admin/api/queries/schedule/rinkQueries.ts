// src/features/admin/api/queries/schedule/rinkQueries.ts

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

const createRinkSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  address: z.string().min(1, "Address is required").max(200, "Address too long"),
  timezone: z.string().min(1, "Timezone is required"),
  maxCapacity: z
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .max(1000, "Capacity too high"),
});

const updateRinkSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  address: z.string().min(1, "Address is required").max(200, "Address too long"),
  timezone: z.string().min(1, "Timezone is required"),
  maxCapacity: z
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .max(1000, "Capacity too high"),
});

const deleteRinkSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const rinkRouter = createTRPCRouter({
  getRinks: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.prisma.rink.findMany({
        select: {
          id: true,
          name: true,
          address: true,
          timezone: true,
          maxCapacity: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: "asc" },
      });
    } catch (error) {
      console.error("Error fetching rinks:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch rinks",
        cause: error,
      });
    }
  }),

  createRink: protectedProcedure.input(createRinkSchema).mutation(async ({ ctx, input }) => {
    try {
      // Check if rink name already exists
      const existingRink = await ctx.prisma.rink.findFirst({
        where: { name: input.name },
      });

      if (existingRink) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A rink with this name already exists",
        });
      }

      const rink = await ctx.prisma.rink.create({
        data: {
          name: input.name,
          address: input.address,
          timezone: input.timezone,
          maxCapacity: input.maxCapacity,
        },
      });

      return {
        success: true,
        message: `Rink "${input.name}" created successfully`,
        rink,
      };
    } catch (error) {
      console.error("Error creating rink:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create rink",
        cause: error,
      });
    }
  }),

  updateRink: protectedProcedure.input(updateRinkSchema).mutation(async ({ ctx, input }) => {
    try {
      // Check if rink exists
      const existingRink = await ctx.prisma.rink.findUnique({
        where: { id: input.id },
      });

      if (!existingRink) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rink not found",
        });
      }

      // Check if name is taken by another rink
      const nameConflict = await ctx.prisma.rink.findFirst({
        where: {
          name: input.name,
          NOT: { id: input.id },
        },
      });

      if (nameConflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A rink with this name already exists",
        });
      }

      const updatedRink = await ctx.prisma.rink.update({
        where: { id: input.id },
        data: {
          name: input.name,
          address: input.address,
          timezone: input.timezone,
          maxCapacity: input.maxCapacity,
        },
      });

      return {
        success: true,
        message: `Rink "${input.name}" updated successfully`,
        rink: updatedRink,
      };
    } catch (error) {
      console.error("Error updating rink:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update rink",
        cause: error,
      });
    }
  }),

  deleteRink: protectedProcedure.input(deleteRinkSchema).mutation(async ({ ctx, input }) => {
    try {
      // Check if rink exists
      const existingRink = await ctx.prisma.rink.findUnique({
        where: { id: input.id },
      });

      if (!existingRink) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rink not found",
        });
      }

      // Check if rink has any time slots or lessons
      const timeSlotCount = await ctx.prisma.rinkTimeSlot.count({
        where: { rinkId: input.id },
      });

      const lessonCount = await ctx.prisma.lesson.count({
        where: { rinkId: input.id },
      });

      if (timeSlotCount > 0 || lessonCount > 0) {
        const conflicts = [];
        if (timeSlotCount > 0) {
          conflicts.push(`${timeSlotCount} time slot${timeSlotCount === 1 ? "" : "s"}`);
        }
        if (lessonCount > 0) {
          conflicts.push(`${lessonCount} lesson${lessonCount === 1 ? "" : "s"}`);
        }

        throw new TRPCError({
          code: "CONFLICT",
          message: `Cannot delete rink with existing ${conflicts.join(" and ")}. Please delete all associated data first.`,
        });
      }

      await ctx.prisma.rink.delete({
        where: { id: input.id },
      });

      return {
        success: true,
        message: `Rink "${existingRink.name}" deleted successfully`,
      };
    } catch (error) {
      console.error("Error deleting rink:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete rink",
        cause: error,
      });
    }
  }),
});
