// Debug endpoint to test email - REMOVE AFTER TESTING
import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  try {
    console.log("🧪 Debug email test endpoint called");
    console.log("📧 RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
    console.log("📧 RESEND_API_KEY length:", process.env.RESEND_API_KEY?.length || 0);
    
    const result = await sendWelcomeEmail("alexanderjkopacz@gmail.com", "Debug Test");
    
    return NextResponse.json({
      success: true,
      result,
      hasApiKey: !!process.env.RESEND_API_KEY,
      apiKeyLength: process.env.RESEND_API_KEY?.length || 0
    });
  } catch (error) {
    console.error("❌ Debug email error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      hasApiKey: !!process.env.RESEND_API_KEY,
      apiKeyLength: process.env.RESEND_API_KEY?.length || 0
    }, { status: 500 });
  }
}