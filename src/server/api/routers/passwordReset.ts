import { TRPCError } from "@trpc/server";
import { hash } from "bcryptjs";
// src/server/api/routers/passwordReset.ts
import { z } from "zod";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
} from "@/lib/auth-tokens";
import { validatePasswordStrength } from "@/lib/security";
import { createTRPCRouter, rateLimitedPublicProcedure } from "@/lib/trpc";

export const passwordResetRouter = createTRPCRouter({
  // Verify a password reset token
  verifyToken: rateLimitedPublicProcedure
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
  resetPassword: rateLimitedPublicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { token, password, name } = input;

      // Validate password complexity beyond minimum length
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: passwordValidation.errors.join(", "),
        });
      }

      try {
        // Verify and consume the token
        const userId = await consumePasswordResetToken(token);

        if (!userId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired token",
          });
        }

        // Hash the new password with increased work factor
        const hashedPassword = await hash(password, 12);

        // Update the user's password and name if provided
        await ctx.prisma.user.update({
          where: { id: userId },
          data: {
            password: hashedPassword,
            emailVerified: new Date(), // Mark email as verified since they accessed it
            ...(name && { name }),
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
  requestReset: rateLimitedPublicProcedure
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
