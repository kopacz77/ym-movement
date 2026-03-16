# Phase 6: Per-Coach Google Calendar - Research

**Researched:** 2026-03-15
**Domain:** Google Calendar API OAuth2, per-user token management, encrypted credential storage
**Confidence:** HIGH

## Summary

Phase 6 transitions the Google Calendar integration from a singleton service account pattern (`src/lib/google/calendar.ts` using JWT with `GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY`) to a per-coach OAuth2 flow where each coach connects their own Google Calendar. The existing `googleapis` library (v150.0.1, installed) already includes the `OAuth2Client` needed for this -- no new dependencies are required for the core flow.

The Coach model already has the required database fields: `googleCalendarId`, `googleAccessToken`, `googleRefreshToken`, `googleTokenExpiresAt` (added in Phase 1/2). The main work is: (1) building the OAuth consent redirect + callback API routes, (2) creating an encryption utility for token storage, (3) refactoring the calendar module from singleton to per-coach, and (4) updating the 6 call sites that currently use the global `googleCalendar` object.

**Primary recommendation:** Use the existing `googleapis` library's `OAuth2Client` for per-coach auth, Node.js built-in `crypto` with AES-256-GCM for token encryption, and Next.js App Router API routes for the OAuth callback. Keep the existing service account code as dead-code fallback for exactly zero time -- remove it since Yura will connect her own Google account via the new per-coach flow.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| googleapis | 150.0.1 (installed) | Google Calendar API + OAuth2Client | Already installed; includes `google.auth.OAuth2` natively. Upgrading to v171 is optional but recommended |
| node:crypto | built-in | AES-256-GCM token encryption | Zero-dependency, built into Node.js. No npm package needed |
| zod | 3.25.76 (installed) | Input validation for OAuth routes | Already used throughout the codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| google-auth-library | transitive dep | OAuth2Client class | Comes bundled with `googleapis`, no separate install needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom crypto encryption | prisma-field-encryption | prisma-field-encryption does NOT support Prisma 6.14+ (middleware removed); project uses Prisma 6.19.0. Not viable. |
| googleapis v150 | googleapis v171 | v171 is latest; v150 works fine. Upgrade is optional cleanup but no breaking changes affect this feature. |
| Custom OAuth flow | NextAuth Google provider | NextAuth is for login authentication; we need a separate link-your-calendar flow independent of login. Mixing the two would create coupling between auth and calendar features. |

### googleapis Version Decision

The project currently uses googleapis v150.0.1. The latest is v171.4.0. The OAuth2Client API has not changed between these versions -- `generateAuthUrl()`, `getToken()`, `setCredentials()`, and the `tokens` event all work identically. Upgrading is safe but not required for this phase. STATE.md notes: "consider upgrading before multi-coach work."

**Recommendation:** Upgrade to latest googleapis in the first plan of this phase to clear the tech debt. The upgrade is a simple `pnpm update googleapis` with no code changes needed.

**Confidence:** HIGH -- verified via official googleapis GitHub repository and npm.

**Installation:**
```bash
# Upgrade googleapis (optional but recommended)
pnpm update googleapis

# Generate encryption key (one-time)
openssl rand -hex 32
# Add result as TOKEN_ENCRYPTION_KEY in .env
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── google/
│   │   ├── calendar.ts          # REFACTORED: per-coach calendar operations
│   │   └── oauth.ts             # NEW: OAuth2 client factory + helpers
│   └── encryption.ts            # NEW: AES-256-GCM encrypt/decrypt utility
├── app/
│   └── api/
│       └── auth/
│           └── google-calendar/
│               ├── route.ts     # NEW: GET -> generates OAuth URL + redirects
│               └── callback/
│                   └── route.ts # NEW: GET -> exchanges code for tokens, stores encrypted
├── features/
│   └── coach/
│       ├── api/queries/
│       │   └── profileQueries.ts   # UPDATED: add calendar connection status + disconnect mutation
│       └── components/profile/
│           └── GoogleCalendarConnect.tsx  # NEW: connect/disconnect UI card
```

