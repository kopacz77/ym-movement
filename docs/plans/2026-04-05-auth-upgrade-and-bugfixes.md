# Auth Stack Upgrade, Bug Fixes & Dependency Alignment

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix coach pricing UI bug, fix account lockout issues, migrate next-auth v4 to v5, align dependencies for `skipLibCheck: false`.

**Architecture:** Migrate from `next-auth@4` (NextAuthOptions + getServerSession) to `next-auth@5` (NextAuth() + auth()). Fix pricing-utils.ts to include coach pricing in UI. Add admin unlock capability.

**Tech Stack:** next-auth v5, @auth/prisma-adapter, Prisma, TRPC, React 19, Next.js 16

---

### Task 1: Fix Coach Pricing in pricing-utils.ts

**Files:**
- Modify: `src/lib/pricing-utils.ts`

**Step 1: Add CoachPricing interface and update getHourlyRate()**

Add an optional `coachPricing` parameter to `getHourlyRate()` and `getLessonTypePrice()` that mirrors the backend's `pricing.ts` waterfall (student > coach > default).

```typescript
// Add after StudentPricing interface (line 27)
export interface CoachPricing {
  privateLessonPrice?: number | null;
  groupLessonPrice?: number | null;
  choreographyPrice?: number | null;
  competitionPrepPrice?: number | null;
  offIceDancePrice?: number | null;
}
```

Update `getHourlyRate` signature to:
```typescript
export function getHourlyRate(
  type: LessonType,
  studentPricing?: StudentPricing,
  coachPricing?: CoachPricing,
): number {
```

After the student pricing check (line 54), before the default fallback, add coach pricing check:
```typescript
  // Check coach-specific pricing
  if (coachPricing) {
    switch (type) {
      case "PRIVATE":
        if (coachPricing.privateLessonPrice != null) return coachPricing.privateLessonPrice;
        break;
      case "CHOREOGRAPHY":
        if (coachPricing.choreographyPrice != null) return coachPricing.choreographyPrice;
        break;
      case "GROUP":
        if (coachPricing.groupLessonPrice != null) return coachPricing.groupLessonPrice;
        break;
      case "COMPETITION_PREP":
        if (coachPricing.competitionPrepPrice != null) return coachPricing.competitionPrepPrice;
        break;
      case "OFF_ICE_DANCE":
        if (coachPricing.offIceDancePrice != null) return coachPricing.offIceDancePrice;
        break;
    }
  }
```

Update `getLessonTypePrice` signature to:
```typescript
export function getLessonTypePrice(
  type: LessonType,
  studentPricing?: StudentPricing,
  durationMinutes = 60,
  coachPricing?: CoachPricing,
): number {
  const hourlyRate = getHourlyRate(type, studentPricing, coachPricing);
```

**Step 2: Verify type-check passes**

Run: `pnpm type-check`
Expected: PASS (no new errors)

**Step 3: Commit**

```bash
git add src/lib/pricing-utils.ts
git commit -m "fix: add coach pricing support to pricing-utils.ts"
```

---

### Task 2: Pass Coach Pricing to AdminAssignmentDialog

**Files:**
- Modify: `src/features/admin/components/scheduling/AdminAssignmentDialog.tsx`

**Step 1: Add coach pricing query and pass to getLessonTypePrice**

The `TimeSlot` interface needs a `coachId` field. The dialog needs to fetch coach pricing when a time slot has a coach.

Update the `TimeSlot` interface (line 28):
```typescript
interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  coachId?: string | null;
  rink: {
    id: string;
    name: string;
  };
}
```

Add a query to fetch coach pricing after the studentPricing query (after line 67):
```typescript
  // Get coach pricing for this time slot's coach
  const { data: coachData } = api.admin.coach.getCoachPricing.useQuery(
    { coachId: timeSlot.coachId! },
    { enabled: !!timeSlot.coachId },
  );
```

**Note:** If `admin.coach.getCoachPricing` doesn't exist, we need to add it. Check `coachManagementQueries.ts` for an existing query that returns coach pricing fields. If one exists that returns the pricing fields, use that. Otherwise, add a simple query.

Update all `getLessonTypePrice` calls (lines 190, 196, 206, 212, 222) to pass `coachData` as the 4th argument:
```typescript
getLessonTypePrice(LessonType.PRIVATE, studentPricing, slotDurationMinutes, coachData)
```

**Step 2: Verify the TimeSlot data includes coachId**

