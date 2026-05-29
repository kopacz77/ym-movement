---
phase: 20-wardrobe-notifications
verified: 2026-05-29T23:30:00Z
status: passed
score: 9/9 must-haves verified
human_verification_deferred:
  - test: "Trigger consigner submit + verify admin inbox receives email (NOTIFY-01)"
    expected: "All ADMIN/SUPER_ADMIN users receive an HTML email with cyan/navy branding; in-app notification ALSO posted"
    why_human: "Requires sending real email via Resend; render fidelity needs visual inspection"
  - test: "Approve a consigner dress + verify consigner receives approval email (NOTIFY-02)"
    expected: "Consigner email arrives with commission % rendered; cyan header gradient + navy headings"
    why_human: "Email rendering across mail clients (Gmail/iOS Mail) cannot be programmatically asserted"
  - test: "Reject a consigner dress + verify consigner receives rejection email (NOTIFY-03)"
    expected: "Consigner email arrives with reason rendered verbatim, navy h1 with 📝 emoji"
    why_human: "Visual rendering of multi-line rejection reason needs human inspection"
  - test: "Submit rental request as student + verify dress owner receives email (NOTIFY-04)"
    expected: "Owner (Yura or consigner) receives email with student name, rental type, dates, optional competition info"
    why_human: "Requires end-to-end TRPC + Resend flow"
  - test: "Approve/decline rental request + verify student receives email (NOTIFY-05)"
    expected: "Approved branch shows Payment Required + How to Pay; Declined branch shows reviewer feedback"
    why_human: "Discriminated union rendering needs visual diff per branch"
  - test: "Mark payment received + verify student receives confirmation (NOTIFY-06)"
    expected: "Student email arrives with rental type, dates, total charged, payment method"
    why_human: "Requires admin UI flow + real Resend delivery"
  - test: "Wait for cron tick (or curl /api/cron/wardrobe-return-reminders in dev) + verify reminder fires once (NOTIFY-07)"
    expected: "Active rental with endDate within wardrobeReturnReminderDays receives one email; Rental.returnReminderSentAt populated; second tick does NOT resend"
    why_human: "Idempotency only observable by running cron twice and checking DB state + email counts"
  - test: "Release deposit + verify student receives email (NOTIFY-08)"
    expected: "Student email arrives with deposit amount in dollars (formatCurrencyFromCents)"
    why_human: "Currency formatting render needs visual check"
  - test: "Mark consignment payout sent + verify consigner receives email (NOTIFY-09)"
    expected: "Consigner email arrives with payout amount; '💸 Your Payout Has Been Sent' navy header"
    why_human: "Requires admin UI flow + visual rendering check"
---

# Phase 20: Wardrobe Notifications Verification Report

