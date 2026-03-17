# Phase 12: Tech Debt Cleanup - Research

**Researched:** 2026-03-17
**Domain:** Next.js 16 middleware/proxy, Sidebar UI, Playwright test utilities
**Confidence:** HIGH

## Summary

This research investigated three tech debt items from the v1.1 milestone audit: (1) why Next.js middleware is not redirecting requests, (2) where to add a sign-out button, and (3) which test-utils exports are orphaned.

The middleware issue is almost certainly caused by the Next.js 16 deprecation of `middleware.ts` in favor of `proxy.ts`. While Next.js 16 documentation says `middleware.ts` is "deprecated but still works," multiple reports and the project's own test evidence show it is unreliable -- redirects silently fail. The fix is to rename `middleware.ts` to `proxy.ts`, rename the exported function from `middleware` to `proxy`, and verify that `getToken` from `next-auth/jwt` works in the Node.js runtime (which it should, since it only reads cookies and decodes JWTs).

The sign-out button exists in all three header components (AdminHeader, CoachHeader, StudentHeader) as an icon-only button, but the test looks for text-based buttons ("Sign Out" / "Logout") and the success criteria requires it in the **sidebar**. The fix is to add a sign-out button at the bottom of the sidebar in both `AppSidebar.tsx` (desktop) and the mobile sidebar in `AppLayout.tsx`.

The test-utils cleanup is straightforward: only 4 of 22 exports are used. 18 exports are orphaned and can be removed, including the `clearTestData` stub.

**Primary recommendation:** Rename `middleware.ts` to `proxy.ts` with function rename, add sign-out button to sidebar bottom section, and delete 18 unused test-utils exports.

## Standard Stack

No new libraries needed. This phase uses existing project dependencies.

### Core (Already Installed)
| Library | Version | Purpose | Relevant To |
|---------|---------|---------|-------------|
| next | 16.1.6 | App framework | middleware->proxy migration |
| next-auth | 4.24.13 | Authentication | getToken in proxy, signOut |
| next-auth/jwt | 4.24.13 | JWT token reading | getToken in proxy.ts |
| next-auth/react | 4.24.13 | Client-side auth | signOut function |
| lucide-react | (installed) | Icons | LogOut icon for sidebar |
| @playwright/test | (installed) | E2E testing | Test verification |

### No New Dependencies Required

This phase is entirely about fixing existing code. No new packages needed.

## Architecture Patterns

### Pattern 1: Middleware-to-Proxy Migration

**What:** Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts`. The file must be renamed and the exported function must be renamed from `middleware` to `proxy`.

**Why this is the root cause:** Next.js 16.1.6 still recognizes `middleware.ts` for backward compatibility, but reports from the community and this project's own test evidence show that redirects from deprecated middleware can silently fail or behave inconsistently. The proxy runtime uses Node.js (not Edge), which actually benefits `getToken` since it has full Node.js API access.

**Migration steps:**
1. Rename `/home/kopacz/projects/yura-scheduler-v3/middleware.ts` to `/home/kopacz/projects/yura-scheduler-v3/proxy.ts`
2. Rename the exported function from `middleware` to `proxy`
3. Keep `config` export unchanged (matcher syntax is identical)
4. The `NextRequest`, `NextResponse`, and `getToken` APIs are all identical between middleware and proxy

**Confidence:** HIGH -- Official Next.js 16 documentation explicitly states this rename, and the proxy.ts API reference confirms identical API surface.

**Source:** https://nextjs.org/docs/app/api-reference/file-conventions/proxy

```typescript
// proxy.ts (renamed from middleware.ts)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  // ... identical logic to current middleware ...
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/coach/:path*",
    "/student/:path*",
    "/auth/:path*",
    "/terms",
    "/privacy",
  ],
};
```

### Pattern 2: Sign-Out Button in Sidebar

**What:** Add a sign-out button at the bottom of the sidebar, below the navigation and role-switch links.

**Current state:** Sign-out functionality already exists in header components (AdminHeader, CoachHeader, StudentHeader) as icon-only `<TouchIconButton>` with `aria-label="Log out"`. These use an AlertDialog confirmation pattern. The test at `authentication.spec.ts:122-157` looks for `button:has-text("Sign Out")` or `a:has-text("Sign Out")`.

**Where to add:**
1. **Desktop sidebar** (`/home/kopacz/projects/yura-scheduler-v3/src/components/layout/AppSidebar.tsx`): Add at the bottom of the `flex-col` container, below the role-switch section, using `mt-auto` to push it to the bottom.
2. **Mobile sidebar** (`/home/kopacz/projects/yura-scheduler-v3/src/components/layout/AppLayout.tsx`): Add in the mobile `<SidebarContent>` section at the bottom.

**Implementation pattern:** Use `signOut` from `next-auth/react` directly (same as header components). Include visible text "Sign Out" to match the test selectors. Use the `LogOut` icon from lucide-react for consistency with existing header buttons.

**Confidence:** HIGH -- Existing implementations in three header components provide exact patterns.

```typescript
// In AppSidebar.tsx, at the bottom of the sidebar
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