Check where `AdminAssignmentDialog` is instantiated (likely in `ScheduleManager.tsx` or `TimeSlotDialog.tsx`) and ensure the `timeSlot` prop includes `coachId`. The time slot query in `timeSlotQueries.ts` already fetches `coachId` (it's on the `RinkTimeSlot` model).

**Step 3: Commit**

```bash
git add src/features/admin/components/scheduling/AdminAssignmentDialog.tsx
git commit -m "fix: display coach pricing in admin assignment dialog"
```

---

### Task 3: Pass Coach Pricing to EditLessonTypeDialog

**Files:**
- Modify: `src/features/admin/components/scheduling/EditLessonTypeDialog.tsx`

**Step 1: Add coachId prop and coach pricing query**

Add `coachId` to the props interface (line 27):
```typescript
interface EditLessonTypeDialogProps {
  lessonId: string;
  currentType: LessonType;
  currentPrice: number;
  currentNotes: string | null;
  studentId: string;
  studentName: string;
  durationMinutes: number;
  coachId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

Add coach pricing query after the studentPricing query (after line 67):
```typescript
  const { data: coachData } = api.admin.coach.getCoachPricing.useQuery(
    { coachId: coachId! },
    { enabled: !!coachId && open },
  );
```

Update all `getLessonTypePrice` calls (lines 95, 126, 132, 138, 144, 153) to pass `coachData`:
```typescript
getLessonTypePrice(LessonType.PRIVATE, studentPricing, durationMinutes, coachData)
```

**Step 2: Ensure coachId is passed from parent**

Find where `EditLessonTypeDialog` is instantiated (likely `TimeSlotDialog.tsx`) and pass the `coachId` from the lesson or time slot data.

**Step 3: Commit**

```bash
git add src/features/admin/components/scheduling/EditLessonTypeDialog.tsx
git commit -m "fix: display coach pricing in edit lesson type dialog"
```

---

### Task 4: Add Coach Pricing Query (if needed)

**Files:**
- Modify: `src/features/admin/api/queries/coach/coachManagementQueries.ts`

**Step 1: Check if getCoachPricing query exists**

Look for an existing query in `coachManagementQueries.ts` that returns coach pricing fields by coachId. If `getCoach` or similar exists and includes pricing fields, use that instead of creating a new query.

If no suitable query exists, add:
```typescript
  getCoachPricing: adminProcedure
    .input(z.object({ coachId: z.string() }))
    .query(async ({ ctx, input }) => {
      const coach = await ctx.prisma.coach.findUnique({
        where: { id: input.coachId },
        select: {
          privateLessonPrice: true,
          groupLessonPrice: true,
          choreographyPrice: true,
          competitionPrepPrice: true,
          offIceDancePrice: true,
        },
      });
      return coach;
    }),
```

**Step 2: Verify type-check passes**

Run: `pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/features/admin/api/queries/coach/coachManagementQueries.ts
git commit -m "feat: add getCoachPricing query for UI price display"
```

---

### Task 5: Fix Account Lockout Fail-Closed Behavior

**Files:**
- Modify: `src/lib/account-lockout.ts`

**Step 1: Change isAccountLockedOut to fail-open on DB errors**

Replace lines 56-58:
```typescript
  } catch (error) {
    console.error("Error checking account lockout, failing closed:", error);
    return true; // Fail closed - deny login if we can't verify
  }
```

With:
```typescript
  } catch (error) {
    console.error("LOCKOUT_CHECK_DB_ERROR: Could not verify lockout status:", error);
    return false; // Fail open - password check still provides security
  }
```

Similarly update `getRemainingAttempts` (lines 150-152):
```typescript
  } catch (error) {
    console.error("LOCKOUT_CHECK_DB_ERROR: Could not get remaining attempts:", error);
    return LOCKOUT_THRESHOLD; // Fail open - report full attempts available
  }
```

**Step 2: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/account-lockout.ts
git commit -m "fix: change account lockout to fail-open on DB errors"
```

---

### Task 6: Add Admin Unlock Account Mutation

**Files:**
- Modify: Auth router file (find the appropriate TRPC router for admin auth operations)

**Step 1: Add unlockAccount mutation**

Add to the appropriate admin router:
```typescript
  unlockAccount: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { clearLoginAttempts } = await import("@/lib/account-lockout");
      await clearLoginAttempts(input.email);

      logSecurityEvent("ACCOUNT_UNLOCKED", {
        targetEmail: input.email,
        unlockedBy: ctx.session.user.id,
      });

      return { success: true };
    }),
```

**Step 2: Commit**

```bash
git commit -m "feat: add admin unlock account mutation"
```

---

### Task 7: Update Dependencies for next-auth v5

**Files:**
- Modify: `package.json`

**Step 1: Update packages**

