import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { coachProcedure, createTRPCRouter } from "@/lib/trpc";

export const proposalRouter = createTRPCRouter({
  getRinks: coachProcedure.query(async ({ ctx }) => {
    return ctx.prisma.rink.findMany({
      select: { id: true, name: true, timezone: true },
      orderBy: { name: "asc" },
    });
  }),

  createProposal: coachProcedure
    .input(
      z.object({
        rinkId: z.string(),
        startTime: z.date(),
        endTime: z.date(),
        maxStudents: z.number().int().min(1).max(10).optional().default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.endTime <= input.startTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time",
        });
      }

      // Verify the rink exists
      const rink = await ctx.prisma.rink.findUnique({
        where: { id: input.rinkId },
      });

      if (!rink) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rink not found",
        });
      }

      return ctx.prisma.proposedTimeSlot.create({
        data: {
          coachId: ctx.coach.id,
          rinkId: input.rinkId,
          startTime: input.startTime,
          endTime: input.endTime,
          maxStudents: input.maxStudents,
          status: "PENDING",
        },
        include: {
          Rink: { select: { name: true } },
        },
      });
    }),

  getMyProposals: coachProcedure
    .input(
      z
        .object({
          status: z.enum(["PENDING", "APPROVED", "DENIED"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.proposedTimeSlot.findMany({
        where: {
          coachId: ctx.coach.id,
          ...(input?.status ? { status: input.status } : {}),
        },
        include: {
          Rink: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  cancelProposal: coachProcedure
    .input(z.object({ proposalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const proposal = await ctx.prisma.proposedTimeSlot.findFirst({
        where: {
          id: input.proposalId,
          coachId: ctx.coach.id,
          status: "PENDING",
        },
      });

      if (!proposal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pending proposal not found",
        });
      }

      return ctx.prisma.proposedTimeSlot.delete({
        where: { id: input.proposalId },
      });
    }),
});