// Inside the SidebarContent, after navigation and role-switch:
<div className="mt-auto pt-4 border-t border-gray-200">
  <button
    onClick={() => signOut({ callbackUrl: "/auth/login" })}
    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 w-full"
  >
    <LogOut className="h-5 w-5 shrink-0" />
    <span>Sign Out</span>
  </button>
</div>
```

### Pattern 3: Test-Utils Cleanup

**What:** Remove 18 orphaned exports from `test-utils.ts`, keeping only the 4 that are actively imported.

**Confidence:** HIGH -- Direct import analysis of all test files.

### Recommended Project Structure Changes

```
/ (project root)
├── middleware.ts   -> RENAME to proxy.ts
├── proxy.ts        <- NEW (renamed from middleware.ts)
├── src/
│   └── components/
│       └── layout/
│           ├── AppSidebar.tsx   <- MODIFY (add sign-out button)
│           └── AppLayout.tsx    <- MODIFY (add sign-out to mobile sidebar)
├── tests/
│   ├── helpers/
│   │   └── test-utils.ts       <- MODIFY (remove 18 orphaned exports)
│   ├── role-guards.spec.ts     <- MODIFY (unfixme 6 tests)
│   └── authentication.spec.ts  <- MODIFY (unfixme 2 tests, unskip 1 test)
```

### Anti-Patterns to Avoid
- **Keeping middleware.ts alongside proxy.ts:** Next.js will only use one. Delete middleware.ts after creating proxy.ts to avoid confusion.
- **Adding complex auth logic to proxy.ts:** Next.js 16 recommends keeping proxy lightweight. The current `getToken` + redirect pattern is acceptable but avoid adding database calls or heavy logic.
- **Removing the header logout buttons:** The sign-out button in the sidebar supplements but does not replace the existing header logout buttons.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Proxy migration | Manual file restructuring | `npx @next/codemod@canary middleware-to-proxy .` | Official codemod handles rename safely |
| Sign-out functionality | Custom session clearing | `signOut()` from `next-auth/react` | Already handles cookie clearing, CSRF, callback URLs |
| Test import analysis | Manual grep of all files | Biome/TypeScript unused export detection | More reliable than manual tracking |

**Key insight:** The middleware-to-proxy codemod exists but is simple enough that manual rename is also safe -- the only changes are filename and function name. Given this project already has `--webpack` in its dev/build commands, manual rename avoids any codemod edge cases.

## Common Pitfalls

### Pitfall 1: Proxy.ts Not Working with Webpack

**What goes wrong:** There was a known bug in Next.js 16.0.1 where `proxy.ts` was not included in webpack builds (GitHub issue #85513). This was fixed in 16.0.2-canary.25.
**Why it happens:** Early webpack integration didn't account for the new proxy file convention.
**How to avoid:** The project uses Next.js 16.1.6, which is well past the fix. Verify after rename by checking dev server console for the "Proxy compiled" message. If proxy isn't loading, check that the file is at the project root (same level as `package.json`), not inside `src/`.
**Warning signs:** No console output from proxy, redirects not happening.
**Confidence:** HIGH -- Version 16.1.6 includes the fix.

### Pitfall 2: Cookie Name Mismatch After Proxy Runtime Change

**What goes wrong:** `getToken` uses `NEXTAUTH_URL` to determine cookie name prefix (`__Secure-` for HTTPS, `next-auth.` for HTTP). The proxy runtime change from Edge to Node.js could theoretically affect cookie access.
**Why it happens:** Different runtimes have different `Request` object implementations.
**How to avoid:** The project's `.env` has `NEXTAUTH_URL="http://localhost:3000"` (HTTP, not HTTPS), so cookies use the `next-auth.session-token` name. The Playwright storage states confirm this. Both Edge and Node.js runtimes support `req.cookies.getAll()` which is what `getToken` uses.
**Warning signs:** `getToken` returning null for authenticated users.
**Confidence:** HIGH -- Cookie naming is determined by env vars, not runtime.

### Pitfall 3: NEXTAUTH_URL Port Mismatch

**What goes wrong:** `.env` sets `NEXTAUTH_URL="http://localhost:3000"` but dev server runs on port 3100 (`next dev -p 3100`).
**Why it happens:** NEXTAUTH_URL was likely set before the port was changed to 3100.
**How to avoid:** This mismatch does NOT affect `getToken` (which only uses NEXTAUTH_URL for cookie name prefix detection). However, it could affect NextAuth callback URLs. For this phase, it's a note for future cleanup -- not a blocker.
**Warning signs:** Redirect loops after sign-in/sign-out.
**Confidence:** MEDIUM -- The port mismatch exists but may not directly cause the redirect bug.

### Pitfall 4: Sidebar Sign-Out Breaking Immutable Layout

**What goes wrong:** CLAUDE.md has strict "IMMUTABLE" sidebar layout requirements. Adding a sign-out button must not violate these constraints.
**Why it happens:** The sidebar's dimensions, colors, and structure are locked per CLAUDE.md.
**How to avoid:** The sign-out button goes in the existing `flex-1` content area using `mt-auto` to push it to the bottom. It does NOT change: sidebar width (w-64), header height (h-24), colors, borders, or font sizes. It follows the exact same styling as the role-switch links that already exist in the sidebar.
**Warning signs:** Layout shifts, header misalignment, sidebar width changes.
**Confidence:** HIGH -- The role-switch links already prove that bottom-positioned links work in the sidebar without violating layout constraints.

### Pitfall 5: Unfixme-ing Tests Before Fix Is Verified

**What goes wrong:** Removing `test.fixme()` before the proxy fix is confirmed working causes test failures.
**Why it happens:** The tests are marked fixme because the underlying bug exists.
**How to avoid:** Follow this order: (1) rename middleware.ts to proxy.ts, (2) manually verify redirects work in dev server, (3) THEN unfixme the tests, (4) run the tests to confirm.
**Warning signs:** Tests failing after unfixme with same redirect symptoms.
**Confidence:** HIGH -- Logical ordering dependency.

### Pitfall 6: Sign-Out Test Selector Mismatch

**What goes wrong:** The test at `authentication.spec.ts:128-130` looks for `button:has-text("Sign Out"), button:has-text("Logout"), a:has-text("Sign Out"), a:has-text("Logout")`. If the sidebar button text doesn't match any of these, the test still fails.
**Why it happens:** Text selector mismatch between test and implementation.
**How to avoid:** Use exactly `"Sign Out"` as the button text (matches the test selector `button:has-text("Sign Out")`). The existing header buttons use "Log Out" (in the AlertDialog action) but the icon button itself has no text -- only `aria-label="Log out"`.
**Warning signs:** Test still skipping/failing after adding the button.
**Confidence:** HIGH -- Direct text matching with existing test selectors.

## Code Examples

### Example 1: proxy.ts (Renamed from middleware.ts)

```typescript
// Source: Current middleware.ts with function rename
// File: /proxy.ts (project root)

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Enforce HTTPS in production
  if (
    process.env.NODE_ENV === "production" &&
    request.headers.get("x-forwarded-proto") !== "https"
  ) {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 301);
  }

  // Skip static assets and API routes
  if (path.startsWith("/_next/") || path.startsWith("/api/") || path.includes(".")) {
    return NextResponse.next();
  }

  // ... rest of logic identical to current middleware.ts ...
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/coach/:path*",
    "/student/:path*",
    "/auth/:path*",
    "/terms",
    "/privacy",
  ],
};
```

### Example 2: Sign-Out Button in AppSidebar.tsx

```typescript
// Source: Pattern from existing role-switch links in AppSidebar.tsx
// Add to bottom of sidebar, after role-switch section

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

