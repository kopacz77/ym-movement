// src/app/api/cron/wardrobe-return-reminders/route.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { safeCompare } from "@/lib/security";
import { sendWardrobeReturnReminders } from "@/lib/wardrobe-return-reminder-sender";

/**
 * NOTIFY-07 (Phase 20): cron endpoint for return-reminder emails.
 * Called once per day (0 4 * * * UTC = 8 PM Pacific) per vercel.json.
 *
 * Security: Protected by CRON_SECRET environment variable (mirrors
 * /api/cron/send-batch-emails).
 * Usage: POST /api/cron/wardrobe-return-reminders
 * with header: Authorization: Bearer YOUR_CRON_SECRET
 *
 * In development, GET requests also work for manual testing (no auth).
 */
export async function POST(request: NextRequest) {
  try {
    // Security: Verify cron secret (mirrors send-batch-emails auth flow).
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV !== "development") {
      if (!cronSecret) {
        console.error("[CRON] CRON_SECRET not configured");
        return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
      }

      if (!authHeader || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
        console.error("[CRON] Invalid or missing authorization");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      console.log("[CRON] Running in development mode - skipping auth check");
    }

    console.log("[CRON] Starting wardrobe return-reminder process...");

    const result = await sendWardrobeReturnReminders();

    console.log("[CRON] Wardrobe return-reminder process completed:", result);

    return NextResponse.json({
      success: result.success,
      stats: result.stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Error in wardrobe return-reminder cron job:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

// Allow GET for manual testing in development.
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "GET method only available in development" },
      { status: 403 },
    );
  }

  console.log("[CRON] Manual test trigger via GET request");
  return POST(request);
}