### Pattern 1: Per-Coach OAuth2Client Factory
**What:** Create an OAuth2Client per request using the coach's stored (decrypted) tokens, rather than a global singleton.
**When to use:** Every time a calendar operation is needed for a specific coach.
**Example:**
```typescript
// src/lib/google/oauth.ts
import { google } from "googleapis";
import { decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

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
    prompt: "consent",  // CRITICAL: forces refresh_token on every auth
    state: coachId,     // Track which coach is connecting
  });
}

export function getCoachCalendarClient(coach: {
  id: string;
  googleAccessToken: string;    // encrypted
  googleRefreshToken: string;   // encrypted
  googleTokenExpiresAt: Date | null;
  googleCalendarId: string | null;
}) {
  const oauth2Client = createOAuth2Client();

  oauth2Client.setCredentials({
    access_token: decrypt(coach.googleAccessToken),
    refresh_token: decrypt(coach.googleRefreshToken),
    expiry_date: coach.googleTokenExpiresAt?.getTime(),
  });

  // Auto-persist refreshed tokens
  oauth2Client.on("tokens", async (tokens) => {
    const updateData: Record<string, unknown> = {};
    if (tokens.access_token) {
      updateData.googleAccessToken = encrypt(tokens.access_token);
    }
    if (tokens.expiry_date) {
      updateData.googleTokenExpiresAt = new Date(tokens.expiry_date);
    }
    if (tokens.refresh_token) {
      updateData.googleRefreshToken = encrypt(tokens.refresh_token);
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.coach.update({
        where: { id: coach.id },
        data: updateData,
      });
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}
```

### Pattern 2: Graceful Degradation at Call Sites
**What:** When a lesson is created/updated/deleted, check if the coach has calendar tokens. If yes, use per-coach calendar. If no, skip calendar operations (return null for eventId).
**When to use:** Every call site currently using `googleCalendar.createEvent/updateEvent/deleteEvent`.
**Example:**
```typescript
// In bookingQueries.ts or lessonQueries.ts
import { getCoachCalendar } from "@/lib/google/calendar";

// Replace:  const eventId = await googleCalendar.createEvent({...});
// With:
const coach = timeSlot.coachId
  ? await ctx.prisma.coach.findUnique({ where: { id: timeSlot.coachId } })
  : null;

const eventId = coach
  ? await getCoachCalendar(coach).createEvent({...})
  : null;  // No coach or no calendar connected -- graceful skip
```

### Pattern 3: OAuth Callback Route (App Router)
**What:** A Next.js App Router GET route that handles the OAuth callback from Google.
**When to use:** The single callback endpoint for all coaches.
**Example:**
```typescript
// src/app/api/auth/google-calendar/callback/route.ts
import { NextResponse } from "next/server";
import { createOAuth2Client } from "@/lib/google/oauth";
import { encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // coachId
  const error = url.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL("/coach/profile?calendar=error", req.url),
    );
  }

  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  // Detect primary calendar ID (usually "primary" or the user's email)
  oauth2Client.setCredentials(tokens);
  const calendarApi = google.calendar({ version: "v3", auth: oauth2Client });
  const calendarList = await calendarApi.calendarList.get({ calendarId: "primary" });
  const calendarId = calendarList.data.id || "primary";

  await prisma.coach.update({
    where: { id: state },
    data: {
      googleAccessToken: encrypt(tokens.access_token!),
      googleRefreshToken: encrypt(tokens.refresh_token!),
      googleTokenExpiresAt: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null,
      googleCalendarId: calendarId,
    },
  });

  return NextResponse.redirect(
    new URL("/coach/profile?calendar=connected", req.url),
  );
}
```

