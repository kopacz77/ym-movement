// src/features/admin/api/queries/coach/coachApprovalQueries.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createPasswordResetToken } from "@/lib/auth-tokens";
import { sendApprovalEmail } from "@/lib/email";
import { createTRPCRouter, superAdminProcedure } from "@/lib/trpc";

export const coachApprovalRouter = createTRPCRouter({
  // Query: Get pending coach applications
  getPendingCoachApprovals: superAdminProcedure.query(async ({ ctx }) => {
    try {
      const pendingCoaches = await ctx.prisma.coach.findMany({
        where: { isApproved: false },
        include: { User: true },
        orderBy: { createdAt: "desc" },
      });

      const formattedCoaches = pendingCoaches.map((coach) => ({
        id: coach.id,
        user: {
          name: coach.User.name || "Unnamed",
          email: coach.User.email,
        },
        bio: coach.bio,
        skills: coach.skills,
        certifications: coach.certifications,
        yearsExperience: coach.yearsExperience,
        status: "PENDING" as const,
        createdAt: coach.createdAt,
      }));

      return { coaches: formattedCoaches };
    } catch (error) {
      console.error("Error fetching pending coach approvals:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch pending coach approvals",
        cause: error,
      });
    }
  }),

  // Mutation: Approve a coach application
  approveCoach: superAdminProcedure
    .input(z.object({ coachId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const coach = await ctx.prisma.coach.findUnique({
          where: { id: input.coachId },
          include: { User: true },
        });

        if (!coach) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Coach not found",
          });
        }

        const updatedCoach = await ctx.prisma.coach.update({
          where: { id: input.coachId },
          data: {
            isApproved: true,
            isActive: true,
            approvedAt: new Date(),
            approvedById: ctx.session.user.id,
          },
          include: { User: true },
        });

        // Send approval email with registration completion link
        try {
          if (updatedCoach.User?.email) {
            const passwordResetToken = await createPasswordResetToken(
              updatedCoach.User.id,
              updatedCoach.User.email,
              updatedCoach.User.name,
              false, // Not an invitation
              false, // Don't send default email -- we send our custom approval email
            );

            await sendApprovalEmail(
              updatedCoach.User.email,
              updatedCoach.User.name || "Coach",
              passwordResetToken.token,
            );
          }
        } catch (emailError) {
          console.error("Failed to send coach approval email:", emailError);
          // Still return success even if email fails
        }

        return updatedCoach;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error approving coach:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to approve coach",
          cause: error,
        });
      }
    }),

  // Mutation: Deny a coach application
  denyCoach: superAdminProcedure
    .input(z.object({ coachId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const coach = await ctx.prisma.coach.findUnique({
          where: { id: input.coachId },
          include: { User: true },
        });

        if (!coach) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Coach not found",
          });
        }

        // Delete the User which cascades to Coach (Coach has onDelete: Cascade on User relation)
        await ctx.prisma.user.delete({
          where: { id: coach.userId },
        });

        return { success: true, message: "Coach application denied successfully" };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error denying coach:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to deny coach application",
          cause: error,
        });
      }
    }),
});
