---
phase: 20-wardrobe-notifications
plan: 01
subsystem: notifications
tags: [resend, email, transactional, brand-palette, wardrobe, notifications, formatCurrencyFromCents, discriminated-union]

# Dependency graph
requires:
  - phase: 13-wardrobe-foundation
    provides: formatCurrencyFromCents helper at src/lib/utils.ts (cents → USD-display single source)
  - phase: 18-self-serve-consignment
    provides: approveDress + rejectDress mutation call sites + Dress.rejectionReason field (NOTIFY-02/03 wire targets)
  - phase: 19-consignment-payouts
    provides: markConsignmentPaidOut mutation call site (NOTIFY-09 wire target)
  - phase: 16-wardrobe-requests
    provides: wardrobe.requests.create mutation call site (NOTIFY-04 wire target)
  - phase: 17-admin-rental-lifecycle
    provides: respondToRequest + markPaymentReceived + releaseDeposit mutation call sites (NOTIFY-05/06/08 wire targets)
provides:
  - "9 transactional email helpers covering the full wardrobe lifecycle (consigner submit/approve/reject, rental request received, rental decision approved/declined, rental confirmed, return reminder, deposit released, payout sent)"
  - "Discriminated-union pattern on sendRentalDecisionEmail — one helper renders both APPROVED + DECLINED branches"
  - "Money-rendering convention: formatCurrencyFromCents at the email template layer (no inline cents/100 math)"
  - "Brand-palette convention extended into wardrobe emails: navy #1a3a5c h1 + cyan #0891b2 CTA (NOTIFY-10 satisfied)"