### Anti-Patterns to Avoid
- **Mixing login OAuth with calendar OAuth:** The app uses CredentialsProvider for login. Do NOT add Google as a NextAuth provider for calendar linking -- it would conflate authentication with authorization. Use a separate OAuth flow.
- **Storing tokens unencrypted:** The Coach model fields store tokens as plain strings in the database. All values MUST be encrypted before writing and decrypted before use.
- **Creating OAuth2Client at module scope:** Each request needs its own client instance with the specific coach's tokens. A module-level singleton would mix credentials between coaches.
- **Ignoring the `tokens` event:** The googleapis library emits a `tokens` event when it refreshes an access token. If you don't listen for this and persist the new tokens, the next request will use the expired old token and fail.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth2 authorization URL generation | Manual URL string concatenation | `oauth2Client.generateAuthUrl()` | Handles encoding, scopes, state parameter correctly |
| Token exchange (code -> tokens) | Manual POST to Google's token endpoint | `oauth2Client.getToken(code)` | Handles error cases, parses response, validates tokens |
| Access token refresh | Manual refresh token POST + retry logic | `oauth2Client.setCredentials()` + `tokens` event | The googleapis library auto-refreshes expired tokens transparently |
| Symmetric encryption | Custom XOR/Base64 | `node:crypto` AES-256-GCM | Authenticated encryption prevents tampering; standard algorithm |
| CSRF protection for OAuth | Custom token generation | OAuth `state` parameter with coachId | Google passes state back unchanged; verify it matches the initiating coach |

**Key insight:** The `googleapis` library handles the hardest parts of OAuth2 (URL generation, token exchange, automatic refresh). The custom code needed is only: (1) persistence of tokens to database, (2) encryption/decryption wrapper, and (3) the two API route handlers.

## Common Pitfalls

### Pitfall 1: Refresh Token Not Returned on Subsequent Authorizations
**What goes wrong:** Google only returns a `refresh_token` on the FIRST authorization. If a coach re-connects (e.g., after revoking and reconnecting), no refresh_token is included in the response.
**Why it happens:** Google's OAuth2 design intentionally only issues refresh tokens once per client/user pair.
**How to avoid:** Always use `prompt: "consent"` in `generateAuthUrl()`. This forces Google to show the consent screen every time AND return a new refresh_token.
**Warning signs:** `tokens.refresh_token` is undefined after the first successful connection.

### Pitfall 2: 7-Day Token Expiry in Testing Mode
**What goes wrong:** If the Google Cloud project's OAuth consent screen is in "Testing" mode (not "In production"), ALL refresh tokens expire after 7 days. Coaches would need to re-connect weekly.
**Why it happens:** Google enforces this limit for apps in testing status to encourage moving to production.
**How to avoid:** Set the OAuth consent screen publishing status to "In production" in Google Cloud Console. For apps with non-sensitive scopes (calendar is classified as "sensitive"), this triggers a verification review. However, unverified apps can still be used -- Google shows an "unverified app" warning that users can click through. For a small coaching business with known coaches, this is acceptable (as noted in STATE.md).
**Warning signs:** Coaches report "Token has been expired or revoked" errors exactly 7 days after connecting.

### Pitfall 3: Missing CSRF Validation on Callback
**What goes wrong:** Without validating the `state` parameter, an attacker could craft a callback URL that links their Google account to another coach's profile.
**Why it happens:** The OAuth callback is a GET request that anyone can construct.
**How to avoid:** Validate that the `state` parameter (coachId) matches the currently authenticated user's coach ID. The callback route MUST verify the session and ensure the coachId in state belongs to the logged-in user.
**Warning signs:** Any coach can connect a calendar to any other coach's profile.

### Pitfall 4: Encryption Key Rotation / Missing Key
**What goes wrong:** If `TOKEN_ENCRYPTION_KEY` is not set or changes, all stored tokens become unreadable. Decryption throws authentication errors.
**Why it happens:** The AES-256-GCM auth tag validation fails when the wrong key is used.
**How to avoid:** (1) Make `TOKEN_ENCRYPTION_KEY` a required env var with startup validation. (2) Never rotate the key without a migration plan to re-encrypt all tokens. (3) Add the env var to `.env.example`.
**Warning signs:** All calendar operations fail simultaneously after a deployment.

