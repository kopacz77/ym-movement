# Technology Stack: Multi-Coach Marketplace Extension

**Project:** Yura Scheduler v3 -- Multi-Coach Milestone
**Researched:** 2026-03-14
**Mode:** Ecosystem (extending existing stack)

## Current Stack (Unchanged)

These technologies remain as-is. No changes needed.

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | App framework |
| React | 19.2.3 | UI library |
| TypeScript | 5.9.3 | Type safety |
| TRPC | 11.8.1 | Type-safe API layer |
| Prisma | 6.19.0 | ORM |
| PostgreSQL (Neon) | -- | Database |
| NextAuth.js | 4.24.13 | Authentication |
| Tailwind CSS | 3.4.18 | Styling |
| Radix UI | various | Component primitives |
| Zod | 3.25.76 | Schema validation |
| googleapis | 150.0.1 | Google Calendar API |
| Resend | 4.8.0 | Email |
| date-fns | 4.1.0 | Date utilities |
| Sonner | 2.0.7 | Toast notifications |
| Recharts | 2.15.4 | Charts/analytics |

---

## Stack Changes Required

### 1. Authentication Layer: Stay on NextAuth.js v4 (No Change)

**Recommendation:** Keep `next-auth@4.24.13`. Do NOT migrate to Auth.js v5 or Better Auth during this milestone.
**Confidence:** HIGH

**Rationale:**
- NextAuth v4 is the current installed version and is stable with the existing credentials-based auth flow.
- Auth.js v5 was in beta until recently, and the Auth.js project was absorbed by Better Auth in September 2025. The ecosystem is in flux. Migrating now introduces risk with zero benefit for this milestone.
- The existing JWT strategy, callbacks, and middleware all work. The multi-coach extension requires adding roles and OAuth linking -- both achievable within NextAuth v4.
- Better Auth is the long-term successor, but it lacks enterprise SSO features and would require a full auth system rewrite. Consider this for a future milestone, not this one.

**What DOES change in auth:**
- Role enum expansion: `SUPER_ADMIN` added to Prisma `Role` enum
- TRPC middleware: New `coachProcedure` and `superAdminProcedure` added
- Next.js middleware: Updated role validation to include `COACH` and `SUPER_ADMIN`
- JWT token: `role` field already present, no structural changes needed