affects: [20-02, 20-03, 21-testing, 22-storybook-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated-union typing on a single helper function to render two visually-different but chrome-identical email variants (sendRentalDecisionEmail data: {decision: 'APPROVED', totalDueCents, ...} | {decision: 'DECLINED', ...})"
    - "Template-literal email composition with conditional <li>s for optional fields (NOTIFY-04 competitionName/competitionDate)"
    - "In-body resolveBaseUrl() invocation in every helper (NOT module-level cached) — defends against 2026-04-27 Vercel cold-start incident pattern"
    - "JSDoc REQ-ID citation pattern (NOTIFY-NN) above every helper, with recipient + trigger event + forward-reference to wire site"

key-files:
  created: []
  modified:
    - "src/lib/email.ts (+560 lines including 1 import + 9 helpers; 673 → 1232 total LOC)"

key-decisions:
  - "Discriminated union on sendRentalDecisionEmail (NOT two separate helpers): single function = single import in wire layer, single subject/header/CTA chrome maintained between branches, the middle card varies"
  - "TypeScript narrowing required `isApproved && data.decision === 'APPROVED'` guard to access data.totalDueCents: pure TS narrowing constraint, semantically identical to plan's `isApproved` check; control-flow analysis collapses the && when isApproved is true"
  - "formatCurrencyFromCents used in 4 of 9 helpers (NOTIFY-05 APPROVED branch, NOTIFY-06, NOTIFY-08, NOTIFY-09); NOTIFY-01/02/03/04/07 have no money to render"
  - "All 9 helpers use navy #1a3a5c h1 + cyan #0891b2 CTA from sendPaymentReminderEmail template — pre-2026-04-26 legacy #3b82f6 blue NOT introduced anywhere (baseline count of 7 in legacy templates held steady)"
  - "All 9 helpers call resolveBaseUrl() INSIDE the function body — module-level caching forbidden per the 2026-04-27 Vercel cold-start incident comment at email.ts:40-42"
  - "Append-only diff: zero modifications to any existing exported helper; the only edit to existing code was adding one import line near the top of the file"
  - "Plan 20-02 wire-target line numbers are baked into JSDoc as forward-references (requestQueries.ts:240, wardrobeRequestQueries.ts:261/372/571/682, wardrobeDressQueries.ts:358/406) — making Plan 20-02 easy to slot into"

patterns-established:
  - "Single-helper discriminated-union email rendering: when two outbound emails share recipient/chrome but differ in middle-card content + subject, model the data param as a discriminated union (rather than splitting into two helpers). One import, one wire site, one template family."
  - "In-body resolveBaseUrl() invariant: this is now the universal pattern across all 20 email helpers in the file — module-level URL caching is forbidden (Vercel cold-start defense)."
  - "Conditional template literal <li>s for optional list fields: `${data.competitionName ? `<li>...</li>` : ''}` keeps email markup truthful when caller doesn't pass optional fields."

# Metrics
duration: 8min
completed: 2026-05-29
---

# Phase 20 Plan 01: Wardrobe Email Helpers Summary

**9 transactional email helpers appended to src/lib/email.ts covering the full wardrobe lifecycle (consigner submit/approve/reject, rental request received, rental decision approved/declined, rental confirmed, return reminder, deposit released, payout sent) with brand-aligned navy/cyan palette and formatCurrencyFromCents money rendering**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-29T22:40:30Z (approx)
- **Completed:** 2026-05-29T22:48:31Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- 9 new email helpers exported from `@/lib/email`, importable by name for Plans 20-02 + 20-03
- Discriminated-union helper `sendRentalDecisionEmail` collapses APPROVED + DECLINED into one function/import
- `formatCurrencyFromCents` imported once and used at 4 money-rendering sites (NOTIFY-05/06/08/09) — zero `cents/100` inline math
- Brand-palette consistency held: navy `#1a3a5c` h1 + cyan `#0891b2` CTA on every new helper; legacy `#3b82f6` count stayed flat at 7 (pre-existing only)
- `resolveBaseUrl()` called inside each helper body (8 of 9 new helpers contain `${resolveBaseUrl()}` — NOTIFY-07's subject also embeds it in a string interpolation contributing the 9th hit) per 2026-04-27 Vercel cold-start defense
- Plan 20-02 (mutation call-site wiring) and Plan 20-03 (return-reminder cron) unblocked

## Helper Inventory (verbatim exported names)

| # | Helper | NOTIFY ID | Recipient | Trigger Event (Plan 20-02 wire target) |
|---|--------|-----------|-----------|----------------------------------------|
| 1 | `sendConsignerDressSubmittedEmail` | NOTIFY-01 | Admin (per-recipient iteration) | consigner.create + consigner.resubmit |
| 2 | `sendConsignerDressApprovedEmail` | NOTIFY-02 | Consigner | admin.wardrobe.approveDress |
| 3 | `sendConsignerDressRejectedEmail` | NOTIFY-03 | Consigner | admin.wardrobe.rejectDress |
| 4 | `sendRentalRequestReceivedEmail` | NOTIFY-04 | Dress Owner (Yura or consigner — NOT the requesting student) | wardrobe.requests.create |
| 5 | `sendRentalDecisionEmail` (discriminated union) | NOTIFY-05 | Student | admin.wardrobeRequests.respondToRequest (APPROVE + DECLINE branches) |
| 6 | `sendRentalConfirmedEmail` | NOTIFY-06 | Student | admin.wardrobeRequests.markPaymentReceived |
| 7 | `sendReturnReminderEmail` | NOTIFY-07 | Student | Plan 20-03 cron (/api/cron/wardrobe-return-reminders) |
| 8 | `sendDepositReleasedEmail` | NOTIFY-08 | Student | admin.wardrobeRentals.releaseDeposit |
| 9 | `sendConsignmentPayoutSentEmail` | NOTIFY-09 | Consigner | admin.wardrobeRentals.markConsignmentPaidOut |

## Parameter Shape Highlights

**sendRentalDecisionEmail (discriminated union)** — the only multi-branch helper:

```typescript
data:
  | {
      decision: "APPROVED";
      dressTitle: string;
      responseMessage: string;
      totalDueCents: number;       // → formatCurrencyFromCents at render
    }
  | {
      decision: "DECLINED";
      dressTitle: string;
      responseMessage: string;
      // (no totalDueCents — DECLINED has no payment to collect)
    }
```

Other 8 helpers use straightforward `data: { ... }` shapes — date fields use native `Date`, money fields use `*Cents: number`, optional fields use `string | null` (only `sendRentalRequestReceivedEmail` has nullable fields: `competitionName`, `competitionDate`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 4 consigner/admin email helpers (NOTIFY-01/02/03/09)** — `1fab5ad` (feat)
2. **Task 2: Add 5 rental-lifecycle email helpers (NOTIFY-04/05/06/07/08)** — `486f400` (feat)

Two atomic commits, both append-only to `src/lib/email.ts`. Plan metadata commit will follow this SUMMARY write.

## Files Created/Modified

- `src/lib/email.ts` — +560 lines: 1 new import (`formatCurrencyFromCents from @/lib/utils`) + 9 new exported helper functions appended at end-of-file in NOTIFY-NN order. Pre-existing 11 helpers byte-untouched. File grew from 673 → 1232 LOC.

## Decisions Made

- **Discriminated-union helper over two separate functions** for NOTIFY-05: the APPROVED + DECLINED branches share recipient (student), chrome (greeting / subject pattern / footer / CTA-to-/wardrobe/my-rentals), and trigger mutation. A single helper means a single import in Plan 20-02's wire layer and a single template-evolution surface for future polish passes. The cost — one extra `data.decision` discriminator field — is much lower than the cost of two parallel helpers that would silently drift apart over time.
- **TypeScript narrowing guard `isApproved && data.decision === "APPROVED"`** required where the plan body used the simpler `isApproved` ternary. The plan's `isApproved = data.decision === "APPROVED"` derived boolean does not narrow `data` for property access (TS control-flow analysis tracks only direct discriminator checks, not derived booleans). The runtime semantics are byte-identical to the plan's shape; this is a pure type-narrowing accommodation.
- **In-body resolveBaseUrl() invariant honored** across all 9 helpers per the existing comment at email.ts:40-42 — module-level URL caching was the 2026-04-27 Vercel cold-start incident root cause.
- **Append-only diff** — zero modifications to any of the 11 pre-existing exported helpers; the only existing-code touch was adding the `formatCurrencyFromCents` import line near the top.
- **JSDoc forward-references to Plan 20-02 wire targets** (specific file:line citations like `wardrobeRequestQueries.ts:682`) baked into each helper's docstring, making Plan 20-02's call-site work mechanical.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Biome line-cap reflow on Task 1's sendConsignerDressRejectedEmail return statement**
- **Found during:** Task 1 (verification after appending 4 helpers)
- **Issue:** Biome's formatter wanted the multi-line `return sendEmail(consignerEmail, ..., emailContent);` collapsed onto a single line because it fit within the 100-char width budget. Plan body had it multi-line.
- **Fix:** Ran `npx biome check --write src/lib/email.ts` — formatter collapsed to single line.
- **Files modified:** src/lib/email.ts
- **Verification:** Re-ran `npx biome check src/lib/email.ts` — clean.
- **Committed in:** 1fab5ad (folded into Task 1 commit)

**2. [Rule 1 — Bug] TypeScript discriminated-union narrowing on sendRentalDecisionEmail**
- **Found during:** Task 2 (sendRentalDecisionEmail authoring)
- **Issue:** Plan body used `const isApproved = data.decision === "APPROVED";` then accessed `data.totalDueCents` inside the `isApproved ? ... : ...` middle-card ternary. TS control-flow analysis does NOT narrow `data` based on a derived boolean — only direct `data.decision === "APPROVED"` checks narrow it. As written the plan would fail compilation with `Property 'totalDueCents' does not exist on type {decision: "DECLINED", ...}`.
- **Fix:** Used `isApproved && data.decision === "APPROVED"` as the ternary guard. The `&&`-chain triggers TS narrowing properly; the runtime behavior is byte-identical (boolean `true && true === true`, boolean `false && X === false`).
- **Files modified:** src/lib/email.ts
- **Verification:** `npx tsc --noEmit` shows zero new errors (only the pre-existing IceParticles `three` types blocker remains).
- **Committed in:** 486f400 (folded into Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — formatter + TS narrowing)
**Impact on plan:** Both auto-fixes were mechanical adjustments required to make the plan's spec compile and pass Biome. Semantics byte-identical to the plan's intent. No scope creep.

## Issues Encountered

None — both tasks ran cleanly with the only friction being the two auto-fixed deviations above.

## User Setup Required

None — no external service configuration required. Resend API key already configured (used by 11 pre-existing email helpers).

## Next Phase Readiness

**Plan 20-02 (mutation call-site wiring) UNBLOCKED.** Each helper has a JSDoc forward-reference to its wire target file:line, making Plan 20-02 mechanical:

- `sendConsignerDressSubmittedEmail` → `consignerQueries.ts` (create + resubmit)
- `sendConsignerDressApprovedEmail` → `wardrobeDressQueries.ts:358` (approveDress)
- `sendConsignerDressRejectedEmail` → `wardrobeDressQueries.ts:406` (rejectDress)
- `sendRentalRequestReceivedEmail` → `requestQueries.ts:240` (create) — needs extended findUnique on Dress to include Owner.{email,name}
- `sendRentalDecisionEmail` → `wardrobeRequestQueries.ts:261` (respondToRequest) — branch on `input.decision === "APPROVE"`
- `sendRentalConfirmedEmail` → `wardrobeRequestQueries.ts:372` (markPaymentReceived)
- `sendDepositReleasedEmail` → `wardrobeRequestQueries.ts:571` (releaseDeposit)
- `sendConsignmentPayoutSentEmail` → `wardrobeRequestQueries.ts:682` (markConsignmentPaidOut)

**Plan 20-03 (return-reminder cron) UNBLOCKED.** `sendReturnReminderEmail` ready to invoke from the cron route.

**Verification proof (post-Plan):**
- `grep -c "^export async function send" src/lib/email.ts` = 20 (11 pre-existing + 9 new) ✓
- `grep -c "NOTIFY-0[1-9]" src/lib/email.ts` = 9 (one JSDoc REQ-ID per new helper) ✓
- `grep -c "formatCurrencyFromCents" src/lib/email.ts` = 5 (1 import + 4 uses) ✓
- `grep -c "#1a3a5c" src/lib/email.ts` = 21 (was 2; +19 across navy headers + nested h2s) ✓
- `grep -c "#0891b2" src/lib/email.ts` = 34 (was 15; +19 across CTAs + cards) ✓
- `grep -c "#3b82f6" src/lib/email.ts` = 7 (UNCHANGED — no legacy blue introduced in new helpers) ✓
- `grep -c "resolveBaseUrl()" src/lib/email.ts` = 20 (was 11; +9, one per new helper) ✓
- `grep -c 'decision: "APPROVED"' src/lib/email.ts` = 1 (discriminated union APPROVED branch) ✓
- `grep -c 'decision: "DECLINED"' src/lib/email.ts` = 1 (DECLINED branch) ✓
- `npx tsc --noEmit` = zero NEW errors (only pre-existing IceParticles `three` types blocker remains) ✓
- `npx biome check src/lib/email.ts` = clean ✓

---
*Phase: 20-wardrobe-notifications*
*Completed: 2026-05-29*