### Pitfall 5: INSTRUCTOR_EMAIL Hardcoded in Calendar Events
**What goes wrong:** The current code adds `process.env.INSTRUCTOR_EMAIL || "yuraxmin@gmail.com"` as an attendee to every calendar event. With per-coach calendars, this is wrong -- the event already appears on the coach's calendar, and Yura shouldn't be an attendee on other coaches' events.
**Why it happens:** Leftover from the single-admin model where the admin needed to see events.
**How to avoid:** Remove the INSTRUCTOR_EMAIL attendee logic. The event is inserted into the coach's own calendar via their OAuth credentials, so the coach is inherently the organizer. Only include the student as an attendee.
**Warning signs:** Yura receives Google Calendar notifications for every lesson across all coaches.

### Pitfall 6: Service Account Removal Timing
**What goes wrong:** Removing the service account code before Yura connects her personal Google account via the new OAuth flow leaves a window where no calendar integration works.
**Why it happens:** The old service account authenticates as a Google Cloud service account, not as Yura's personal Google account.
**How to avoid:** Deploy the per-coach OAuth feature. Have Yura connect her Google account. THEN remove the old service account code and env vars in a follow-up cleanup. Alternatively, treat the old code as dead code immediately and have Yura connect during the same session.
**Warning signs:** Calendar events stop appearing for Yura's lessons during the transition.

## Code Examples

### AES-256-GCM Encryption Utility
```typescript
// src/lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY environment variable is not set");
  }
  return Buffer.from(key, "hex");
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:ciphertext (all base64-encoded)
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decrypt(ciphertext: string): string {
  const [ivB64, tagB64, encB64] = ciphertext.split(":");
  if (!ivB64 || !tagB64 || !encB64) {
    throw new Error("Invalid encrypted token format");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
```
**Source:** Node.js crypto documentation (built-in module), verified against community best practices for AES-256-GCM.

### OAuth Initiation Route
```typescript
// src/app/api/auth/google-calendar/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAuthUrl } from "@/lib/google/oauth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Look up the coach record for this user
  const coach = await prisma.coach.findUnique({
    where: { userId: session.user.id },
  });

  if (!coach) {
    return NextResponse.json({ error: "Coach profile not found" }, { status: 403 });
  }

  const url = generateAuthUrl(coach.id);
  return NextResponse.redirect(url);
}
```

