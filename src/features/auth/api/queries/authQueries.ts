import { TRPCError } from "@trpc/server";
import { compare, hash } from "bcryptjs";
// src/features/auth/api/queries/authQueries.ts
import { z } from "zod";
import { logSecurityEvent, validatePasswordStrength } from "@/lib/security";
import { adminProcedure, createTRPCRouter, protectedProcedure } from "@/lib/trpc";

export const authRouter = createTRPCRouter({
  unlockAccount: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { clearLoginAttempts } = await import("@/lib/account-lockout");
      await clearLoginAttempts(input.email);

      logSecurityEvent("ACCOUNT_UNLOCKED", {
        targetEmail: input.email,
        unlockedBy: ctx.session.user.id,
      });

      return { success: true };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "New password must be at least 8 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session?.user?.id;

        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to change your password",
          });
        }

        // Validate new password against security policy
        const passwordValidation = validatePasswordStrength(input.newPassword);
        if (!passwordValidation.isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Password does not meet security requirements: ${passwordValidation.errors.join(", ")}`,
          });
        }

        // Get current user with password and email for logging
        const user = await ctx.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, password: true, email: true },
        });

        if (!user || !user.password) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found or has no password set",
          });
        }

        // Verify current password
        const isCurrentPasswordValid = await compare(input.currentPassword, user.password);

        if (!isCurrentPasswordValid) {
          // Log failed password change attempt
          logSecurityEvent("PASSWORD_CHANGE_FAILED", {
            userId: userId,
            userEmail: user.email,
            reason: "incorrect_current_password",
            ip: (ctx as any).ip,
          });

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Current password is incorrect",
          });
        }

        // Hash new password with increased work factor
        const hashedPassword = await hash(input.newPassword, 12);

        // Update password
        await ctx.prisma.user.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });

        // Log successful password change
        logSecurityEvent("PASSWORD_CHANGED", {
          userId: userId,
          userEmail: user.email,
          ip: (ctx as any).ip,
        });

        return {
          success: true,
          message: "Password updated successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Error changing password:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to change password",
          cause: error,
        });
      }
    }),
});
