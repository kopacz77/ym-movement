-- Add missing defaults for ID fields (for production compatibility)
-- Most models should auto-generate IDs but production might not have this

-- Add cuid() default function if it doesn't exist (for older PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- For models that don't have default ID generation in production,
-- we'll rely on the application code to generate IDs using cuid()
-- since PostgreSQL doesn't have a built-in cuid() function

-- The @default(cuid()) and @updatedAt work through Prisma Client,
-- not as database defaults, so no SQL changes needed

-- This migration ensures compatibility with production database
-- where Prisma Client will handle ID generation and updatedAt timestamps