### Refactored Calendar Module (Per-Coach)
```typescript
// src/lib/google/calendar.ts (refactored)
import { google } from "googleapis";
import { decrypt, encrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

type CoachWithTokens = {
  id: string;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleTokenExpiresAt: Date | null;
  googleCalendarId: string | null;
};

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

function getCoachCalendarApi(coach: CoachWithTokens) {
  if (!coach.googleAccessToken || !coach.googleRefreshToken) {
    return null;
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: decrypt(coach.googleAccessToken),
    refresh_token: decrypt(coach.googleRefreshToken),
    expiry_date: coach.googleTokenExpiresAt?.getTime(),
  });

  // Persist refreshed tokens automatically
  oauth2Client.on("tokens", async (tokens) => {
    const data: Record<string, unknown> = {};
    if (tokens.access_token) {
      data.googleAccessToken = encrypt(tokens.access_token);
    }
    if (tokens.expiry_date) {
      data.googleTokenExpiresAt = new Date(tokens.expiry_date);
    }
    if (tokens.refresh_token) {
      data.googleRefreshToken = encrypt(tokens.refresh_token);
    }
    if (Object.keys(data).length > 0) {
      await prisma.coach.update({ where: { id: coach.id }, data });
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export const googleCalendar = {
  createEvent: async (
    coach: CoachWithTokens,
    params: { summary: string; description?: string; startTime: Date; endTime: Date;
              attendees?: Array<{ email: string; name?: string }>; location?: string;
              timeZone: string; }
  ): Promise<string | null> => {
    const calendar = getCoachCalendarApi(coach);
    if (!calendar) {
      console.warn(`[CALENDAR] Coach ${coach.id} has no calendar connected, skipping`);
      return null;
    }

    const response = await calendar.events.insert({
      calendarId: coach.googleCalendarId || "primary",
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.startTime.toISOString(), timeZone: params.timeZone },
        end: { dateTime: params.endTime.toISOString(), timeZone: params.timeZone },
        attendees: params.attendees?.map(a => ({
          email: a.email, displayName: a.name, responseStatus: "needsAction",
        })),
        location: params.location,
        reminders: { useDefault: false, overrides: [
          { method: "email", minutes: 60 }, { method: "popup", minutes: 30 },
        ]},
      },
      sendUpdates: "all",
    });

    return response.data.id || null;
  },

  // deleteEvent and updateEvent follow the same pattern -- coach as first param
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Service account JWT (single admin) | Per-user OAuth2 with refresh tokens | This phase | Each coach owns their own calendar events |
| Unencrypted tokens in DB | AES-256-GCM encrypted tokens | This phase | Tokens at rest are protected |
| `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY` | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + `GOOGLE_REDIRECT_URI` | This phase | Different env vars for OAuth vs service account |
| `INSTRUCTOR_EMAIL` as attendee | Coach is the calendar owner (organizer) | This phase | No need for explicit attendee for the coach |
| Global `googleCalendar` singleton | `googleCalendar.createEvent(coach, ...)` with coach param | This phase | All 6 call sites updated |

**Deprecated/outdated after this phase:**
- `GOOGLE_CLIENT_EMAIL` env var -- no longer needed (service account removed)
- `GOOGLE_PRIVATE_KEY` env var -- no longer needed
- `GOOGLE_CALENDAR_ID` env var -- replaced by per-coach `googleCalendarId` in DB
- `INSTRUCTOR_EMAIL` env var -- no longer used for calendar attendees
- `google-auth-library` JWT import in `calendar.ts` -- replaced by OAuth2Client

## Call Sites to Update

All locations that currently import and use the global `googleCalendar`:

| File | Operation | Lines | Notes |
|------|-----------|-------|-------|
| `src/features/student/api/queries/bookingQueries.ts` | createEvent | ~190-220 | Student booking flow; needs coach lookup |
| `src/features/student/api/queries/bookingQueries.ts` | deleteEvent | ~493-499 | Student cancellation flow |
| `src/features/admin/api/queries/schedule/lessonQueries.ts` | createEvent | ~81-100 | Admin lesson creation |
| `src/features/admin/api/queries/schedule/lessonQueries.ts` | deleteEvent | ~165-180 | Admin lesson cancellation |
| `src/features/admin/api/queries/schedule/lessonQueries.ts` | createEvent | ~381-399 | Admin assign student to time slot |
| `src/features/admin/api/queries/schedule/lessonQueries.ts` | updateEvent | ~519-538 | Admin update lesson type |
| `src/features/admin/api/queries/schedule/lessonQueries.ts` | deleteEvent | ~648-650 | Admin unassign student |

**Total:** 7 call sites across 2 files.

**Pattern for each:** All call sites already have access to `timeSlot.coachId` or `lesson.coachId`. Add a coach lookup (with token fields), then pass the coach object as the first argument to the refactored calendar functions. Wrap in try/catch for graceful degradation.

## Environment Variables

### New Variables Required
| Variable | Format | Purpose | Example |
|----------|--------|---------|---------|
| `GOOGLE_CLIENT_ID` | string | OAuth2 client ID from Google Cloud Console | `123456789.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | string | OAuth2 client secret | `GOCSPX-xxxxx` |
| `GOOGLE_REDIRECT_URI` | URL | OAuth callback URL | `http://localhost:3100/api/auth/google-calendar/callback` |
| `TOKEN_ENCRYPTION_KEY` | 64-char hex | AES-256 encryption key (32 bytes) | `openssl rand -hex 32` output |

