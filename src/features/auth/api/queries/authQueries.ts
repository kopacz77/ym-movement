import { TRPCError } from "@trpc/server";
import { compare, hash } from "bcrypt";
// src/features/auth/api/queries/authQueries.ts
import { z } from "zod";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
} from "@/lib/auth-tokens";
import { logSecurityEvent, validatePasswordStrength } from "@/lib/security";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/lib/trpc";

export const authRouter = createTRPCRouter({
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

        // Hash new password
        const hashedPassword = await hash(input.newPassword, 10);

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

  // Verify a password reset token
  verifyResetToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const user = await verifyPasswordResetToken(input.token);

        if (!user) {
          return { valid: false, email: null };
        }

        return {
          valid: true,
          email: user.email,
          userId: user.id,
          name: user.name,
        };
      } catch (error) {
        console.error("Error verifying reset token:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify reset token",
        });
      }
    }),

  // Reset password with token
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { token, password, name } = input;

      try {
        // Validate password strength
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Password does not meet security requirements: ${passwordValidation.errors.join(", ")}`,
          });
        }

        // Verify and consume the token
        const userId = await consumePasswordResetToken(token);

        if (!userId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired token",
          });
        }

        // Hash the new password
        const hashedPassword = await hash(password, 10);

        // Update the user's password and name if provided
        await ctx.prisma.user.update({
          where: { id: userId },
          data: {
            password: hashedPassword,
            emailVerified: new Date(), // Mark email as verified since they accessed it
            ...(name && { name }), // Only update name if provided
          },
        });

        return { success: true };
      } catch (error) {
        console.error("Error resetting password:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reset password",
        });
      }
    }),

  // Request password reset email
  requestReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Find the user by email
        const user = await ctx.prisma.user.findUnique({
          where: { email: input.email },
        });

        // Always return success, even if user doesn't exist (for security)
        if (!user) {
          return { success: true };
        }

        // Create a password reset token and send email
        await createPasswordResetToken(user.id, user.email, user.name);

        return { success: true };
      } catch (error) {
        console.error("Error requesting password reset:", error);

        // Still return success to not reveal if the user exists
        return { success: true };
      }
    }),
});
