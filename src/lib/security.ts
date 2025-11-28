// src/lib/security.ts
import { randomBytes, timingSafeEqual } from "node:crypto";

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
  if (!input) {
    return "";
  }

  return (
    input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
      // Additional protection against script injections
      .replace(/javascript:/gi, "")
      .replace(/vbscript:/gi, "")
      .replace(/on\w+=/gi, "")
      // Limit length to prevent buffer overflow attacks
      .substring(0, 10000)
  );
}

/**
 * Rate limiting utility using in-memory store with memory leak protection
 */
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly MAX_ENTRIES = 10000; // Prevent unbounded memory growth

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

    // Inline cleanup to prevent memory leaks in high-traffic scenarios
    if (this.requests.size > this.MAX_ENTRIES) {
      this.cleanup();
    }

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
// Layer 3: Signup rate limiter - strict limits to prevent bot spam
export const authRateLimiter = new RateLimiter(5, 60 * 60 * 1000); // 5 signups per hour per IP
export const apiRateLimiter = new RateLimiter(100, 60 * 1000); // 100 requests per minute

// Cleanup old rate limit entries every 5 minutes (more aggressive for high traffic)
setInterval(
  () => {
    authRateLimiter.cleanup();
    apiRateLimiter.cleanup();
  },
  5 * 60 * 1000,
); // 5 minutes

/**
 * Token tracking to prevent replay attacks
 */
class TokenTracker {
  private usedTokens: Map<string, number> = new Map();
  private readonly MAX_TOKENS = 50000; // Prevent unbounded growth
  private readonly TOKEN_EXPIRY = 5 * 60 * 1000; // Tokens expire after 5 minutes

  /**
   * Mark a token as used
   * @param token - The token to mark
   * @returns True if token was newly marked (not previously used)
   */
  markUsed(token: string): boolean {
    // Cleanup if we're approaching memory limits
    if (this.usedTokens.size > this.MAX_TOKENS) {
      this.cleanup();
    }

    // Check if token was already used
    if (this.usedTokens.has(token)) {
      return false;
    }

    // Mark as used with expiry time
    this.usedTokens.set(token, Date.now() + this.TOKEN_EXPIRY);
    return true;
  }

  /**
   * Check if a token has been used
   * @param token - The token to check
   * @returns True if token has been used
   */
  isUsed(token: string): boolean {
    const expiry = this.usedTokens.get(token);
    if (!expiry) {
      return false;
    }

    // Remove if expired
    if (Date.now() > expiry) {
      this.usedTokens.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Clean up expired tokens
   */
  cleanup(): void {
    const now = Date.now();
    for (const [token, expiry] of this.usedTokens.entries()) {
      if (now > expiry) {
        this.usedTokens.delete(token);
      }
    }
  }
}

// Export token tracker instance
export const turnstileTokenTracker = new TokenTracker();

// Cleanup expired tokens every 5 minutes
setInterval(
  () => {
    turnstileTokenTracker.cleanup();
  },
  5 * 60 * 1000,
);

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

/**
 * Extract client IP from request headers with trusted proxy validation
 * Only trusts Netlify and Cloudflare headers
 * @param headers - Request headers
 * @returns Client IP address or 'unknown'
 */
export function getClientIP(headers: Headers): string {
  // Netlify-specific headers (most reliable for Netlify deployments)
  const netlifyIP = headers.get("x-nf-client-connection-ip");
  if (netlifyIP) {
    return netlifyIP;
  }

  // Cloudflare-specific header
  const cfConnectingIP = headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // X-Forwarded-For (only trust if from known proxy)
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // Take the first IP (client IP) from the chain
    const firstIP = xForwardedFor.split(",")[0]?.trim();
    if (firstIP) {
      return firstIP;
    }
  }

  // Fallback to x-real-ip
  const xRealIP = headers.get("x-real-ip");
  if (xRealIP) {
    return xRealIP;
  }

  return "unknown";
}