Run these commands:
```bash
pnpm remove @next-auth/prisma-adapter next-auth
pnpm add next-auth@5 @auth/prisma-adapter
```

**CRITICAL**: After install, verify postinstall only runs `prisma generate` (safe):
```bash
grep postinstall package.json
```
Expected: `"postinstall": "prisma generate"`

**Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: upgrade next-auth v4 to v5 with @auth/prisma-adapter"
```

---

### Task 8: Migrate Auth Config (src/lib/auth.ts)

**Files:**
- Modify: `src/lib/auth.ts`

**Step 1: Rewrite for v5 API**

Replace the entire file with v5 configuration:

```typescript
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcrypt";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
    error: "/auth/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const { isAccountLockedOut, recordLoginAttempt, clearLoginAttempts, getLockoutExpiry } =
          await import("@/lib/account-lockout");

        const isLocked = await isAccountLockedOut(email);
        if (isLocked) {
          const lockExpiry = await getLockoutExpiry(email);
          if (lockExpiry) {
            const minutesRemaining = Math.ceil((lockExpiry.getTime() - Date.now()) / (1000 * 60));
            throw new Error(
              `Account temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`,
            );
          }
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          await recordLoginAttempt({ email, success: false });
          return null;
        }

        const isPasswordValid = await compare(password, user.password);

        if (!isPasswordValid) {
          await recordLoginAttempt({ email, success: false });
          return null;
        }

        await clearLoginAttempts(email);
        await recordLoginAttempt({ email, success: true });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});

