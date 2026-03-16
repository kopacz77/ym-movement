// src/lib/env-validation.ts
import { z } from "zod";

/**
 * Environment variable validation schema
 * This ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  // Required authentication variables
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url().optional(),

  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // Email service
  RESEND_API_KEY: z.string().optional(),

  // Google Calendar OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),

  // Application settings
  NODE_ENV: z.enum(["development", "production", "test"]),
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),

  // Security settings
  ENABLE_AUTH_BYPASS: z.enum(["true", "false"]).optional(),
});

type EnvVars = z.infer<typeof envSchema>;

/**
 * Validates environment variables at application startup
 * @throws Error if validation fails
 */
export function validateEnvironment(): EnvVars {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Environment validation failed:");
    console.error(result.error.format());
    throw new Error("Invalid environment configuration");
  }

  // Additional security checks
  if (result.data.NODE_ENV === "production") {
    // Production-specific validations
    if (result.data.ENABLE_AUTH_BYPASS === "true") {
      throw new Error("ENABLE_AUTH_BYPASS must not be enabled in production");
    }

    if (
      !result.data.DATABASE_URL.includes("sslmode=require") &&
      !result.data.DATABASE_URL.includes("ssl=true")
    ) {
      console.warn("⚠️  WARNING: Database connection should use SSL in production");
    }

    if (!result.data.NEXTAUTH_URL) {
      console.warn("⚠️  WARNING: NEXTAUTH_URL should be set in production");
    }
  }

  console.log("✅ Environment validation passed");
  return result.data;
}

/**
 * Type-safe environment variable access
 */
export const env = validateEnvironment();
