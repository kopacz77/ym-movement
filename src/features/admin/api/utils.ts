import type { TRPCContext } from "@/lib/trpc";
// src/features/admin/api/utils.ts
import { TRPCError } from "@trpc/server";

export const validateTimeSlot = async (
  ctx: TRPCContext,
  rinkId: string,
  startTime: Date,
  endTime: Date,
) => {
  const overlapping = await ctx.prisma.rinkTimeSlot.findFirst({
    where: {
      rinkId,
      OR: [
        {
          AND: [{ startTime: { lte: startTime } }, { endTime: { gt: startTime } }],
        },
        {
          AND: [{ startTime: { lt: endTime } }, { endTime: { gte: endTime } }],
        },
      ],
    },
  });
  if (overlapping) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Time slot overlaps with existing slot",
    });
  }
};

export const validateBooking = async (ctx: TRPCContext, _studentId: string, timeSlotId: string) => {
  const timeSlot = await ctx.prisma.rinkTimeSlot.findUnique({
    where: { id: timeSlotId },
    include: { lessons: true },
  });
  if (!timeSlot) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Time slot not found",
    });
  }
  if (timeSlot.lessons.length >= timeSlot.maxStudents) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Time slot is full",
    });
  }
  // Add more validation as needed
  return true;
};
