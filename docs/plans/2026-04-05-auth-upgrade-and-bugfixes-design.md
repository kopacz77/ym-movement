# Design: Auth Stack Upgrade, Dependency Alignment & Bug Fixes

**Date**: 2026-04-05
**Status**: Approved
**Scope**: Fix coach pricing UI bug, fix account lockout issues, migrate next-auth v4 to v5, align all dependencies for skipLibCheck: false

## Context

Three problems converged:
1. A coach's pricing ($120 on-ice, $30 off-ice) doesn't display correctly in the admin scheduling dialogs, even though the backend calculates and stores the correct price
2. A student is locked out of their account, and there's no admin mechanism to unlock them
3. next-auth v4.24.13 has type incompatibilities with current dependencies, requiring skipLibCheck: true

## Problem 1: Coach Pricing UI Bug

### Root Cause
Two separate pricing utility files exist:
- `src/lib/pricing.ts` (backend) -- has full 4-tier waterfall: student > coach > defaults > hardcoded
- `src/lib/pricing-utils.ts` (UI) -- only has 2 tiers: student > hardcoded defaults

The AdminAssignmentDialog and EditLessonTypeDialog use `pricing-utils.ts`, which has **no coach pricing parameter**. The price the admin sees in the dropdown doesn't match what gets saved.

### Fix
- Add optional `coachPricing` parameter to `getHourlyRate()` and `getLessonTypePrice()` in `pricing-utils.ts`
- Fetch coach pricing in AdminAssignmentDialog from the time slot's coachId
- Fetch coach pricing in EditLessonTypeDialog from the lesson's coachId
- Ensure UI price preview matches backend calculation

### Files
- `src/lib/pricing-utils.ts` -- add coach pricing parameter
- `src/features/admin/components/scheduling/AdminAssignmentDialog.tsx` -- pass coach pricing
- `src/features/admin/components/scheduling/EditLessonTypeDialog.tsx` -- pass coach pricing

## Problem 2: Account Lockout Issues

### Root Cause
- `isAccountLockedOut()` returns `true` on any database error (fail-closed), causing legitimate users to appear locked out during transient DB issues
- No admin UI or API to unlock accounts -- only direct DB access or waiting 30 minutes

### Fix
- Change fail-closed to fail-open on DB connection errors in `isAccountLockedOut()`. Password verification still provides security even if lockout check fails. Log errors prominently.
- Add `admin.auth.unlockAccount` TRPC mutation (adminProcedure) that calls `clearLoginAttempts(email)` with security event logging
- Add unlock button in student management UI

### Files
- `src/lib/account-lockout.ts` -- fail-open on DB errors
- New TRPC mutation for admin unlock
- Student management UI -- add unlock action

## Problem 3: next-auth v4 to v5 Migration

### What Changes

**Auth config** (`src/lib/auth.ts`):
- `NextAuthOptions` -> `NextAuthConfig` from `next-auth`
- Export `auth`, `signIn`, `signOut` handlers
- Callbacks API mostly preserved, minor signature changes

**API route** (`src/app/api/auth/[...nextauth]/route.ts`):
- Simplified handler export

**Middleware** (`src/middleware.ts`):
- Integrate with v5's `auth()` as middleware wrapper
- Route protection logic preserved

**TRPC context** (`src/lib/trpc.ts`, `src/lib/trpc-optimized.ts`):
- `getServerSession(authOptions)` -> `auth()`

**Client-side**:
- `SessionProvider` and hooks remain similar
- Import paths may change

**Types** (`src/types/next-auth.d.ts`):
- Module augmentation paths update for v5

**Adapter**:
- `@next-auth/prisma-adapter` -> `@auth/prisma-adapter`

### Dependency Changes
- `next-auth`: 4.24.13 -> 5.x
- `@next-auth/prisma-adapter` -> `@auth/prisma-adapter`
- Remove standalone `@auth/core` (bundled in v5)
- Remove `@types/cookie` (not needed with v5)
- Keep `@types/nodemailer`, `@types/lodash`, `@types/jest`
- Target: `skipLibCheck: false` with zero errors
- Target: `tsconfig.json` with `skipLibCheck: false`

## Files to Modify (~15)

| File | Change |
|------|--------|
| `src/lib/auth.ts` | Rewrite for v5 API |
| `src/app/api/auth/[...nextauth]/route.ts` | Simplify to v5 handler |
| `src/middleware.ts` | Integrate with v5 auth() |
| `src/lib/trpc.ts` | getServerSession -> auth() |
| `src/lib/trpc-optimized.ts` | Same session change |
| `src/types/next-auth.d.ts` | Update module augmentation |
| `src/lib/account-lockout.ts` | Fail-open + admin unlock |
| `src/lib/pricing-utils.ts` | Add coach pricing param |
| `AdminAssignmentDialog.tsx` | Pass coach pricing |
| `EditLessonTypeDialog.tsx` | Pass coach pricing |
| `src/contexts/AuthContext.tsx` | Session import updates |
| `src/providers/index.tsx` | SessionProvider update |
| `package.json` | Dependency updates |
| `tsconfig.json` | skipLibCheck: false |
| `__tests__/middleware.test.ts` | Update for new middleware |

## Verification

1. Admin can assign student to coach's time slot and sees correct coach prices in dropdown
2. Saved lesson prices match what was shown in UI
3. Locked-out student can be unlocked by admin
4. DB connection errors during login don't falsely lock out users
5. Login/logout works with next-auth v5
6. All protected routes still enforce role-based access
7. TRPC auth procedures work correctly
8. Password reset flow works end-to-end
9. `pnpm type-check` passes with `skipLibCheck: false`
10. `pnpm build` succeeds
