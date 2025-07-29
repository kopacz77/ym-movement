// src/lib/security.ts
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/**
 * Security utility functions for the application
 */

/**
 * Generates a cryptographically secure random token
 * @param length - The length of the token in bytes (default: 32)
 * @returns A hex-encoded random token
 */
export function generateSecureToken(length = 32): string {
  return randomBytes(length).toString("hex");
}

/**
 * Validates environment variables are set and secure
 */
export function validateSecurityEnvironment(): void {
  const requiredEnvVars = ["NEXTAUTH_SECRET", "DATABASE_URL"];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
  }

  // Validate NEXTAUTH_SECRET strength
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret && secret.length < 32) {
    throw new Error("NEXTAUTH_SECRET must be at least 32 characters long");
  }

  // Validate database URL is using SSL in production
  const dbUrl = process.env.DATABASE_URL;
  if (process.env.NODE_ENV === "production" && dbUrl && !dbUrl.includes("sslmode=require")) {
    console.warn("WARNING: Database connection should use SSL in production");
  }
}

/**
 * Safely compares two strings in constant time to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
export function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input - The input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Rate limiting utility using in-memory store
 */
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(
    private maxRequests = 5,
    private windowMs: number = 15 * 60 * 1000, // 15 minutes
  ) {}

  /**
   * Check if a request is allowed for the given identifier
   * @param identifier - Unique identifier (e.g., IP address, user ID)
   * @returns True if request is allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || now > record.resetTime) {
      // First request or window expired
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (record.count >= this.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Export rate limiter instances for different use cases
export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const apiRateLimiter = new RateLimiter(100, 60 * 1000); // 100 requests per minute

/**
 * Security logging function
 * @param event - Security event type
 * @param details - Event details
 * @param userId - Optional user ID
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, any>,
  userId?: string,
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userId,
    environment: process.env.NODE_ENV,
  };

  // In production, you would send this to a security monitoring service
  console.log("SECURITY_EVENT:", JSON.stringify(logEntry));
}

/**
 * Validates that a password meets security requirements
 * @param password - The password to validate
 * @returns Validation result with success status and error messages
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (password.length > 128) {
    errors.push("Password must be less than 128 characters long");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push("Password must contain at least one special character (@$!%*?&)");
  }

  // Check for common weak passwords
  const commonPasswords = [
    "password",
    "123456789",
    "qwerty",
    "abc123",
    "password123",
    "admin",
    "letmein",
    "welcome",
    "123456",
    "password1",
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Password is too common and easily guessable");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that required security headers are present
 * @param headers - Headers object to validate
 * @returns True if all required headers are present
 */
export function validateSecurityHeaders(headers: Record<string, string>): boolean {
  const requiredHeaders = [
    "x-frame-options",
    "x-content-type-options",
    "x-xss-protection",
    "content-security-policy",
  ];

  return requiredHeaders.every((header) => headers[header] || headers[header.toLowerCase()]);
}
