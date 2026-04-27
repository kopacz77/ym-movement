import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function generateAuthUrl(coachId: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // CRITICAL: forces refresh_token on every auth (see Research Pitfall 1)
    state: coachId, // Track which coach is connecting
  });
}
