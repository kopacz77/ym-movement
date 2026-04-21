import { google } from "googleapis";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { createOAuth2Client } from "@/lib/google/oauth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // coachId
  const error = url.searchParams.get("error");

  // If error or missing code/state, redirect with error
  if (error || !code || !state) {
    return NextResponse.redirect(new URL("/coach/profile?calendar=error", req.url));
  }

  // CSRF validation: verify logged-in user's Coach record id matches state
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/coach/profile?calendar=error", req.url));
  }

  const coach = await prisma.coach.findUnique({
    where: { userId: session.user.id },
  });

  if (!coach || coach.id !== state) {
    return NextResponse.redirect(new URL("/coach/profile?calendar=error", req.url));
  }

  try {
    // Exchange authorization code for tokens
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // Get the coach's primary calendar ID
    oauth2Client.setCredentials(tokens);
    const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });
    const calendarList = await calendarApi.calendars.get({ calendarId: "primary" });
    const calendarId = calendarList.data.id || "primary";

    // Store encrypted tokens on Coach record
    await prisma.coach.update({
      where: { id: state },
      data: {
        googleAccessToken: encrypt(tokens.access_token!),
        googleRefreshToken: encrypt(tokens.refresh_token!),
        googleTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleCalendarId: calendarId,
      },
    });

    return NextResponse.redirect(new URL("/coach/profile?calendar=connected", req.url));
  } catch (err) {
    console.error("[CALENDAR] OAuth callback error:", err);
    return NextResponse.redirect(new URL("/coach/profile?calendar=error", req.url));
  }
}
