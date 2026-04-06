// src/lib/account-lockout.ts

import { prisma } from "@/lib/prisma";

const LOCKOUT_THRESHOLD = 5; // Failed attempts before lockout
const LOCKOUT_WINDOW_MINUTES = 15; // Time window to count failed attempts
const LOCKOUT_DURATION_MINUTES = 30; // How long account stays locked

export interface LoginAttemptData {
  email: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Record a login attempt (successful or failed)
 */
export async function recordLoginAttempt(data: LoginAttemptData): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: {
        email: data.email.toLowerCase(),
        success: data.success,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    // Non-blocking - log but don't fail the login process
    console.error("Failed to record login attempt:", error);
  }
}

/**
 * Check if an account is currently locked out
 * Returns true if locked, false if allowed to attempt login
 */
export async function isAccountLockedOut(email: string): Promise<boolean> {
  try {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - LOCKOUT_WINDOW_MINUTES);

    // Count failed attempts in the lockout window
    const failedAttempts = await prisma.loginAttempt.count({
      where: {
        email: email.toLowerCase(),
        success: false,
        createdAt: {
          gte: windowStart,
        },
      },
    });

    return failedAttempts >= LOCKOUT_THRESHOLD;
  } catch (error) {
    console.error("LOCKOUT_CHECK_DB_ERROR: Could not verify lockout status:", error);
    return false; // Fail open - password check still provides security
  }
}

/**
 * Get the time until account unlocks
 * Returns null if not locked, or Date when lock expires
 */
export async function getLockoutExpiry(email: string): Promise<Date | null> {
  try {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - LOCKOUT_WINDOW_MINUTES);

    // Get the oldest failed attempt in the current window
    const oldestFailedAttempt = await prisma.loginAttempt.findFirst({
      where: {
        email: email.toLowerCase(),
        success: false,
        createdAt: {
          gte: windowStart,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!oldestFailedAttempt) {
      return null;
    }

    // Count total failed attempts
    const failedCount = await prisma.loginAttempt.count({
      where: {
        email: email.toLowerCase(),
        success: false,
        createdAt: {
          gte: windowStart,
        },
      },
    });

    if (failedCount < LOCKOUT_THRESHOLD) {
      return null;
    }

    // Calculate when the lock expires
    const lockExpiry = new Date(oldestFailedAttempt.createdAt);
    lockExpiry.setMinutes(lockExpiry.getMinutes() + LOCKOUT_DURATION_MINUTES);

    return lockExpiry > new Date() ? lockExpiry : null;
  } catch (error) {
    console.error("Error getting lockout expiry:", error);
    return null;
  }
}

/**
 * Clear failed login attempts for an email (e.g., after successful login)
 */
export async function clearLoginAttempts(email: string): Promise<void> {
  try {
    await prisma.loginAttempt.deleteMany({
      where: {
        email: email.toLowerCase(),
        success: false,
      },
    });
  } catch (error) {
    console.error("Error clearing login attempts:", error);
  }
}

/**
 * Get remaining attempts before lockout
 */
export async function getRemainingAttempts(email: string): Promise<number> {
  try {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - LOCKOUT_WINDOW_MINUTES);

    const failedAttempts = await prisma.loginAttempt.count({
      where: {
        email: email.toLowerCase(),
        success: false,
        createdAt: {
          gte: windowStart,
        },
      },
    });

    return Math.max(0, LOCKOUT_THRESHOLD - failedAttempts);
  } catch (error) {
    console.error("LOCKOUT_CHECK_DB_ERROR: Could not get remaining attempts:", error);
    return LOCKOUT_THRESHOLD; // Fail open - report full attempts available
  }
}
