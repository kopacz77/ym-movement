import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, superAdminProcedure } from "@/lib/trpc";

export const proposalApprovalRouter = createTRPCRouter({
  getPendingProposals: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.proposedTimeSlot.findMany({
      where: { status: "PENDING" },
      include: {
        Coach: {
          include: {
            User: { select: { name: true, email: true } },
          },
        },
        Rink: { select: { name: true, timezone: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  approveProposal: superAdminProcedure
    .input(z.object({ proposalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const proposal = await ctx.prisma.proposedTimeSlot.findUnique({
        where: { id: input.proposalId },
      });

      if (!proposal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proposal not found",
        });
      }

      if (proposal.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Proposal has already been reviewed",
        });
      }

      const result = await ctx.prisma.$transaction(async (tx) => {
        const timeSlot = await tx.rinkTimeSlot.create({
          data: {
            rinkId: proposal.rinkId,
            coachId: proposal.coachId,
            startTime: proposal.startTime,
            endTime: proposal.endTime,
            maxStudents: proposal.maxStudents,
            isActive: true,
          },
        });

        await tx.proposedTimeSlot.update({
          where: { id: input.proposalId },
          data: {
            status: "APPROVED",
            reviewedAt: new Date(),
            reviewedById: ctx.session.user.id,
          },
        });

        return timeSlot;
      });

      return result;
    }),

  denyProposal: superAdminProcedure
    .input(
      z.object({
        proposalId: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const proposal = await ctx.prisma.proposedTimeSlot.findUnique({
        where: { id: input.proposalId },
      });

      if (!proposal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proposal not found",
        });
      }

      if (proposal.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Proposal has already been reviewed",
        });
      }

      return ctx.prisma.proposedTimeSlot.update({
        where: { id: input.proposalId },
        data: {
          status: "DENIED",
          adminNotes: input.notes ?? null,
          reviewedAt: new Date(),
          reviewedById: ctx.session.user.id,
        },
      });
    }),

  getAllProposals: superAdminProcedure
    .input(
      z
        .object({
          status: z.enum(["PENDING", "APPROVED", "DENIED"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.proposedTimeSlot.findMany({
        where: input?.status ? { status: input.status } : {},
        include: {
          Coach: {
            include: {
              User: { select: { name: true, email: true } },
            },
          },
          Rink: { select: { name: true, timezone: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),
});
