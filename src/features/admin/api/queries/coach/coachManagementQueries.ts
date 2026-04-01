// src/features/admin/api/queries/coach/coachManagementQueries.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createNotification } from "@/features/notifications/utils/notificationHelpers";
import { createPasswordResetToken } from "@/lib/auth-tokens";
import { sendApprovalEmail } from "@/lib/email";
import { createTRPCRouter, superAdminProcedure } from "@/lib/trpc";
import { formatEmail } from "@/lib/utils";

export const coachManagementRouter = createTRPCRouter({
  // Query: Get all coaches
  getAllCoaches: superAdminProcedure.query(async ({ ctx }) => {
    try {
      const coaches = await ctx.prisma.coach.findMany({
        include: {
          User: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        coaches: coaches.map((coach) => ({
          id: coach.id,
          userId: coach.userId,
          user: {
            id: coach.User.id,
            name: coach.User.name,
            email: coach.User.email,
          },
          bio: coach.bio,
          skills: coach.skills,
          certifications: coach.certifications,
          yearsExperience: coach.yearsExperience,
          isApproved: coach.isApproved,
          isActive: coach.isActive,
          suspendedAt: coach.suspendedAt,
          suspendedReason: coach.suspendedReason,
          privateLessonPrice: coach.privateLessonPrice,
          groupLessonPrice: coach.groupLessonPrice,
          choreographyPrice: coach.choreographyPrice,
          competitionPrepPrice: coach.competitionPrepPrice,
          offIceDancePrice: coach.offIceDancePrice,
          revenueSplitPercent: coach.revenueSplitPercent,
          createdAt: coach.createdAt,
        })),
      };
    } catch (error) {
      console.error("Error fetching coaches:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch coaches",
        cause: error,
      });
    }
  }),

  // Query: Get single coach by ID with full details
  getCoachById: superAdminProcedure
    .input(z.object({ coachId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const coach = await ctx.prisma.coach.findUnique({
          where: { id: input.coachId },
          include: {
            User: {
              select: { id: true, name: true, email: true, role: true, createdAt: true },
            },
            _count: {
              select: {
                Lesson: true,
                CoachStudent: true,
              },
            },
          },
        });

        if (!coach) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Coach not found",
          });
        }

        return {
          ...coach,
          lessonCount: coach._count.Lesson,
          studentCount: coach._count.CoachStudent,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching coach:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch coach details",
          cause: error,
        });
      }
    }),

  // Mutation: Create a new coach (manual admin creation)
  createCoach: superAdminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        bio: z.string().max(500).optional(),
        skills: z.array(z.string()).optional().default([]),
        certifications: z.string().max(1000).optional(),
        yearsExperience: z.number().int().min(0).max(99).optional(),
        privateLessonPrice: z.number().min(0).optional(),
        groupLessonPrice: z.number().min(0).optional(),
        choreographyPrice: z.number().min(0).optional(),
        competitionPrepPrice: z.number().min(0).optional(),
        offIceDancePrice: z.number().min(0).optional(),
        revenueSplitPercent: z.number().min(0).max(100).optional().default(70),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const normalizedEmail = formatEmail(input.email);

        // Check for duplicate email
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (existingUser) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A user with this email already exists",
          });
        }

        // Create user and coach in a transaction
        const result = await ctx.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              name: input.name,
              email: normalizedEmail,
              password: null,
              role: "COACH",
            },
          });

          const coach = await tx.coach.create({
            data: {
              userId: user.id,
              bio: input.bio ?? null,
              skills: input.skills,
              certifications: input.certifications ?? null,
              yearsExperience: input.yearsExperience ?? null,
              privateLessonPrice: input.privateLessonPrice ?? null,
              groupLessonPrice: input.groupLessonPrice ?? null,
              choreographyPrice: input.choreographyPrice ?? null,
              competitionPrepPrice: input.competitionPrepPrice ?? null,
              offIceDancePrice: input.offIceDancePrice ?? null,
              revenueSplitPercent: input.revenueSplitPercent,
              isApproved: true,
              isActive: true,
              approvedAt: new Date(),
              approvedById: ctx.session.user.id,
            },
            include: {
              User: { select: { id: true, name: true, email: true } },
            },
          });

          return { user, coach };
        });

        // Send registration completion email
        try {
          const passwordResetToken = await createPasswordResetToken(
            result.user.id,
            result.user.email,
            result.user.name,
            false,
            false,
          );

          await sendApprovalEmail(
            result.user.email,
            result.user.name || "Coach",
            passwordResetToken.token,
          );
        } catch (emailError) {
          console.error("Failed to send coach registration email:", emailError);
        }

        return result.coach;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error creating coach:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create coach",
          cause: error,
        });
      }
    }),

  // Mutation: Update coach pricing
  updateCoachPricing: superAdminProcedure
    .input(
      z.object({
        coachId: z.string(),
        privateLessonPrice: z.number().min(0).optional(),
        groupLessonPrice: z.number().min(0).optional(),
        choreographyPrice: z.number().min(0).optional(),
        competitionPrepPrice: z.number().min(0).optional(),
        offIceDancePrice: z.number().min(0).optional(),
        revenueSplitPercent: z.number().min(0).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { coachId, ...pricingData } = input;

        const coach = await ctx.prisma.coach.findUnique({
          where: { id: coachId },
        });

        if (!coach) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Coach not found",
          });
        }

        const updatedCoach = await ctx.prisma.coach.update({
          where: { id: coachId },
          data: pricingData,
          include: {
            User: { select: { id: true, name: true, email: true } },
          },
        });

        // Notify coach if revenue split was updated
        if (
          input.revenueSplitPercent !== undefined &&
          input.revenueSplitPercent !== coach.revenueSplitPercent
        ) {
          try {
            await createNotification({
              userId: updatedCoach.User.id,
              title: "Revenue Split Updated",
              message: `Your revenue split has been updated from ${coach.revenueSplitPercent}% to ${input.revenueSplitPercent}%`,
              type: "INFO",
              link: "/coach/earnings",
            });
          } catch (notifError) {
            console.error("[PRICING] Error creating coach notification:", notifError);
          }
        }

        return updatedCoach;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error updating coach pricing:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update coach pricing",
          cause: error,
        });
      }
    }),

  // Mutation: Delete coach permanently
  deleteCoach: superAdminProcedure
    .input(
      z.object({
        coachId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const coach = await ctx.prisma.coach.findUnique({
          where: { id: input.coachId },
          include: {
            User: { select: { id: true, name: true } },
            _count: {
              select: {
                Lesson: true,
                RinkTimeSlot: true,
                CoachStudent: true,
                ProposedTimeSlot: true,
                BlockedDateRange: true,
              },
            },
          },
        });

        if (!coach) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Coach not found",
          });
        }

        // Delete the User record — Coach cascades via onDelete: Cascade
        // Lessons and RinkTimeSlots will have coachId set to null (onDelete: SetNull)
        // CoachStudent and ProposedTimeSlot records cascade delete
        await ctx.prisma.user.delete({
          where: { id: coach.userId },
        });

        return {
          deletedCoachName: coach.User.name,
          affectedLessons: coach._count.Lesson,
          affectedTimeSlots: coach._count.RinkTimeSlot,
          deletedStudentLinks: coach._count.CoachStudent,
          deletedProposals: coach._count.ProposedTimeSlot,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error deleting coach:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete coach",
          cause: error,
        });
      }
    }),

  // Query: Get coach deletion impact (for confirmation dialog)
  getCoachDeletionImpact: superAdminProcedure
    .input(z.object({ coachId: z.string() }))
    .query(async ({ ctx, input }) => {
      const coach = await ctx.prisma.coach.findUnique({
        where: { id: input.coachId },
        include: {
          _count: {
            select: {
              Lesson: true,
              RinkTimeSlot: true,
              CoachStudent: true,
              ProposedTimeSlot: true,
            },
          },
        },
      });

      if (!coach) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Coach not found",
        });
      }

      return {
        lessonCount: coach._count.Lesson,
        timeSlotCount: coach._count.RinkTimeSlot,
        studentCount: coach._count.CoachStudent,
        proposalCount: coach._count.ProposedTimeSlot,
      };
    }),

  // Mutation: Toggle coach status (activate/deactivate/suspend)
  toggleCoachStatus: superAdminProcedure
    .input(
      z.object({
        coachId: z.string(),
        action: z.enum(["activate", "deactivate", "suspend"]),
        reason: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const coach = await ctx.prisma.coach.findUnique({
          where: { id: input.coachId },
          include: { User: { select: { name: true } } },
        });

        if (!coach) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Coach not found",
          });
        }

        let updateData: Record<string, unknown>;

        switch (input.action) {
          case "activate":
            updateData = {
              isActive: true,
              suspendedAt: null,
              suspendedById: null,
              suspendedReason: null,
            };
            break;
          case "deactivate":
            updateData = {
              isActive: false,
            };
            break;
          case "suspend":
            updateData = {
              isActive: false,
              suspendedAt: new Date(),
              suspendedById: ctx.session.user.id,
              suspendedReason: input.reason ?? null,
            };
            break;
        }

        const updatedCoach = await ctx.prisma.coach.update({
          where: { id: input.coachId },
          data: updateData,
          include: {
            User: { select: { id: true, name: true, email: true } },
          },
        });

        return updatedCoach;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error toggling coach status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update coach status",
          cause: error,
        });
      }
    }),
});
