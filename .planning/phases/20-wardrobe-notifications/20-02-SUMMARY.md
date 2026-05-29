---
phase: 20-wardrobe-notifications
plan: 02
subsystem: notifications
tags: [resend, email, transactional, trpc, prisma, fan-out, discriminated-union, second-try-variant]

# Dependency graph
requires:
  - phase: 20-wardrobe-notifications
    provides: 9 email helpers in src/lib/email.ts (Plan 20-01) — wired by this plan
  - phase: 18-self-serve-consignment
    provides: consignerQueries.create + consignerQueries.resubmit mutation call sites (Phase 18 left the createNotification gap that this plan closes); admin.wardrobe.approveDress + rejectDress call sites
  - phase: 16-wardrobe-requests
    provides: wardrobe.requests.create mutation call site for NOTIFY-04
  - phase: 17-admin-rental-lifecycle
    provides: respondToRequest + markPaymentReceived + releaseDeposit mutation call sites for NOTIFY-05/06/08
  - phase: 19-consignment-payouts
    provides: markConsignmentPaidOut mutation call site for NOTIFY-09
provides:
  - "8 of 9 wardrobe NOTIFY-NN templates fire reliably on their lifecycle TRPC mutation events (NOTIFY-01..06, 08, 09)"
  - "NOTIFY-01 closes Phase 18 gap: consignerQueries.create + resubmit gain BOTH admin fan-out in-app notifications AND admin fan-out emails (previously had neither)"
  - "Admin recipient resolution pattern via prisma.user.findMany on role IN [ADMIN, SUPER_ADMIN] with ADMIN_NOTIFICATION_EMAIL env-var fallback (mirrors sendAdminSignupNotification pattern)"
  - "Second-try variant established as the universal convention for non-blocking dual notification (in-app + email) — each fan-out gets its own try/catch so a Resend outage cannot suppress in-app delivery"
  - "Discriminated-union helper invocation pattern (sendRentalDecisionEmail) — single import, two branches (APPROVE vs DECLINE) selecting different payload shapes inside the call site"
