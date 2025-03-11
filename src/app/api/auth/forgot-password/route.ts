// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

const requestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = requestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // We don't want to reveal if a user exists or not, so always return success
    if (!user) {
      return NextResponse.json(
        { message: 'If an account with that email exists, we\'ve sent a password reset link' },
        { status: 200 }
      );
    }

    // Delete any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiry to 1 hour from now
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    // Save the token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expires,
      },
    });

    // Send the email
    await sendPasswordResetEmail(user.email, user.name || '', token);

    return NextResponse.json(
      { message: 'Password reset email sent' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in password reset request:', error);
    return NextResponse.json(
      { message: 'Something went wrong' },
      { status: 500 }
    );
  }
}