**Sources:**
- [NextAuth.js v4 documentation](https://next-auth.js.org)
- [Auth.js migration guide](https://authjs.dev/getting-started/migrating-to-v5)
- [Auth.js joins Better Auth discussion](https://github.com/nextauthjs/next-auth/discussions/13252)

---

### 2. Per-Coach Google OAuth: NextAuth Account Model + googleapis OAuth2Client

**Recommendation:** Add the NextAuth `Account` model to Prisma schema, use `googleapis` OAuth2Client (already installed) for per-user calendar access.
**Confidence:** HIGH

**What exists today:**
The current implementation uses a **service account** with a hardcoded `GOOGLE_CALENDAR_ID` environment variable (see `src/lib/google/calendar.ts`). This writes all events to a single Google Calendar (`yuraxmin@gmail.com`). This fundamentally cannot work for multiple coaches because each coach has their own Google Calendar.

**What changes:**

#### a) Add NextAuth Account Model to Prisma

The PrismaAdapter's `Account` model stores OAuth tokens per user. This is the standard NextAuth pattern for OAuth token persistence.

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  User User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}
```

**Why this approach:**
- NextAuth's `PrismaAdapter` (already installed at `@next-auth/prisma-adapter@1.0.7`) natively manages this model.
- A single user can have multiple `Account` entries -- one per OAuth provider. This is exactly the "link Google account to existing credential user" pattern we need.
- The `refresh_token` and `access_token` fields store the Google OAuth tokens we need for Calendar API access.

**Source:** [Auth.js Prisma Adapter schema](https://authjs.dev/getting-started/adapters/prisma) -- HIGH confidence, official documentation.

#### b) OAuth2Client Per-Coach Calendar Access

Replace the service account JWT pattern with per-user OAuth2Client:

```typescript
// New pattern: per-coach OAuth2 client
import { google } from "googleapis";

function getCoachCalendarClient(coachAccount: Account) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: coachAccount.access_token,
    refresh_token: coachAccount.refresh_token,
    expiry_date: coachAccount.expires_at ? coachAccount.expires_at * 1000 : undefined,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}
```

**Key design decisions:**
- The `googleapis` package (already installed at v150.0.1) includes OAuth2Client natively. No new dependency needed.
- Each coach links their Google account through a dedicated OAuth flow (separate from login). The resulting `refresh_token` and `access_token` are stored in the `Account` table.
- Token refresh is handled automatically by the `googleapis` library when `refresh_token` is set -- it will acquire new access tokens transparently.
- Google only provides a `refresh_token` on the **first** authorization. Use `access_type: 'offline'` and `prompt: 'consent'` in the OAuth URL to ensure we always get one.

**Source:** [googleapis Node.js client](https://github.com/googleapis/google-api-nodejs-client) -- HIGH confidence, official Google library.

#### c) Token Encryption at Rest

**Recommendation:** Use Node.js built-in `crypto` module with AES-256-GCM. Do NOT add `prisma-field-encryption`.
**Confidence:** HIGH

**Rationale against prisma-field-encryption:**
- The package only supports Prisma up to v6.13.0 (middleware support was removed in Prisma 6.14.0). The project uses Prisma 6.19.0. **It will not work.**
- The package is maintained by a single developer and has compatibility issues with newer Prisma versions.

**Recommended approach -- custom encryption utility:**

```typescript
// src/lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, "hex"); // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:ciphertext (all base64)
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decrypt(ciphertext: string): string {
  const [ivB64, tagB64, encB64] = ciphertext.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
```

**Why this is sufficient:**
- Zero dependencies -- uses Node.js built-in `crypto` module.
- AES-256-GCM provides both encryption and integrity verification (authenticated encryption).
- Applied as a utility wrapper around Account token read/write operations, not as middleware.
- Encryption key stored as environment variable (`TOKEN_ENCRYPTION_KEY`), generated once with `openssl rand -hex 32`.

**Source:** [Node.js Crypto documentation](https://nodejs.org/api/crypto.html) -- HIGH confidence, official Node.js docs.

---

### 3. RBAC: Custom TRPC Middleware (No New Libraries)

**Recommendation:** Extend existing TRPC middleware pattern. Do NOT add CASL, trpc-shield, or other RBAC libraries.
**Confidence:** HIGH

**Rationale against external RBAC libraries:**
- `trpc-shield@0.4.4` was last published over a year ago. Compatibility with TRPC v11 is uncertain despite claims.
- `@casl/ability@6.8.0` is a solid library but overkill for this use case. We have 4 roles, not 40. The complexity of CASL's subject/attribute-based authorization is unnecessary.
- The existing pattern in `src/lib/trpc.ts` (lines 90-130) already demonstrates the exact middleware pattern we need. We just need more of them.

**What to add:**

```typescript
// In src/lib/trpc.ts -- extend existing patterns

// Coach-only middleware
const isCoach = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.session.user.role !== "COACH") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Coach access required" });
  }
  return next({ ctx: { ...ctx, session: { ...ctx.session, user: ctx.session.user } } });
});

// Coach OR Admin (for shared operations like viewing schedules)
const isCoachOrAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (!["COACH", "ADMIN"].includes(ctx.session.user.role as string)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Coach or Admin access required" });
  }
  return next({ ctx: { ...ctx, session: { ...ctx.session, user: ctx.session.user } } });
});

// Super Admin only
const isSuperAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.session.user.role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Super Admin access required" });
  }
  return next({ ctx: { ...ctx, session: { ...ctx.session, user: ctx.session.user } } });
});

export const coachProcedure = t.procedure.use(isCoach);
export const coachOrAdminProcedure = t.procedure.use(isCoachOrAdmin);
export const superAdminProcedure = t.procedure.use(isSuperAdmin);
```

**Role hierarchy:**

| Role | Access Scope |
|------|-------------|
| `SUPER_ADMIN` | Everything. Platform-wide management, all coaches, all students, revenue reports |
| `ADMIN` | Backward-compatible. Same as current ADMIN (becomes first coach effectively) |
| `COACH` | Own students, own schedule, own calendar, own payments |
| `STUDENT` | Own bookings, own profile |

**Migration note:** The existing `ADMIN` role becomes equivalent to a coach who was the original platform owner. When `SUPER_ADMIN` is introduced, the current admin user gets promoted to `SUPER_ADMIN`. All existing `adminProcedure` endpoints continue to work unchanged because `ADMIN` and `COACH` share the same data-access pattern (just scoped to their own data).

**Source:** [TRPC Middleware documentation](https://trpc.io/docs/server/middlewares) -- HIGH confidence.

---

### 4. Data Scoping: Prisma Client Extensions (Not RLS)

**Recommendation:** Use Prisma Client Extensions for automatic `coachId` filtering. Do NOT use PostgreSQL Row Level Security.
**Confidence:** MEDIUM

**Rationale against RLS:**
- RLS requires raw SQL policies that bypass Prisma's type safety.
- Recent PostgreSQL CVEs (CVE-2024-10976, CVE-2025-8713) have shown RLS is not a complete security solution -- it is a "safety net, not a fortress wall."
- RLS requires setting `app.current_user` via `SET LOCAL` in every transaction, adding complexity and potential for leaks between concurrent requests on Neon's serverless architecture.
- The codebase is 100% Prisma -- introducing raw SQL policies creates a maintenance burden.

**Recommended approach -- Prisma Client Extensions:**

```typescript
// src/lib/prisma-scoped.ts
import { prisma } from "@/lib/prisma";