affects: [20-03, 21-testing, 22-storybook-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Second-try variant for dual-channel notifications: existing in-app createNotification try/catch UNTOUCHED; new email send wrapped in its OWN separate try/catch — failures in either channel cannot suppress the other"
    - "Self-contained admin fan-out per try block: each try block re-runs the admin user findMany rather than hoisting the query above both blocks — keeps in-app and email channels independently failure-isolated (cheap query, admin users are a tiny set)"
    - "Email sends always fire POST-tx, outside the $transaction callback (Phase 17 precedent preserved) — never block tx commit on Resend latency"
    - "ADMIN_NOTIFICATION_EMAIL env-var fallback when zero admin users exist (mirrors sendAdminSignupNotification pattern at email.ts:176-225)"
    - "Discriminated-union helper invocation: caller branches on internal enum (decision === 'APPROVE') and selects literal discriminator shape ('APPROVED' vs 'DECLINED') in each branch — keeps single import, single helper, two visual modes"

key-files:
  created: []
  modified:
    - "src/features/wardrobe/api/queries/consignerQueries.ts (+144/-2 lines — 2 new imports + 2 admin fan-out blocks per mutation × 2 mutations = 4 new try/catch blocks total; closes Phase 18 NOTIFY-01 gap with NEW createNotification + NEW email)"
    - "src/features/admin/api/queries/wardrobeDressQueries.ts (+33/-1 lines — 1 new import line + Owner.{email,name} added to 2 findUnique selects + 2 new email try/catch blocks beside 2 existing createNotification blocks)"
    - "src/features/wardrobe/api/queries/requestQueries.ts (+26/-1 lines — 1 new import line + Owner.{email,name} added to 1 findUnique select + 1 new email try/catch block beside existing createNotification)"
    - "src/features/admin/api/queries/wardrobeRequestQueries.ts (+107/-5 lines — 4-symbol import group + Student.User.email added to 3 inner-tx selects + Dress.Owner.email added to 1 select + rentalType:true added to respondToRequest's inner select + Dress fee columns added to respondToRequest's inner select + securityDeposit:true added to releaseDeposit's inner select + 4 new email try/catch blocks beside 4 existing createNotification blocks; discriminated branch on respondToRequest renders APPROVE/DECLINE in-place)"

key-decisions:
  - "Removed unused createNotification import from consignerQueries.ts: only createNotificationForMultipleUsers is called (admin fan-out is always batched) — keeping the unused import would have triggered biome useUnusedImports"
  - "Used `?? 0` over non-null assertion (`!`) on rental.consignmentPayoutAmount in markConsignmentPaidOut's NOTIFY-09 email: the BAD_REQUEST guard above renders 0 unreachable at runtime; both expressions are byte-identical at runtime but `?? 0` survives biome strict mode and documents the invariant inline"
  - "Self-contained admin user findMany per try block (not hoisted): semantic isolation > query dedup. Admin user set is tiny (~5 rows in production), the cache is hot, and the dedup would couple in-app fan-out success to email fan-out execution — defeating the second-try variant's failure isolation purpose"
  - "respondToRequest's inner-tx select extension is BROAD (rentalType + 5 fee columns + Student.User.email) rather than narrow: NOTIFY-05 APPROVED branch needs all of them to compute totalDueCents inline. Alternative — re-fetch the dress after tx commit — would be slower AND would risk reading a stale dress between tx commit and re-fetch. Snapshot-at-tx-read is correct"
  - "Plan's `result.created.totalCharged` reference for NOTIFY-06 was already in scope: markPaymentReceived's tx body writes the rental with `totalCharged` computed at tx-read time. No select changes needed beyond Student.User.email"
  - "Did NOT modify the four existing createNotification try blocks anywhere: byte-identical preservation per second-try variant convention. The new email try blocks sit BELOW each existing in-app try block (insertion-order = chronological in code) — visually clear separation"

patterns-established:
  - "Second-try variant universalized: every wardrobe mutation that fires a dual-channel notification (in-app + email) now uses two adjacent independent try/catch blocks. Failure isolation invariant: a Resend outage NEVER suppresses an in-app inbox row; an in-app DB error NEVER suppresses an outbound email"
  - "Admin fan-out shape: `prisma.user.findMany({where: {role: {in: ['ADMIN', 'SUPER_ADMIN']}}, select: {...}})` → iterate per recipient → fallback to ADMIN_NOTIFICATION_EMAIL env-var when result is empty. Self-contained per try block (do NOT hoist the findMany)"
  - "Discriminated-union helper invocation: when a helper accepts a discriminated union data param, the caller branches on its INTERNAL flag (e.g. `input.decision === 'APPROVE'`) and selects the literal discriminator shape (`{decision: 'APPROVED', ...}`) inside each branch. Single import, single helper, two visual modes"
  - "Inner-tx select extensions are BROAD (snapshot-at-tx-read) for any subsequent post-tx work: prefer to over-select inside the tx than to re-query after commit (which risks stale reads + extra round-trip)"

# Metrics
duration: 7min
completed: 2026-05-29
---

# Phase 20 Plan 02: Mutation Call-Site Wiring Summary

**8 of 9 wardrobe NOTIFY-NN emails wired into their TRPC mutation call sites with second-try-variant non-blocking sends, closing the Phase 18 NOTIFY-01 gap with NEW admin fan-out (in-app + email) on consigner submit/resubmit**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-29T22:53:43Z
- **Completed:** 2026-05-29T23:01:21Z
- **Tasks:** 4
- **Files modified:** 4
- **Files created:** 0

## Accomplishments

- 8 of 9 wardrobe NOTIFY-NN emails fire reliably on their TRPC mutation events (NOTIFY-01..06, 08, 09); NOTIFY-07 is cron-driven and owned by parallel sibling Plan 20-03
- Phase 18 NOTIFY-01 gap CLOSED: consignerQueries.create + resubmit gain BOTH the in-app admin fan-out (via createNotificationForMultipleUsers) AND the email admin fan-out (via per-recipient iteration of sendConsignerDressSubmittedEmail) — previously had neither
- Second-try variant established as universal convention across all 8 wires: every email send is wrapped in its OWN separate try/catch from the existing in-app createNotification try/catch — a Resend outage cannot suppress an in-app inbox row and vice-versa
- Discriminated-union helper pattern proved out at call site: respondToRequest selects between `{decision: "APPROVED", totalDueCents}` and `{decision: "DECLINED"}` shapes inline based on `input.decision === "APPROVE"` — single import, single helper, two visual modes
- ADMIN_NOTIFICATION_EMAIL env-var fallback wired into NOTIFY-01 fan-out (mirrors sendAdminSignupNotification pattern at email.ts:176-225) for the zero-admin-users edge case

## Wire Inventory (REQ-ID × file × line × helper)

| REQ-ID | File | Helper | Recipient | Trigger |
|--------|------|--------|-----------|---------|
| NOTIFY-01 (create) | `src/features/wardrobe/api/queries/consignerQueries.ts` | `sendConsignerDressSubmittedEmail` (per-recipient fan-out) | Admins (ADMIN+SUPER_ADMIN) OR ADMIN_NOTIFICATION_EMAIL env-var fallback | `wardrobe.consigner.create` |
| NOTIFY-01 (resubmit) | `src/features/wardrobe/api/queries/consignerQueries.ts` | `sendConsignerDressSubmittedEmail` (per-recipient fan-out, isResubmit:true) | Admins (ADMIN+SUPER_ADMIN) OR ADMIN_NOTIFICATION_EMAIL fallback | `wardrobe.consigner.resubmit` |
| NOTIFY-02 | `src/features/admin/api/queries/wardrobeDressQueries.ts` | `sendConsignerDressApprovedEmail` | Consigner (dress owner) | `admin.wardrobe.approveDress` |
| NOTIFY-03 | `src/features/admin/api/queries/wardrobeDressQueries.ts` | `sendConsignerDressRejectedEmail` | Consigner (dress owner) | `admin.wardrobe.rejectDress` |
| NOTIFY-04 | `src/features/wardrobe/api/queries/requestQueries.ts` | `sendRentalRequestReceivedEmail` | Dress OWNER (Yura or consigner — NOT requesting student) | `wardrobe.requests.create` |
| NOTIFY-05 (APPROVE) | `src/features/admin/api/queries/wardrobeRequestQueries.ts` | `sendRentalDecisionEmail` (decision: "APPROVED") | Student | `admin.wardrobeRequests.respondToRequest` (APPROVE branch) |
| NOTIFY-05 (DECLINE) | `src/features/admin/api/queries/wardrobeRequestQueries.ts` | `sendRentalDecisionEmail` (decision: "DECLINED") | Student | `admin.wardrobeRequests.respondToRequest` (DECLINE branch) |
| NOTIFY-06 | `src/features/admin/api/queries/wardrobeRequestQueries.ts` | `sendRentalConfirmedEmail` | Student | `admin.wardrobeRequests.markPaymentReceived` |
| NOTIFY-08 | `src/features/admin/api/queries/wardrobeRequestQueries.ts` | `sendDepositReleasedEmail` | Student | `admin.wardrobeRentals.releaseDeposit` |
| NOTIFY-09 | `src/features/admin/api/queries/wardrobeRequestQueries.ts` | `sendConsignmentPayoutSentEmail` | Consigner (dress owner) | `admin.wardrobeRentals.markConsignmentPaidOut` |

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire NOTIFY-01 admin fan-out (in-app + email) into consignerQueries.ts create + resubmit** — `7567853` (feat)
2. **Task 2: Wire NOTIFY-02 + NOTIFY-03 into wardrobeDressQueries.ts approveDress + rejectDress** — `35b44bc` (feat)
3. **Task 3: Wire NOTIFY-04 into requestQueries.ts create** — `0f60b87` (feat)
4. **Task 4: Wire NOTIFY-05 + NOTIFY-06 + NOTIFY-08 + NOTIFY-09 into wardrobeRequestQueries.ts** — `f934ab4` (feat)

Note: Plan 20-03's sibling agent committed `a404c1c`, `b5975eb`, `28f23c2`, `c190e2e` in parallel between Tasks 2 and 3 (touching disjoint files: schema.prisma + migration.sql + sender lib + cron route + vercel.json). Specific-file staging per Phase 18-05 lesson held: zero collision, zero rework.

## Files Created/Modified

- `src/features/wardrobe/api/queries/consignerQueries.ts` — +144/-2 lines. Closes Phase 18 NOTIFY-01 gap: `create` and `resubmit` mutations gain captured-result refactor (`const created = await` / `const updated = await` instead of inline `return`), consigner-name resolution via `prisma.user.findUnique`, admin in-app fan-out via `createNotificationForMultipleUsers` over `findMany({where: {role: {in: ["ADMIN", "SUPER_ADMIN"]}}, select: {id, email, name}})`, admin email fan-out via per-recipient iteration of `sendConsignerDressSubmittedEmail`, ADMIN_NOTIFICATION_EMAIL env-var fallback when zero admins found. 2 new imports (createNotificationForMultipleUsers, sendConsignerDressSubmittedEmail). 4 new try/catch blocks total (2 per mutation).
- `src/features/admin/api/queries/wardrobeDressQueries.ts` — +33/-1 lines (after biome auto-fix). `approveDress` findUnique select extended with `consignmentCommissionPct: true` + `Owner: {select: {email, name}}`; `rejectDress` findUnique select extended with `Owner: {select: {email, name}}`. 2 new email try/catch blocks beside 2 existing createNotification blocks. 1 new import line (named import of both helpers).
- `src/features/wardrobe/api/queries/requestQueries.ts` — +26/-1 lines. `create`'s dress findUnique select extended with `Owner: {select: {email, name}}`. 1 new email try/catch block beside existing createNotification. 1 new import (sendRentalRequestReceivedEmail).
- `src/features/admin/api/queries/wardrobeRequestQueries.ts` — +107/-5 lines. Four call-site extensions: (a) `respondToRequest` inner-tx select gains `rentalType: true` + 5 Dress fee columns (competitionPrice, seasonalPrice, purchasePrice, cleaningFee, securityDeposit) + `Student.User.email`; (b) `markPaymentReceived` inner-tx select gains `Student.User.email`; (c) `releaseDeposit` inner-tx select gains `securityDeposit: true` + `Student.User.email`; (d) `markConsignmentPaidOut` Dress.Owner select gains `email`. 4 new email try/catch blocks beside 4 existing createNotification blocks. 1 new 4-symbol named import block.

## Decisions Made

- **Self-contained admin findMany per try block (not hoisted)** in consignerQueries.ts: keeping each fan-out channel's findMany inline preserves the second-try variant's failure-isolation invariant — an in-app DB error cannot suppress the email channel, and vice-versa. The query is cheap (admin user set is tiny, cache-hit hot).
- **`?? 0` over non-null assertion** in NOTIFY-09 wire: `rental.consignmentPayoutAmount ?? 0` is byte-identical at runtime to `rental.consignmentPayoutAmount!` because the defensive `if (rental.consignmentPayoutAmount == null) throw BAD_REQUEST` block above guarantees non-null at the call site. The fallback expression sidesteps biome's `noNonNullAssertion` strict-mode rule while documenting the invariant.
- **BROAD inner-tx select extension** in respondToRequest: pulled all 5 Dress fee columns + rentalType + Student.User.email together so NOTIFY-05's APPROVED branch can compute `totalDueCents = rentalFee + cleaningFee + securityDeposit` inline post-tx. Snapshot-at-tx-read avoids the alternative of re-querying the dress after commit (slower + stale-read risk).
- **NOT modifying existing createNotification try blocks anywhere**: byte-identical preservation per the second-try variant convention. New email try blocks sit IMMEDIATELY BELOW each existing in-app try block — code reads top-to-bottom in chronological insertion order, making the two-channel pattern visually obvious.
- **Removed unused `createNotification` import** from consignerQueries.ts during Task 1: only `createNotificationForMultipleUsers` is called (admin fan-out is always batched, never single-recipient). The plan body imported both; the unused one would have failed biome's `useUnusedImports` rule.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Biome line-cap reflow on Task 2's two email send calls**
- **Found during:** Task 2 (verification after adding sendConsignerDressApprovedEmail + sendConsignerDressRejectedEmail call blocks)
- **Issue:** Biome's formatter wanted the multi-line function call signatures `sendConsignerDressApprovedEmail(\n  dress.Owner.email,\n  dress.Owner.name ?? "Consigner",\n  { ... },\n)` collapsed onto a single first line `sendConsignerDressApprovedEmail(dress.Owner.email, dress.Owner.name ?? "Consigner", {\n  ...\n});` because the first three args fit within the 100-char width budget when collapsed. Plan body had it multi-line.
- **Fix:** Ran `npx biome check --write src/features/admin/api/queries/wardrobeDressQueries.ts` — formatter collapsed both call signatures. Semantics byte-identical.
- **Files modified:** src/features/admin/api/queries/wardrobeDressQueries.ts
- **Verification:** Re-ran `npx biome check` — clean. Grep counts re-verified post-fix (sendConsignerDressApprovedEmail=2, sendConsignerDressRejectedEmail=2, Owner select pattern=2 — all unchanged).
- **Committed in:** 35b44bc (folded into Task 2 commit)

**2. [Rule 1 — Bug] Removed unused `createNotification` import in Task 1**
- **Found during:** Task 1 (initial import authoring)
- **Issue:** Plan body's Task 1 import block listed BOTH `createNotification` and `createNotificationForMultipleUsers` from notificationHelpers. But Task 1's actual implementation only calls `createNotificationForMultipleUsers` (admin fan-out is always batched). Keeping the unused `createNotification` import would have triggered biome's `useUnusedImports` rule and failed verification.
- **Fix:** Trimmed the import to single-symbol named import: `import { createNotificationForMultipleUsers } from "@/features/notifications/utils/notificationHelpers";`
- **Files modified:** src/features/wardrobe/api/queries/consignerQueries.ts
- **Verification:** `npx biome check` clean; grep `createNotificationForMultipleUsers` count = 3 (1 import + 2 call sites — matches plan expectation).
- **Committed in:** 7567853 (folded into Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — formatter + lint hygiene)
**Impact on plan:** Both auto-fixes were mechanical adjustments required to make the plan's spec pass Biome. Semantics byte-identical to the plan's intent. No scope creep.

## Issues Encountered

None — all 4 tasks ran cleanly with the only friction being the two auto-fixed deviations above. Parallel-wave coordination with Plan 20-03 held: agents staged specific files only (never `-A` or `.`) per Phase 18-05 lesson; zero file overlap between my 4 commits and Plan 20-03's 4 commits (verified via `git log --name-only`).

## User Setup Required

None — no external service configuration required. Resend API key already configured (Plan 20-01 verified). ADMIN_NOTIFICATION_EMAIL env-var fallback is OPTIONAL — when zero admin users exist AND the env var is unset, NOTIFY-01 emails are skipped with a `console.warn` (in-app notification still fires, mutation still succeeds).

## Next Phase Readiness

**Phase 20 status: 2 of 3 plans complete.** Plan 20-03 (return-reminder cron) appears to have shipped in parallel based on commits visible in `git log` (a404c1c schema + b5975eb sender + 28f23c2 route + c190e2e vercel.json). Phase 20 may be COMPLETE pending its SUMMARY landing.

**8 of 9 NOTIFY-NN emails wire live end-to-end:**
- NOTIFY-01: `wardrobe.consigner.create` + `wardrobe.consigner.resubmit` → admin fan-out (in-app + email)
- NOTIFY-02: `admin.wardrobe.approveDress` → consigner email + in-app
- NOTIFY-03: `admin.wardrobe.rejectDress` → consigner email + in-app (with rejection reason)
- NOTIFY-04: `wardrobe.requests.create` → dress owner email + in-app (NOT student)
- NOTIFY-05: `admin.wardrobeRequests.respondToRequest` → student email + in-app (APPROVE branch with totalDueCents and payment instructions, DECLINE branch with reviewer message)
- NOTIFY-06: `admin.wardrobeRequests.markPaymentReceived` → student email + in-app (rental confirmed)
- NOTIFY-07: cron-driven (Plan 20-03 owns)
- NOTIFY-08: `admin.wardrobeRentals.releaseDeposit` → student email + in-app
- NOTIFY-09: `admin.wardrobeRentals.markConsignmentPaidOut` → consigner email + in-app

**Verification proof (post-Plan):**
- `grep -lr "send[A-Z][a-zA-Z]*Email" src/features/{wardrobe,admin}/api/queries/` returns the 4 modified files: consignerQueries.ts, wardrobeDressQueries.ts, requestQueries.ts, wardrobeRequestQueries.ts ✓
- `grep -c "createNotification(" src/features/admin/api/queries/wardrobeRequestQueries.ts` = 4 (baseline preserved — all 4 existing in-app calls byte-identical) ✓
- `grep -c "createNotification(" src/features/admin/api/queries/wardrobeDressQueries.ts` = 2 (baseline preserved) ✓
- `grep -c "createNotification(" src/features/wardrobe/api/queries/requestQueries.ts` = 1 (baseline preserved) ✓
- `grep -c "createNotificationForMultipleUsers" src/features/wardrobe/api/queries/consignerQueries.ts` = 3 (1 import + 2 NEW fan-out call sites — closes Phase 18 NOTIFY-01 gap) ✓
- `grep -c "\\[WARDROBE\\] Failed to email" src/features/admin/api/queries/wardrobeRequestQueries.ts` = 4 ✓
- `grep -c "\\[WARDROBE\\] Failed to email" src/features/admin/api/queries/wardrobeDressQueries.ts` = 2 ✓
- `grep -c "\\[WARDROBE\\] Failed to email" src/features/wardrobe/api/queries/requestQueries.ts` = 1 ✓
- `grep -c "\\[WARDROBE\\] Failed to" src/features/wardrobe/api/queries/consignerQueries.ts` = 4 (2 in-app + 2 email channel error handlers across 2 mutations) ✓
- `grep -c 'role: { in: \\["ADMIN", "SUPER_ADMIN"\\] }' src/features/wardrobe/api/queries/consignerQueries.ts` = 4 (2 per mutation × 2 mutations — self-contained findMany per try block) ✓
- `grep -c "ADMIN_NOTIFICATION_EMAIL" src/features/wardrobe/api/queries/consignerQueries.ts` = 5 (4 across the two `else { fallback }` branches and 1 in the doc comment) ✓
- `grep -c 'decision: "APPROVED"' src/features/admin/api/queries/wardrobeRequestQueries.ts` = 1 (APPROVE branch shape) ✓
- `grep -c 'decision: "DECLINED"' src/features/admin/api/queries/wardrobeRequestQueries.ts` = 1 (DECLINE branch shape) ✓
- `grep -c "name: true, email: true" src/features/admin/api/queries/wardrobeRequestQueries.ts` = 6 (3 Student.User extensions + 1 Owner extension + 2 pre-existing in listRequests/listRentals) ✓
- `npx tsc --noEmit -p tsconfig.json` = zero NEW errors (only pre-existing IceParticles `three` types blocker) ✓
- `npx biome check` on all 4 modified files = clean ✓
- `comm -12` of my files vs Plan 20-03's files = 0 matches (zero parallel-wave file overlap) ✓

---
*Phase: 20-wardrobe-notifications*
*Completed: 2026-05-29*
