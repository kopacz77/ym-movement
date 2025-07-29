// src/lib/auth-tokens.ts
import { randomBytes } from "crypto";
import { addHours } from "date-fns";
import { sendInvitationEmail, sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

/**
 * Generates a secure random token for password reset
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Creates a password reset token for a user and sends the email
 *
 * @param userId - The ID of the user
 * @param email - The email of the user
 * @param name - The name of the user (optional)
 * @param isInvitation - Whether this is for a new account invitation (vs. password reset)
 * @returns The generated token record
 */
export async function createPasswordResetToken(
  userId: string,
  email: string,
  name?: string | null,
  isInvitation = false,
) {
  // Check if there's an existing token and delete it
  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

  // Generate a new token and expiry (1 hour from now)
  const token = generateToken();
  const expires = addHours(new Date(), 1);

  // Create the token record
  const passwordResetToken = await prisma.passwordResetToken.create({
    data: {
      userId,
      token,
      expires,
    },
  });

  // Send the proper email based on whether this is an invitation
  try {
    if (isInvitation) {
      await sendInvitationEmail(email, name || "Student", token);
    } else {
      await sendPasswordResetEmail(email, name || "Student", token);
    }
  } catch (error) {
    console.error("Failed to send email:", error);
    // We don't throw here because we want the token to be created
    // even if the email fails to send
  }

  return passwordResetToken;
}

/**
 * Verify a password reset token
 *
 * @param token - The token to verify
 * @returns The user ID if the token is valid, null otherwise
 */
export async function verifyPasswordResetToken(token: string) {
  const passwordResetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!passwordResetToken) {
    return null;
  }

  // Check if the token has expired
  if (new Date() > passwordResetToken.expires) {
    // Delete the expired token
    await prisma.passwordResetToken.delete({
      where: { id: passwordResetToken.id },
    });
    return null;
  }

  return passwordResetToken.user;
}

/**
 * Consume a password reset token (use it once and delete it)
 *
 * @param token - The token to consume
 * @returns The user ID if the token is valid and consumed, null otherwise
 */
export async function consumePasswordResetToken(token: string) {
  const passwordResetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!passwordResetToken) {
    return null;
  }

  // Check if the token has expired
  if (new Date() > passwordResetToken.expires) {
    // Delete the expired token
    await prisma.passwordResetToken.delete({
      where: { id: passwordResetToken.id },
    });
    return null;
  }

  // Delete the token after use
  await prisma.passwordResetToken.delete({
    where: { id: passwordResetToken.id },
  });

  return passwordResetToken.userId;
}
