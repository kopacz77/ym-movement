---
phase: 06-per-coach-google-calendar
plan: 01
subsystem: infra
tags: [aes-256-gcm, encryption, oauth2, googleapis, google-calendar, node-crypto]

# Dependency graph
requires:
  - phase: 01-auth-schema-foundation
    provides: Coach model with googleAccessToken/googleRefreshToken/googleCalendarId fields
provides:
  - AES-256-GCM encrypt/decrypt utility (src/lib/encryption.ts)
  - OAuth2Client factory and auth URL generator (src/lib/google/oauth.ts)
  - Updated env type declarations with TOKEN_ENCRYPTION_KEY
  - googleapis upgraded from v150.0.1 to v171.4.0
affects: [06-02 OAuth routes, 06-03 calendar refactor]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AES-256-GCM encryption with iv:tag:ciphertext base64 format"
    - "OAuth2Client factory pattern (per-request, not singleton)"
    - "prompt:consent forces refresh_token on every Google OAuth authorization"

key-files:
  created:
    - src/lib/encryption.ts
    - src/lib/google/oauth.ts
  modified:
    - src/types/env.d.ts
    - .env.example
    - package.json

key-decisions:
  - "googleapis upgraded from v150.0.1 to v171.4.0 (no breaking changes, clears tech debt)"
  - "GOOGLE_REFRESH_TOKEN removed from env.d.ts (unused leftover from old pattern)"
  - "Old service account vars removed from .env.example (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID, INSTRUCTOR_EMAIL)"
  - "INSTRUCTOR_EMAIL kept in env.d.ts for now (still referenced by calendar.ts, removed in Plan 03)"

patterns-established:
  - "encrypt(plaintext) returns iv:tag:ciphertext with base64 encoding"
  - "createOAuth2Client() reads GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI from env"
  - "generateAuthUrl(coachId) uses state param for CSRF/coach tracking"

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 6 Plan 01: OAuth Foundation Utilities Summary

**AES-256-GCM encryption module and OAuth2Client factory with googleapis v171 upgrade for per-coach Google Calendar integration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T04:08:26Z
- **Completed:** 2026-03-16T04:11:50Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created encryption utility with AES-256-GCM encrypt/decrypt using node:crypto (zero external dependencies)
- Created OAuth2 client factory and auth URL generator with prompt:consent for guaranteed refresh tokens
- Upgraded googleapis from v150.0.1 to v171.4.0 with zero code changes required
- Updated environment variable documentation for per-coach OAuth2 pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Create encryption utility and OAuth helper module** - `d60dc97` (feat)
2. **Task 2: Update env types, .env.example, and upgrade googleapis** - `253af0d` (chore)

## Files Created/Modified

- `src/lib/encryption.ts` - AES-256-GCM encrypt/decrypt with iv:tag:ciphertext format
- `src/lib/google/oauth.ts` - OAuth2Client factory and generateAuthUrl with prompt:consent
- `src/types/env.d.ts` - Added TOKEN_ENCRYPTION_KEY, removed GOOGLE_REFRESH_TOKEN
- `.env.example` - Replaced service account vars with OAuth2 vars
- `package.json` - googleapis upgraded to ^171.4.0

## Decisions Made

- [06-01] googleapis upgraded from v150.0.1 to v171.4.0 -- no breaking changes to OAuth2Client API, clears tech debt noted in STATE.md
- [06-01] GOOGLE_REFRESH_TOKEN removed from env.d.ts (unused leftover from old service account pattern)
- [06-01] Old service account vars removed from .env.example (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID, INSTRUCTOR_EMAIL)
- [06-01] INSTRUCTOR_EMAIL kept in env.d.ts for now (still referenced by calendar.ts, deferred removal to Plan 03)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required. TOKEN_ENCRYPTION_KEY generation will be needed when deploying, documented in .env.example.

## Next Phase Readiness

- Encryption and OAuth utilities ready for Plan 02's OAuth routes (initiation + callback)
- Plan 02 can import createOAuth2Client and generateAuthUrl directly
- Plan 03 calendar refactor can import encrypt/decrypt for token persistence
- googleapis v171 confirmed compatible with all existing calendar.ts code

---
*Phase: 06-per-coach-google-calendar*
*Completed: 2026-03-16*