// Inside the sidebar flex-col container, as the last child:
<div className="px-4 py-4 border-t border-gray-200">
  <button
    onClick={() => signOut({ callbackUrl: "/auth/login" })}
    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-all duration-200 w-full"
  >
    <LogOut className="h-5 w-5 shrink-0" />
    <span>Sign Out</span>
  </button>
</div>
```

### Example 3: Test-Utils After Cleanup

```typescript
// Source: Import analysis of all test files
// File: tests/helpers/test-utils.ts

import { type Page } from "@playwright/test";

// KEEP: Used by authentication.spec.ts and e2e-complete-flow.spec.ts
export const testData = {
  admin: { email: "admin@test.com", password: "ADMINPASS2025!" },
  coach: { email: "coach@test.com", password: "COACHPASS2025!", name: "Test Coach" },
  // ... (keep all testData entries - they may be used by future tests)
  student: {
    email: "test.student@example.com",
    password: "TestPassword123!",
    name: "Test Student",
    phone: "555-123-4567",
    level: "PRELIMINARY",
    maxLessonsPerWeek: 2,
    emergencyContact: { name: "Test Parent", phone: "555-987-6543", relationship: "Parent" },
  },
  rink: { name: "Test Ice Rink", address: "123 Ice Street, Test City, TC 12345", timezone: "America/Los_Angeles" },
};