export function scopedPrisma(coachId: string) {
  return prisma.$extends({
    query: {
      lesson: {
        async findMany({ args, query }) {
          args.where = { ...args.where, coachId };
          return query(args);
        },
        // ... same for findFirst, findUnique, create, update, delete
      },
      rinkTimeSlot: {
        async findMany({ args, query }) {
          args.where = { ...args.where, coachId };
          return query(args);
        },
      },
      student: {
        async findMany({ args, query }) {
          // Students scoped through coach-student relationship
          args.where = { ...args.where, coaches: { some: { coachId } } };
          return query(args);
        },
      },
      payment: {
        async findMany({ args, query }) {
          args.where = { ...args.where, coachId };
          return query(args);
        },
      },
    },
  });
}
```

**Key benefit:** Extended clients share the same connection pool with the base Prisma client. No additional database connections. No performance overhead.

**Where to inject:** In TRPC context creation, resolve the coach's ID from the session and attach a scoped client:

```typescript
export const createTRPCContext = async (opts) => {
  const session = await getServerSession(authOptions);
  const coachId = session?.user?.role === "COACH" ? session.user.coachId : undefined;

  return {
    prisma: coachId ? scopedPrisma(coachId) : prisma, // scoped for coaches, unscoped for super_admin
    session,
  };
};
```

**Source:** [Prisma Client Extensions documentation](https://www.prisma.io/docs/orm/prisma-client/client-extensions) -- HIGH confidence, official docs.
**Source:** [RLS security concerns (2025-2026)](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c) -- MEDIUM confidence.

---

### 5. Revenue Tracking: Custom Prisma Models (No External Libraries)

**Recommendation:** Add `RevenueEntry` and `RevenueSplit` models to Prisma schema. No external accounting libraries needed.
**Confidence:** HIGH

**Rationale:**
- This is manual payment verification (Venmo/Zelle/Cash), not automated payment processing. There is no Stripe integration. There is no need for double-entry accounting libraries or embedded fintech solutions.
- The existing `Payment` model tracks lesson payments. We extend it with a `coachId` and add a `RevenueSplit` model for platform-coach revenue allocation.
- Revenue tracking is essentially a reporting feature, not a transactional accounting system.

**New models:**

```prisma
model Coach {
  id                  String        @id @default(cuid())
  userId              String        @unique
  bio                 String?
  specialties         String[]
  venmoHandle         String?
  zelleContact        String?
  defaultSplitPercent Float         @default(70)  // Coach gets 70% by default
  isActive            Boolean       @default(true)
  googleCalendarId    String?       // Their primary Google Calendar ID
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
  User                User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  Lesson              Lesson[]
  RinkTimeSlot        RinkTimeSlot[]
  Payment             Payment[]
  DefaultPricing      CoachDefaultPricing?
  CoachStudent        CoachStudent[]

  @@index([userId])
  @@index([isActive])
}

model CoachStudent {
  id        String   @id @default(cuid())
  coachId   String
  studentId String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  Coach     Coach    @relation(fields: [coachId], references: [id], onDelete: Cascade)
  Student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([coachId, studentId])
  @@index([coachId])
  @@index([studentId])
}

