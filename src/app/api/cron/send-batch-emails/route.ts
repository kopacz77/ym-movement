// src/app/api/cron/send-batch-emails/route.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sendBatchEmailNotifications } from "@/lib/batch-email-sender";
import { safeCompare } from "@/lib/security";

/**
 * API endpoint for sending batch email notifications
 * This should be called once per day (e.g., at 8 PM) via a cron job
 *
 * Security: Protected by CRON_SECRET environment variable
 * Usage: Set up a cron job to call: POST /api/cron/send-batch-emails
 * with header: Authorization: Bearer YOUR_CRON_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    // Security: Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // In development, allow without secret for testing
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

    console.log("[CRON] Starting batch email sending process...");

    // Run the batch email process
    const result = await sendBatchEmailNotifications();

    console.log("[CRON] Batch email process completed:", result);

    return NextResponse.json({
      success: result.success,
      stats: result.stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Error in batch email cron job:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

// Allow GET for manual testing in development
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
