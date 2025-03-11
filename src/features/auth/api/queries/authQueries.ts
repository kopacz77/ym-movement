// src/features/auth/api/queries/authQueries.ts
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcrypt';

export const authRouter = createTRPCRouter({
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(8, 'New password must be at least 8 characters'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session?.user?.id;
        
        if (!userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to change your password',
          });
        }

        // Get current user with password
        const user = await ctx.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, password: true },
        });

        if (!user || !user.password) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found or has no password set',
          });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(
          input.currentPassword,
          user.password
        );

        if (!isCurrentPasswordValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Current password is incorrect',
          });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(input.newPassword, 10);

        // Update password
        await ctx.prisma.user.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });

        return {
          success: true,
          message: 'Password updated successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error changing password:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to change password',
          cause: error,
        });
      }
    }),
});