model CoachDefaultPricing {
  id                 String   @id @default(cuid())
  coachId            String   @unique
  privateLessonPrice Float    @default(75)
  groupLessonPrice   Float    @default(45)
  choreographyPrice  Float    @default(90)
  competitionPrice   Float    @default(95)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  Coach              Coach    @relation(fields: [coachId], references: [id], onDelete: Cascade)
}
```

**Revenue tracking additions to existing Payment model:**

```prisma
model Payment {
  // ... existing fields ...
  coachId        String?       // NEW: which coach earned this
  platformFee    Float?        // NEW: platform's cut (e.g., 30%)
  coachEarnings  Float?        // NEW: coach's cut (e.g., 70%)
  Coach          Coach?        @relation(fields: [coachId], references: [id])

  @@index([coachId])            // NEW
  @@index([coachId, status])    // NEW
}
```

**Why NOT double-entry accounting:**
- Double-entry is for financial institutions that need to reconcile accounts, handle refunds, chargebacks, and multi-currency transactions.
- This platform has manual payment verification: a coach teaches a lesson, the student pays via Venmo/Zelle/Cash, someone marks it as paid. The split is calculated at verification time and stored as two simple fields.
- Over-engineering the accounting system adds complexity with zero benefit for this use case.

---

### 6. Next.js Middleware: Extend Role Routing

**Recommendation:** Extend existing `middleware.ts` to handle `COACH` and `SUPER_ADMIN` roles.
**Confidence:** HIGH

**Current state:** The middleware at `middleware.ts` (lines 74-93) explicitly validates roles against `["ADMIN", "STUDENT"]` and handles routing for `/admin` and `/student` paths.

**Changes needed:**

```typescript
// Updated role validation
if (!["ADMIN", "COACH", "STUDENT", "SUPER_ADMIN"].includes(role)) {
  console.error(`Invalid role detected: ${role}`);
  return NextResponse.redirect(new URL("/auth/login", request.url));
}

// Coach routes
if (path.startsWith("/coach") && !["COACH", "ADMIN"].includes(role)) {
  // Redirect non-coaches away from coach routes
  // ADMIN can access coach routes (backward compat -- ADMIN becomes first coach)
}

// Super Admin routes
if (path.startsWith("/super-admin") && role !== "SUPER_ADMIN") {
  // Only SUPER_ADMIN can access platform management
}

// ADMIN backwards compatibility: ADMIN can access /admin/* routes (unchanged)
// COACH accesses /coach/* routes (new)
// SUPER_ADMIN accesses /super-admin/* AND /admin/* routes (superset)
```

**New route matchers:**

```typescript
export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/coach/:path*",        // NEW
    "/super-admin/:path*",  // NEW
    "/student/:path*",
    "/auth/:path*",
    "/terms",
    "/privacy",
  ],
};
```

---

### 7. TRPC Router Structure: Add Coach Router

**Recommendation:** Add `coachRouter` alongside existing `adminRouter` and `studentRouter`.
**Confidence:** HIGH

**Current structure** (from `src/lib/root.ts`):

```typescript
export const appRouter = createTRPCRouter({
  admin: adminRouter,
  student: studentRouter,
  notifications: notificationsRouter,
  passwordReset: passwordResetRouter,
});
```

**New structure:**

```typescript
export const appRouter = createTRPCRouter({
  admin: adminRouter,        // Unchanged -- backward compat
  coach: coachRouter,        // NEW -- coach-specific endpoints
  student: studentRouter,    // Unchanged
  superAdmin: superAdminRouter, // NEW -- platform management
  notifications: notificationsRouter,
  passwordReset: passwordResetRouter,
});
```

**Coach router scope:**
- `coach.schedule.*` -- manage own time slots, view own lessons
- `coach.student.*` -- manage own students, pricing
- `coach.payment.*` -- view own payments, revenue
- `coach.calendar.*` -- Google Calendar OAuth flow, sync
- `coach.profile.*` -- manage own coach profile

**Super Admin router scope:**
- `superAdmin.coach.*` -- manage all coaches (approve, deactivate, set split percentages)
- `superAdmin.revenue.*` -- platform-wide revenue reports
- `superAdmin.platform.*` -- platform settings, rink management

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth library | NextAuth.js v4 (keep) | Auth.js v5 / Better Auth | Ecosystem in flux; migration risk for no benefit this milestone |
| RBAC | Custom TRPC middleware | CASL, trpc-shield | Overkill for 4 roles; trpc-shield has stale maintenance |
| OAuth token storage | NextAuth Account model | Custom OAuthToken table | Account model is the standard pattern; adapter handles it |
| Token encryption | Node.js crypto (built-in) | prisma-field-encryption | Incompatible with Prisma 6.19+ (broken since 6.14) |
| Data scoping | Prisma Client Extensions | PostgreSQL RLS | RLS has recent CVEs, breaks Prisma type safety, complex on Neon |
| Revenue tracking | Custom Prisma models | Double-entry ledger system | Overkill for manual Venmo/Zelle verification |
| Google Calendar | googleapis OAuth2Client | Google service account | Service accounts cannot access individual coach calendars |

---

## New Environment Variables

```bash
# Google OAuth (for per-coach calendar linking)
GOOGLE_OAUTH_CLIENT_ID=       # OAuth 2.0 Client ID (web application type)
GOOGLE_OAUTH_CLIENT_SECRET=   # OAuth 2.0 Client Secret
GOOGLE_OAUTH_REDIRECT_URI=    # e.g., https://app.example.com/api/auth/callback/google-calendar