export function generateResetToken(): string {
  if (typeof window !== "undefined") {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  const nodeCrypto = require("node:crypto");
  return nodeCrypto.randomBytes(32).toString("hex");
}
```

**Key changes from v4:**
- `NextAuthOptions` type removed, config is passed directly to `NextAuth()`
- `CredentialsProvider` import changes to `Credentials` from `next-auth/providers/credentials`
- `PrismaAdapter` from `@auth/prisma-adapter` instead of `@next-auth/prisma-adapter`
- `authorize(credentials)` no longer receives `req` as second arg
- Exports `{ handlers, auth, signIn, signOut }` instead of `authOptions`
- No more `cookies` config (v5 handles this automatically)
- No more `events` config for signOut (handle in middleware if needed)

**Step 2: Commit**

```bash
git add src/lib/auth.ts
git commit -m "refactor: migrate auth config from next-auth v4 to v5"
```

---

### Task 9: Update API Route Handler

**Files:**
- Modify: `src/app/api/auth/[...nextauth]/route.ts`

**Step 1: Simplify to v5 handler export**

Replace the entire file:
```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

The rate limiting that was previously in this file should move to middleware or be handled by the existing `authRateLimiter` in the TRPC layer.

**Step 2: Commit**

```bash
git add src/app/api/auth/[...nextauth]/route.ts
git commit -m "refactor: simplify nextauth route handler for v5"
```

---

### Task 10: Update Middleware

**Files:**
- Modify: `src/middleware.ts`

**Step 1: Integrate with v5 auth()**

Replace the entire file:
```typescript
import { auth } from "@/lib/auth";

const PROTECTED_ROUTES: Record<string, string[]> = {
  "/admin": ["ADMIN", "SUPER_ADMIN"],
  "/student": ["STUDENT"],
  "/coach": ["COACH", "ADMIN", "SUPER_ADMIN"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const matchedPrefix = Object.keys(PROTECTED_ROUTES).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!matchedPrefix) {
    return;
  }

  const session = req.auth;

  if (!session?.user) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  const allowedRoles = PROTECTED_ROUTES[matchedPrefix];
  const userRole = (session.user as any).role as string | undefined;

  if (userRole && !allowedRoles.includes(userRole)) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("error", "AccessDenied");
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/coach/:path*"],
};
```

**Key changes:**
- `getToken` from `next-auth/jwt` replaced by `req.auth` (session available directly)
- Wrapped in `auth()` from our auth config
- `NextResponse.redirect()` becomes `Response.redirect()`
- Return `undefined` (not `NextResponse.next()`) for pass-through

**Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "refactor: migrate middleware to next-auth v5 auth() wrapper"
```

---

### Task 11: Update TRPC Context

**Files:**
- Modify: `src/lib/trpc.ts`
- Modify: `src/lib/trpc-optimized.ts`

**Step 1: Replace getServerSession with auth()**

In `src/lib/trpc.ts`, replace:
```typescript
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
```

With:
```typescript
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
```

In `createTRPCContext`, replace the session fetching logic (lines 24-36):
```typescript
  if ("req" in opts && "res" in opts) {
    session = await getServerSession(opts.req, opts.res, authOptions);
    clientIP = ...;
  } else {
    session = await getServerSession(authOptions);
    ...
  }
```

With:
```typescript
  session = await auth();
  if ("req" in opts && "res" in opts) {
    clientIP =
      (opts.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (opts.req.headers["x-real-ip"] as string) ||
      "unknown";
  } else if ("headers" in opts && opts.headers instanceof Headers) {
    clientIP = getClientIP(opts.headers);
  }
```

Apply the same pattern to `src/lib/trpc-optimized.ts`.

**Step 2: Commit**

```bash
git add src/lib/trpc.ts src/lib/trpc-optimized.ts
git commit -m "refactor: replace getServerSession with auth() in TRPC context"
```

---

### Task 12: Update All getServerSession Call Sites

**Files:**
- Modify: `src/app/api/auth/me/route.ts`
- Modify: `src/app/api/auth/student-id/route.ts`
- Modify: `src/app/api/auth/google-calendar/route.ts`
- Modify: `src/app/api/auth/google-calendar/callback/route.ts`
- Modify: `src/app/(protected)/student/schedule/page.tsx`
- Modify: `src/app/(protected)/student/schedule/[lessonId]/page.tsx`

**Step 1: Replace imports and calls**

In each file, replace:
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// ...
const session = await getServerSession(authOptions);
```

With:
```typescript
import { auth } from "@/lib/auth";
// ...
const session = await auth();
```

**Step 2: Commit**

```bash
git add src/app/api/auth/ src/app/\(protected\)/
git commit -m "refactor: replace getServerSession with auth() in all API routes and pages"
```

---

### Task 13: Update Type Declarations

**Files:**
- Modify: `src/types/next-auth.d.ts`

**Step 1: Update module augmentation for v5**

Replace the entire file:
```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
```

**Note:** The v5 module augmentation is very similar to v4. The main change is ensuring the `import "next-auth"` at the top works correctly with v5's type exports.

**Step 2: Commit**

```bash
git add src/types/next-auth.d.ts
git commit -m "refactor: update next-auth type declarations for v5"
```

---

### Task 14: Update SessionProvider

**Files:**
- Modify: `src/providers/index.tsx`

**Step 1: Add basePath to SessionProvider**

The `SessionProvider` in v5 needs `basePath`:
```typescript
<SessionProvider basePath="/api/auth">
```

The import stays the same: `import { SessionProvider } from "next-auth/react"`.

**Step 2: Commit**

```bash
git add src/providers/index.tsx
git commit -m "refactor: add basePath to SessionProvider for next-auth v5"
```

---

### Task 15: Update Middleware Test

**Files:**
- Modify: `__tests__/middleware.test.ts`

**Step 1: Update test for new middleware pattern**

The middleware export changed from a named export to a default export wrapped in `auth()`. Update the test import and mocking accordingly.

The test may need significant restructuring since v5 middleware works differently (session is on `req.auth` instead of being fetched via `getToken`).

**Step 2: Commit**

```bash
git add __tests__/middleware.test.ts
git commit -m "test: update middleware tests for next-auth v5"
```

---

### Task 16: Remove Stale Type Packages & Set skipLibCheck: false

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`

**Step 1: Clean up packages**

```bash
pnpm remove @types/cookie
```

(`@auth/core` was already removed earlier)

**Step 2: Set skipLibCheck to false**

In `tsconfig.json`, change:
```json
"skipLibCheck": false,
```

**Step 3: Run full type-check**

Run: `pnpm type-check`
Expected: PASS with 0 errors

If errors remain in node_modules from next-auth v5, investigate and fix. The v5 package should have better type alignment than v4.

**Step 4: Run build**

Run: `pnpm build`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json tsconfig.json pnpm-lock.yaml
git commit -m "chore: set skipLibCheck false with clean type-check"
```

---

### Task 17: Final Verification

**Step 1: Run full type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 2: Run build**

Run: `pnpm build`
Expected: PASS

**Step 3: Manual smoke test**

Start dev server: `pnpm dev`

Test the following:
1. Login as admin - should work, redirect to admin dashboard
2. Login as student - should work, redirect to student dashboard
3. Wrong password 5x - should lock out, show lockout message
4. Admin assigns student to coach's time slot - should show correct coach prices in dropdown
5. Edit lesson type dialog - should show correct coach prices
6. Logout - should redirect to login page
7. Visit `/admin/dashboard` while logged out - should redirect to login
8. Visit `/api/health/data` - should return row counts

**Step 4: Commit any fixes**

```bash
git commit -m "fix: address issues found during verification"
```