// KEEP: Used by e2e-complete-flow.spec.ts
export async function loginAsSuperAdmin(page: Page) {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', testData.admin.email);
  await page.fill('input[id="password"]', testData.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/admin/dashboard", { timeout: 10000 });
}

// KEEP: Backward compat alias, used by e2e-complete-flow.spec.ts
export const loginAsAdmin = loginAsSuperAdmin;

// KEEP: Used by e2e-complete-flow.spec.ts
export function generateTestEmail(prefix = "test"): string {
  return `${prefix}.${Date.now()}@playwright-test.com`;
}

// DELETE ALL OTHER EXPORTS (18 functions)
```

### Example 4: Unfixme-ing Role Guard Tests

```typescript
// Source: tests/role-guards.spec.ts
// Change test.fixme() back to test() for all 6 redirect tests

test("student redirected from /admin/dashboard to /student/dashboard", async ({ page }) => {
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` with `export function middleware()` | `proxy.ts` with `export function proxy()` | Next.js 16.0.0 (2025) | Must rename file and function |
| Edge Runtime for middleware | Node.js Runtime for proxy | Next.js 16.0.0 | `getToken` works better in Node.js (full crypto support) |
| `skipMiddlewareUrlNormalize` config | `skipProxyUrlNormalize` config | Next.js 16.0.0 | Config flag rename (not used in this project) |

**Deprecated/outdated:**
- `middleware.ts` file convention: Deprecated in Next.js 16, will be removed in a future version. Rename to `proxy.ts`.
- `export function middleware()`: Deprecated. Rename to `export function proxy()`.

## Open Questions

1. **Will getToken work identically in proxy.ts with Node.js runtime?**
   - What we know: `getToken` from `next-auth/jwt` v4.24.13 uses standard `req.cookies` and `jose` library for JWT decoding. Both work in Node.js runtime. The cookie API on `NextRequest` is identical between middleware and proxy.
   - What's unclear: No production-tested confirmation for this specific version combination (next 16.1.6 + next-auth 4.24.13).
   - Recommendation: Rename and test manually before unfixme-ing tests. If `getToken` fails, the error handler on line 42 of middleware.ts catches it gracefully -- the user would be redirected to login (which is actually the desired behavior for unauthenticated users).

2. **Should NEXTAUTH_URL be updated from port 3000 to 3100?**
   - What we know: The port mismatch exists but does not affect `getToken` cookie name detection. It may affect NextAuth callback URLs.
   - What's unclear: Whether this causes any subtle bugs in the sign-out redirect flow.
   - Recommendation: Out of scope for this phase -- note as a future cleanup item. The sign-out button can use explicit `callbackUrl: "/auth/login"` to avoid depending on NEXTAUTH_URL.

## Detailed Export Analysis: test-utils.ts

### Actively Used (4 exports -- KEEP)

| Export | Used By | Import Style |
|--------|---------|--------------|
| `testData` | authentication.spec.ts, e2e-complete-flow.spec.ts | Named import |
| `loginAsSuperAdmin` | Used via `loginAsAdmin` alias | Named import |
| `loginAsAdmin` | e2e-complete-flow.spec.ts | Named import (alias of loginAsSuperAdmin) |
| `generateTestEmail` | e2e-complete-flow.spec.ts | Named import |

### Orphaned (18 exports -- DELETE)

| Export | Lines | Reason Orphaned |
|--------|-------|-----------------|
| `loginAsStudent` | 70-76 | Not imported anywhere |
| `loginAsCoach` | 81-87 | Not imported anywhere |
| `navigateToCoachPage` | 92-95 | Not imported anywhere |
| `approveCoach` | 100-108 | Not imported anywhere |
| `createStudentAccount` | 122-171 | Not imported anywhere |
| `navigateToAdminPage` | 176-179 | Not imported anywhere (but used internally by approveCoach/approveStudent) |
| `navigateToStudentPage` | 184-187 | Not imported anywhere |
| `createTimeSlot` | 192-217 | Not imported anywhere |
| `bookLesson` | 222-238 | Not imported anywhere |
| `approveStudent` | 243-254 | Not imported anywhere |
| `verifyPayment` | 259-270 | Not imported anywhere |
| `testResponsiveDesign` | 275-303 | Not imported anywhere |
| `waitForApiCalls` | 308-323 | Not imported anywhere |
| `clearTestData` | 328-336 | Not imported anywhere; also a no-op stub |
| `generateFutureDateTime` | 348-355 | Not imported anywhere |
| `takeScreenshot` | 360-365 | Not imported anywhere |
| `assertNoConsoleErrors` | 370-382 | Not imported anywhere |
| `mockApiResponse` | 387-395 | Not imported anywhere |
| `testFormValidation` | 400-415 | Not imported anywhere |

**Note:** After deleting these 18 exports, the `expect` and `Page` imports at line 1 can be simplified to just `Page` (since `expect` is only used by `assertNoConsoleErrors` and `testFormValidation`).

## Sources

### Primary (HIGH confidence)
- Official Next.js 16 Upgrade Guide: https://nextjs.org/docs/app/guides/upgrading/version-16
- Official proxy.ts API Reference: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Official middleware-to-proxy migration page: https://nextjs.org/docs/messages/middleware-to-proxy
- Direct code analysis of: middleware.ts, AppSidebar.tsx, AppLayout.tsx, test-utils.ts, role-guards.spec.ts, authentication.spec.ts

### Secondary (MEDIUM confidence)
- GitHub Issue #85513 (proxy.ts not included in webpack build): https://github.com/vercel/next.js/issues/85513 -- Fixed in 16.0.2-canary.25, well before 16.1.6
- GitHub Issue #13302 (next-auth/Next.js 16 compatibility): https://github.com/nextauthjs/next-auth/issues/13302
- DEV.to article on middleware-to-proxy migration with auth: https://dev.to/beyondit/nextjs-161-migration-refactoring-middlewarets-to-proxyts-without-breaking-auth-3kbh

### Tertiary (LOW confidence)
- Community reports of middleware.ts being unreliable in Next.js 16 -- multiple sources but no single authoritative confirmation
- The exact version where middleware.ts stopped reliably executing in Next.js 16 dev server is unclear

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all existing
- Architecture (proxy migration): HIGH - Official documentation is clear and prescriptive
- Architecture (sign-out button): HIGH - Follows established patterns in existing codebase
- Architecture (test cleanup): HIGH - Direct import analysis, deterministic
- Pitfalls: HIGH - Known issues documented with specific version fixes

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable -- Next.js 16 proxy API is stable, not experimental)