# Token encryption
TOKEN_ENCRYPTION_KEY=          # 32-byte hex key: `openssl rand -hex 32`

# Existing variables (keep as-is for backward compatibility during migration)
GOOGLE_CLIENT_EMAIL=           # Service account -- keep for migration period
GOOGLE_PRIVATE_KEY=            # Service account -- keep for migration period
GOOGLE_CALENDAR_ID=            # Original admin calendar -- keep for migration period
```

**Important distinction:** The existing `GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY` are for a **service account**. The new `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` are for a **web application OAuth2 client**. These are different credential types in Google Cloud Console. Both can coexist during the migration period.

---

## Installation

No new npm packages required. Everything needed is already installed:

```bash
# Already in package.json:
# - next-auth@4.24.13        (auth framework)
# - @next-auth/prisma-adapter@1.0.7  (Prisma adapter for Account model)
# - googleapis@150.0.1       (Google Calendar API with OAuth2Client)
# - @prisma/client@6.19.0    (Prisma with Client Extensions support)
# - zod@3.25.76              (validation for new schemas)
# - bcrypt@6.0.0             (password hashing)
# - Node.js crypto            (built-in, no install)

# Only command needed:
pnpm prisma:migrate   # After schema changes
```

**This is a major advantage of the recommended approach: zero new dependencies.** Every library needed is already installed and in use. The multi-coach extension is primarily a schema and architecture change, not a technology change.

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Auth (keep NextAuth v4) | HIGH | Official docs confirm Account model supports multi-provider. Already installed. |
| Per-coach OAuth | HIGH | googleapis OAuth2Client is the official Google pattern. Well-documented. |
| Token encryption | HIGH | Node.js built-in crypto. No dependency risk. |
| RBAC middleware | HIGH | Extending existing proven pattern in src/lib/trpc.ts. |
| Prisma Client Extensions | MEDIUM | Feature is GA in Prisma 6, but auto-scoping all queries is complex. Needs careful testing. |
| Revenue tracking | HIGH | Simple Prisma models. No external dependencies. |
| Middleware routing | HIGH | Extending existing working middleware.ts pattern. |

---

## Risks and Open Questions

1. **Google OAuth consent screen:** Moving from service account to user OAuth requires a Google Cloud project with an OAuth consent screen configured for `calendar` scope. If the app is not verified by Google, coach users will see a "This app isn't verified" warning. For internal/small deployment, this is acceptable. For broader marketplace, Google verification may take 4-6 weeks.

2. **Prisma Client Extensions query scoping completeness:** The `$extends` approach must cover ALL query methods (findMany, findFirst, findUnique, create, update, delete, count, aggregate, groupBy) for ALL coach-scoped models. Missing even one method creates a data leak. This needs thorough testing.

3. **ADMIN to COACH migration path:** Existing `ADMIN` user needs a migration strategy. The cleanest approach: create a `Coach` record for the existing admin, add `SUPER_ADMIN` role, and maintain backward compatibility with existing admin routes while building new coach routes.

4. **googleapis version:** Currently at v150.0.1, latest is v171.4.0. Consider upgrading to latest in a separate PR before starting multi-coach work, to avoid conflating upgrades with feature changes.

---

## Sources

- [NextAuth.js v4 Documentation](https://next-auth.js.org) -- Official docs
- [Auth.js Prisma Adapter Schema](https://authjs.dev/getting-started/adapters/prisma) -- Account model reference
- [googleapis Node.js Client](https://github.com/googleapis/google-api-nodejs-client) -- OAuth2 implementation
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2) -- Token flow reference
- [TRPC Middleware Documentation](https://trpc.io/docs/server/middlewares) -- Middleware patterns
- [Prisma Client Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions) -- Query extensions
- [Node.js Crypto API](https://nodejs.org/api/crypto.html) -- AES-256-GCM encryption
- [Auth.js + Better Auth Discussion](https://github.com/nextauthjs/next-auth/discussions/13252) -- Ecosystem direction
- [Multi-Tenant RLS Risks (2026)](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c) -- Security analysis
- [Prisma Multi-Tenant Patterns](https://zenstack.dev/blog/multi-tenant) -- Architecture comparison