**Phase Goal:** All 9 lifecycle notifications fire reliably with brand-consistent templates.
**Verified:** 2026-05-29T23:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | All 9 email helpers are exported from `src/lib/email.ts` | ✓ VERIFIED | 9 `export async function send*` declarations at lines 684, 742, 796, 851, 906, 974, 1070, 1131, 1189 |
| 2 | NOTIFY-01 admin fan-out fires on consigner create + resubmit with fallback | ✓ VERIFIED | `consignerQueries.ts` lines 194-226 (create) + 344-376 (resubmit); ADMIN_NOTIFICATION_EMAIL env fallback when zero admins |
| 3 | NOTIFY-02 + NOTIFY-03 fire on approve/reject dress | ✓ VERIFIED | `wardrobeDressQueries.ts` lines 364-372 (approve) + 430-438 (reject) — both in dedicated try blocks |
| 4 | NOTIFY-04 fires when student creates rental request | ✓ VERIFIED | `requestQueries.ts` lines 252-265 — emails dress owner (Yura or consigner), NOT student |
| 5 | NOTIFY-05 discriminated union fires on rental decision | ✓ VERIFIED | `wardrobeRequestQueries.ts` lines 285-313 — APPROVE branch computes `totalDueCents`, DECLINE branch is simpler payload |
| 6 | NOTIFY-06 fires on markPaymentReceived | ✓ VERIFIED | `wardrobeRequestQueries.ts` lines 426-442 — uses `result.created.totalCharged` and `input.paymentMethod` |
| 7 | NOTIFY-08 fires on releaseDeposit | ✓ VERIFIED | `wardrobeRequestQueries.ts` lines 644-656 — passes `result.rental.securityDeposit` |
| 8 | NOTIFY-09 fires on markConsignmentPaidOut | ✓ VERIFIED | `wardrobeRequestQueries.ts` lines 769-784 — defensive `?? 0` fallback for non-null payout amount |
| 9 | NOTIFY-07 cron sender + route + schema + migration + vercel.json all wired | ✓ VERIFIED | Sender at `src/lib/wardrobe-return-reminder-sender.ts` (101 lines); route at `src/app/api/cron/wardrobe-return-reminders/route.ts` (73 lines) with `safeCompare` auth; `Rental.returnReminderSentAt DateTime?` at schema.prisma:623; migration `20260529225457_add_rental_return_reminder_sent_at`; vercel.json declares both crons at `0 4 * * *` |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/lib/email.ts` | Exports 9 helpers | ✓ VERIFIED | 1232 lines, all 9 `send*Email` exports present; cyan #0891b2 + navy #1a3a5c throughout |
| `src/features/wardrobe/api/queries/consignerQueries.ts` | NOTIFY-01 fan-out in create + resubmit | ✓ VERIFIED | Imports `sendConsignerDressSubmittedEmail`; two call sites each in dedicated try block with admin-loop + env fallback |
| `src/features/wardrobe/api/queries/requestQueries.ts` | NOTIFY-04 in create | ✓ VERIFIED | Imports `sendRentalRequestReceivedEmail`; one call site at line 253 in dedicated try block (separate from in-app notification try) |
| `src/features/admin/api/queries/wardrobeDressQueries.ts` | NOTIFY-02 + NOTIFY-03 | ✓ VERIFIED | Imports `sendConsignerDressApprovedEmail` + `sendConsignerDressRejectedEmail`; both in dedicated try blocks beside in-app notification |
| `src/features/admin/api/queries/wardrobeRequestQueries.ts` | NOTIFY-05, NOTIFY-06, NOTIFY-08, NOTIFY-09 | ✓ VERIFIED | Imports all 4 helpers; each fires in dedicated try block in the matching mutation (respondToRequest, markPaymentReceived, releaseDeposit, markConsignmentPaidOut) |
| `src/lib/wardrobe-return-reminder-sender.ts` | NOTIFY-07 sender library | ✓ VERIFIED | 101 lines; outer try/catch + per-rental try/catch (mirrors `batch-email-sender.ts`); idempotency via `returnReminderSentAt IS NULL` filter + post-send UPDATE |
| `src/app/api/cron/wardrobe-return-reminders/route.ts` | Cron POST route with auth | ✓ VERIFIED | 73 lines; CRON_SECRET via `safeCompare` (constant-time comparison); GET allowed in dev for manual testing |
| `prisma/schema.prisma` | `Rental.returnReminderSentAt DateTime?` | ✓ VERIFIED | Line 623 — `returnReminderSentAt    DateTime?` |
| `prisma/migrations/20260529225457_add_rental_return_reminder_sent_at/migration.sql` | Additive nullable column | ✓ VERIFIED | `ALTER TABLE "Rental" ADD COLUMN "returnReminderSentAt" TIMESTAMP(3);` wrapped in BEGIN/COMMIT |
| `vercel.json` | Both crons at `0 4 * * *` | ✓ VERIFIED | Declares `/api/cron/send-batch-emails` and `/api/cron/wardrobe-return-reminders` at same schedule |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `consignerQueries.create` | `sendConsignerDressSubmittedEmail` | direct call + admin loop + env fallback | ✓ WIRED | Lines 194-226; survives zero-admin DB state via ADMIN_NOTIFICATION_EMAIL |
| `consignerQueries.resubmit` | `sendConsignerDressSubmittedEmail` | direct call + admin loop + env fallback | ✓ WIRED | Lines 344-376; flag `isResubmit: true` differentiates payload |
| `requestQueries.create` | `sendRentalRequestReceivedEmail` | direct call to dress.Owner | ✓ WIRED | Owner select chain validated: `dress.Owner.email/name` |
| `wardrobeDressQueries.approveDress` | `sendConsignerDressApprovedEmail` | direct call to dress.Owner | ✓ WIRED | Passes `consignmentCommissionPctOverride ?? dress.consignmentCommissionPct` |
| `wardrobeDressQueries.rejectDress` | `sendConsignerDressRejectedEmail` | direct call to dress.Owner | ✓ WIRED | Passes `input.reason` as `rejectionReason` |
| `wardrobeRequestQueries.respondToRequest` | `sendRentalDecisionEmail` | discriminated union | ✓ WIRED | APPROVE branch computes `totalDueCents = rentalFee + cleaningFee + securityDeposit` via `pickRentalFee` |
| `wardrobeRequestQueries.markPaymentReceived` | `sendRentalConfirmedEmail` | direct call to student | ✓ WIRED | Uses `result.created.totalCharged` for amount and `input.paymentMethod` for method |
| `wardrobeRequestQueries.releaseDeposit` | `sendDepositReleasedEmail` | direct call to student | ✓ WIRED | Passes `result.rental.securityDeposit` cents |
| `wardrobeRequestQueries.markConsignmentPaidOut` | `sendConsignmentPayoutSentEmail` | direct call to consigner | ✓ WIRED | Passes `rental.consignmentPayoutAmount ?? 0` (defensive — prior check throws if null) |
| `/api/cron/wardrobe-return-reminders` POST | `sendWardrobeReturnReminders()` | direct invocation | ✓ WIRED | Auth via `safeCompare(authHeader, 'Bearer ' + CRON_SECRET)` in production |
| `sendWardrobeReturnReminders` | `prisma.rental.findMany` + `sendReturnReminderEmail` + `prisma.rental.update` | per-rental loop with idempotency | ✓ WIRED | Filter `paymentStatus IN (PAID, RETURNED)` + `endDate <= now + window` + `returnReminderSentAt IS NULL` |
| `sendWardrobeReturnReminders` | `getWardrobeSettings(prisma)` | dynamic settings read per tick | ✓ WIRED | No module-level cache — admin changes to `wardrobeReturnReminderDays` apply at next tick |

### Requirements Coverage

| Requirement | Status | Notes |
| --- | --- | --- |
| NOTIFY-01 admin fan-out on consigner submit/resubmit | ✓ SATISFIED | With env fallback for zero-admin state |
| NOTIFY-02 consigner approval email | ✓ SATISFIED | Includes commission % |
| NOTIFY-03 consigner rejection email | ✓ SATISFIED | Includes rejection reason |
| NOTIFY-04 owner notified of rental request | ✓ SATISFIED | Routes to dress.Owner (Yura or consigner), not requester |
| NOTIFY-05 student decision email (APPROVED/DECLINED) | ✓ SATISFIED | Discriminated union renders payment instructions vs. feedback |
| NOTIFY-06 student rental confirmation email | ✓ SATISFIED | Includes payment method + total charged |
| NOTIFY-07 return reminder cron (T-wardrobeReturnReminderDays) | ✓ SATISFIED | Daily cron, idempotent, configurable window |
| NOTIFY-08 student deposit released email | ✓ SATISFIED | Includes deposit amount |
| NOTIFY-09 consigner payout sent email | ✓ SATISFIED | Includes payout amount |
| NOTIFY-10 (brand palette consistency) | ✓ SATISFIED | All 9 templates use #0891b2 (cyan) + #1a3a5c (navy) with supporting tones (#0c4a6e, #92400e amber, #f0f9ff cyan-50) |

### Anti-Patterns Found

No blockers found. Notes:
- Pre-existing TS error in `src/components/landing/IceParticles.tsx` (missing `three` type declarations) — unrelated to Phase 20; same as baseline before phase start.
- `?? 0` fallback in `sendConsignmentPayoutSentEmail` call is unreachable (prior validation throws BAD_REQUEST) — documented as defensive TS-narrowing, not a stub.
- One supporting accent color (`#0ea5e9` — Tailwind sky-500) appears in NOTIFY-05 "How to Pay" / "Reviewer Message" inset cards. Reasonable adjacent tone to #0891b2 cyan; not a brand violation.

### Sidebar/Layout Audit

| File | Status |
| --- | --- |
| `src/components/layout/AppSidebar.tsx` | UNTOUCHED (clean `git status`) |
| `src/components/layout/AppLayout.tsx` | UNTOUCHED (clean `git status`) |

### TypeScript Compilation

`npx tsc --noEmit` output:
```
src/components/landing/IceParticles.tsx(6,24): error TS7016: Could not find a declaration file for module 'three'
```
Only the pre-existing IceParticles error — **zero new errors** from Phase 20 code.

### Gaps Summary

None — all 9 lifecycle notifications are wired with try/catch isolation per call site, brand-consistent templates, and a functioning cron with idempotent send + nullable schema column. The return-reminder cron is registered in vercel.json alongside the existing batch-emails cron. Human verification items (real Resend delivery + visual rendering across mail clients) are deferred per autonomous orchestrator policy.

---

_Verified: 2026-05-29T23:30:00Z_
_Verifier: Claude (gsd-verifier)_