### Variables to Remove (after migration)
| Variable | Reason |
|----------|--------|
| `GOOGLE_CLIENT_EMAIL` | Service account no longer used |
| `GOOGLE_PRIVATE_KEY` | Service account no longer used |
| `GOOGLE_CALENDAR_ID` | Per-coach `googleCalendarId` replaces this |
| `INSTRUCTOR_EMAIL` | Coach is inherently the calendar owner |

### Google Cloud Console Setup Required
1. Create OAuth 2.0 Client ID (Web Application type) in Google Cloud Console
2. Add authorized redirect URI: `http://localhost:3100/api/auth/google-calendar/callback` (dev) and production URL
3. Set OAuth consent screen to "External" with "In production" publishing status
4. Add scope: `https://www.googleapis.com/auth/calendar`
5. Note: Unverified app warning will appear for coaches -- acceptable per STATE.md decision

## Open Questions

1. **Service account removal timing**
   - What we know: The old service account code needs to be replaced. Yura needs to connect her Google account via the new flow.
   - What's unclear: Whether to remove the old code and env vars immediately or keep a transitional fallback.
   - Recommendation: Remove the old service account code entirely in this phase. The new OAuth flow should be deployed and Yura should connect her account in the same session. There is no benefit to maintaining two parallel calendar systems -- the old service account pattern only works for Yura and adds confusion. The planner should sequence: (1) build new OAuth flow, (2) refactor calendar module, (3) update call sites, (4) remove old code + env vars. Yura connects before the next lesson is booked.

2. **googleapis upgrade**
   - What we know: Current v150.0.1, latest v171.4.0. No breaking changes to OAuth2Client API.
   - What's unclear: Whether any non-OAuth API surfaces changed.
   - Recommendation: Upgrade in the first plan as a simple `pnpm update googleapis`. No code changes expected. If build fails, pin at v150.

3. **Coach settings page vs. profile page**
   - What we know: The coach profile page (`/coach/profile`) exists with `CoachProfileForm`. The Google Calendar connect card could go there or on a new `/coach/settings` page.
   - What's unclear: Whether the user wants a separate settings page.
   - Recommendation: Add the Google Calendar connection card directly to the existing profile page (`/coach/profile`). It's a natural extension of the coach's account management. A separate settings page adds unnecessary navigation.

## Sources

### Primary (HIGH confidence)
- [Google OAuth2 Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server) -- OAuth flow, token exchange, refresh token behavior
- [googleapis Node.js client](https://github.com/googleapis/google-api-nodejs-client) -- OAuth2Client API, generateAuthUrl, getToken, setCredentials, tokens event
- [Node.js Crypto module](https://nodejs.org/api/crypto.html) -- AES-256-GCM createCipheriv/createDecipheriv
- `.planning/research/STACK.md` (internal) -- Prior research on per-coach OAuth pattern, encryption approach, prisma-field-encryption incompatibility
- `.planning/research/ARCHITECTURE.md` (internal) -- Prior research on OAuth flow architecture, env vars, anti-patterns

### Secondary (MEDIUM confidence)
- [Google OAuth Consent Screen Configuration](https://developers.google.com/workspace/guides/configure-oauth-consent) -- Internal vs external, scope verification, testing mode
- [Google OAuth Sensitive Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification) -- Calendar scope classified as sensitive
- [npm googleapis](https://www.npmjs.com/package/googleapis) -- Version v171.4.0 latest confirmed

### Tertiary (LOW confidence)
- [Google Manage App Audience](https://support.google.com/cloud/answer/15549945) -- 7-day token expiry in testing mode
- [Nango Blog on Google OAuth invalid_grant](https://nango.dev/blog/google-oauth-invalid-grant-token-has-been-expired-or-revoked) -- Refresh token failure modes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- googleapis already installed, Node.js crypto is built-in, prior research validated the approach
- Architecture: HIGH -- prior research in STACK.md and ARCHITECTURE.md already designed this pattern; Coach model fields exist
- Pitfalls: HIGH -- well-documented Google OAuth gotchas verified with official docs
- Call site inventory: HIGH -- grep-verified all 7 call sites across 2 files

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable domain; googleapis API unlikely to change)
