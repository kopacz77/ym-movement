---
phase: 16-dress-detail-rental-request
plan: 01
subsystem: api
tags: [wardrobe, trpc, rental-request, prisma, zod, notification]

# Dependency graph
requires:
  - phase: 13-wardrobe-foundation
    provides: "getWardrobeSettings + wardrobeRentalRequestExpiryDays — source-of-truth for expiresAt derivation"
  - phase: 13-wardrobe-foundation
    provides: "Settings key/value JSON store with wardrobe defaults — never hardcode 7-day expiry (Pitfall 10)"
  - phase: 14-admin-wardrobe-inventory
    provides: "RentalRequest + Rental Prisma models with composite indexes on dressId + studentId + status/paymentStatus"
  - phase: 15-catalog-browse-measurements
    provides: "catalogQueries.ts L131-158 overlap predicate — anti-join shape that this plan mirrors byte-for-byte for checkAvailability + create re-check"
  - phase: 15-catalog-browse-measurements
    provides: "wardrobe.byId procedure — Wave 2 detail page (Plan 16-04) consumes both byId and requests procedures from the same router"
provides:
  - "wardrobe.requests.checkAvailability advisory query — anti-join overlap predicate for the date-picker UI"
  - "wardrobe.requests.create mutation — PENDING RentalRequest insert + in-app Notification to dress.ownerId + expiresAt from Settings + defense-in-depth re-check"
  - "wardrobe.requests.cancel mutation — PERM-03 caller-owns guard; flips PENDING to CANCELED; does NOT touch Dress.status"
  - "wardrobe.requests.mine query — caller's own RentalRequest history with Dress + primary image"
  - "wardrobe.requests.myRentals query — caller's own Rental history with Dress + primary image"
  - "createRequestSchema Zod export — reusable by RequestRentalDialog (Plan 16-05) for zero-drift client-side validation"
  - "CreateRequestInput type alias — z.infer wrapper for the create mutation input"
affects:
  - "16-04 (DressDetail page) — direct consumer of wardrobe.requests.checkAvailability + create via RequestRentalDialog mount"
  - "16-05 (RequestRentalDialog) — imports createRequestSchema for RHF validation; calls create mutation"
  - "16-06 (MyRentalsTabs / page) — direct consumer of mine + myRentals queries"
  - "16-07 (CancelRequestButton) — consumer of cancel mutation"
  - "17 (Admin Request Queue) — consumes the same RentalRequest table this plan writes into; APPROVED status from admin flow is what create + checkAvailability gate against"
  - "20 (Email notifications) — email layer reads from the in-app Notification rows this plan creates"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TRPC sub-router pattern for caller-scoped student-side queries — protectedProcedure + inline Student row guard via prisma.student.findUnique({ where: { userId: ctx.session.user.id } }), NO new middleware"
    - "Defense-in-depth availability checks: advisory checkAvailability query + canonical re-check inside create mutation using BYTE-IDENTICAL Prisma WHERE shape"
    - "Notification fire-and-log pattern: createNotification wrapped in try/catch with console.error fallback so notification infra failures cannot roll back a successful business mutation (extends bookingQueries.ts L389-403 pattern to wardrobe)"
    - "Status-mutation isolation: cancel does NOT touch Dress.status — only APPROVED requests hold the dress (Pitfall 3); future cancellation paths in Phase 17 (admin approval flow) own the Dress.status side-effects"
    - "Settings-as-source-of-truth: wardrobeRentalRequestExpiryDays sourced from getWardrobeSettings, NEVER hardcoded — admin can change the policy in one place"

key-files:
  created:
    - "src/features/wardrobe/api/queries/requestQueries.ts (402 lines — sub-router + createRequestSchema + 5 procedures)"
  modified:
    - "src/features/wardrobe/api/queries/index.ts (mount requests: requestsRouter adjacent to measurements)"

key-decisions:
  - "protectedProcedure throughout (NOT adminProcedure, NOT a new studentProcedure middleware) — caller is the requesting student; admins/coaches viewing the catalog see the same surface by design (research Pattern 3 — two procedures don't justify a new middleware)"
  - "Inline Student row guard via prisma.student.findUnique({ where: { userId: ctx.session.user.id } }) — same pattern as bookingQueries.ts:49, same pattern as Plan 15-01 list/byId"
  - "PERM-03 caller-owns enforcement on cancel via inline `request.studentId !== student.id` equality — no row-level RLS, no policy layer; explicit equality check is auditable and self-documenting"
  - "mine + myRentals return [] (empty array) when caller has no Student row, NOT FORBIDDEN — admins/coaches hitting /wardrobe/my-rentals see a graceful empty state instead of a confusing error"
  - "createRequestSchema EXPORTED from queries file so Wave 2 RequestRentalDialog (Plan 16-05) validates with the EXACT shape the server parses — zero schema duplication, drift structurally impossible. Same pattern as Plan 14-04's wardrobeSettingsSchema reuse"
  - "Overlap predicate inlined twice (once in checkAvailability, once in create's defense-in-depth re-check) NOT extracted to a shared helper — research recommendation Pattern 4: keep both clauses byte-identical and visible at their respective call sites. The repetition is the documentation. Future refactor only if a third caller emerges (Phase 17 admin override flow likely)"
  - "create includes a self-request rejection (Pitfall 9): if dress.ownerId === ctx.session.user.id, throw BAD_REQUEST. Pre-empts the admin-browses-own-listing edge case and the consigner-tests-with-own-account scenario"
  - "create's status gate accepts BOTH AVAILABLE and PENDING (NOT just AVAILABLE) — a dress with active PENDING requests is still browsable per Plan 15-01 PUBLIC_STATUSES and should still be requestable by other students. The approval flow in Phase 17 races multiple PENDING requests; until one is APPROVED, the dress remains open"
  - "Notification target is dress.ownerId (Yura or consigner), NOT ctx.session.user.id (the requester) — explicit inline comment at the createNotification call site references Pitfall 5 for traceability. Email notification intentionally deferred to Phase 20"
  - "RentalType enum imported via VALUE import (`import { RentalType }` not `import type { RentalType }`) — z.nativeEnum(RentalType) needs the runtime enum, not just the type"
  - "Created stub procedures for cancel/mine/myRentals in Task 1 that throw TRPCError NOT_IMPLEMENTED — kept the file compilable between tasks so Task 1's type-check could pass independently. Stubs replaced with full implementations in Task 2; final stub count = 0 (verified via grep)"

patterns-established:
  - "Wardrobe TRPC sub-router structure — requestQueries.ts mounts as `requests: requestsRouter` adjacent to measurements/images, matches Phase 13/14/15 sub-router precedent. Catalog list/byId/facets remain flat on the root per Phase 15 design-doc spec"
  - "5-procedure split for caller-scoped resource flows: checkAvailability (advisory pre-check) + create (insert with defense-in-depth) + cancel (caller-owns mutation) + mine (caller's own history of the resource) + myRentals (caller's own history of the downstream resource). Reusable shape for Phase 18 consigner application flow"
  - "Schema export convention: any Zod schema consumed by both server (TRPC input parser) AND client (RHF resolver) lives in the TRPC procedure file and is exported by name. Wave 2 dialog imports it directly — no shared schema package, no duplication"

# Metrics
duration: 9m 24s
completed: 2026-05-29
---

# Phase 16 Plan 01: Wardrobe Rental Request TRPC Sub-Router Summary

**Five protectedProcedure endpoints (checkAvailability/create/cancel/mine/myRentals) plus reusable Zod createRequestSchema; defense-in-depth overlap re-check inside create; in-app Notification to dress.ownerId; PERM-03 caller-owns guard on cancel + implicit on mine/myRentals; cancel never touches Dress.status (Pitfall 3); expiresAt sourced from getWardrobeSettings (no hardcoded 7-day default).**

## Performance

- **Duration:** 9m 24s
- **Started:** 2026-05-29T17:10:28Z
- **Completed:** 2026-05-29T17:19:52Z
- **Tasks:** 2 / 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Full requestsRouter at `src/features/wardrobe/api/queries/requestQueries.ts` (402 lines) — five procedures all covered by `protectedProcedure` with inline Student-row guards
- `wardrobe.requests` sub-router mounted in `wardrobe/api/queries/index.ts` adjacent to `measurements`; catalog `list/byId/facets` + `images` + `measurements` unchanged byte-for-byte
- Defense-in-depth: overlap anti-join (`Rental(AWAITING_PAYMENT|PAID) + RentalRequest(APPROVED)`) runs in BOTH `checkAvailability` (advisory) AND `create` (canonical) — byte-identical Prisma WHERE shape
- `createRequestSchema` exported with two `.refine()` rules (endDate > startDate; competitionDate inside [start, end]) — Wave 2 RequestRentalDialog imports the EXACT shape the server parses
- In-app `Notification` to `dress.ownerId` (Yura or consigner) wrapped in try/catch with `console.error` fallback so notification infra failures cannot roll back a successful request insert
- `cancel` procedure DOES NOT touch `Dress.status` — explicit inline comment cites Pitfall 3 (PENDING requests don't hold the dress; only APPROVED requests do, and that flow lives in Phase 17)
- `expiresAt` derived from `getWardrobeSettings(ctx.prisma).wardrobeRentalRequestExpiryDays` — never hardcoded

## Task Commits

Each task was committed atomically:

1. **Task 1: Create requestQueries.ts with checkAvailability + create procedures** — `03c7b5c` (feat)
2. **Task 2: Implement cancel + mine + myRentals; mount sub-router in index.ts** — `e8b020d` (feat)

**Plan metadata:** to follow this SUMMARY commit (docs)

## Files Created/Modified
- `src/features/wardrobe/api/queries/requestQueries.ts` — NEW. Sub-router with 5 procedures + `createRequestSchema` + `CreateRequestInput` type alias
- `src/features/wardrobe/api/queries/index.ts` — MODIFIED. Added `requestsRouter` import + `requests: requestsRouter` mount; expanded header comment to include the new sub-router

## Decisions Made
See `key-decisions` in frontmatter for the full list. Highlights:
- `protectedProcedure` (not `adminProcedure`, not a new `studentProcedure`) on all five procedures — research Pattern 3
- Overlap predicate inlined twice (NOT extracted to a shared helper) — the repetition is the documentation; both clauses must remain byte-identical with `catalogQueries.ts:131-158`
- `createRequestSchema` exported from the queries file for zero-duplication reuse by `RequestRentalDialog` in Plan 16-05
- `cancel` does NOT touch `Dress.status` — only APPROVED requests hold the dress (Phase 17 owns that side-effect)
- Self-request rejected in `create` via `dress.ownerId === ctx.session.user.id` check (Pitfall 9)
- Notification target is `dress.ownerId` (NOT requester — Pitfall 5); inline comment at call site references the pitfall for traceability

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `null as const` is not a valid TypeScript expression**
- **Found during:** Task 1 (`checkAvailability` return value typing)
- **Issue:** Plan's authoritative code spec had `return { available: true, reason: null as const };` — but TypeScript error `TS1355: A 'const' assertion can only be applied to references to enum members, or string, number, boolean, array, or object literals` because `null` is not in that allowed set.
- **Fix:** Rewrote as `return { available: true as const, reason: null };` — moved the `as const` assertion to the discriminating `available` literal (which IS in the allowed set) and let `null` widen normally. Discriminated union still discriminates correctly on the `available` field.
- **Files modified:** `src/features/wardrobe/api/queries/requestQueries.ts`
- **Verification:** `npx tsc --noEmit` clean (only pre-existing IceParticles three-types error remains, out of scope)
- **Committed in:** `03c7b5c` (Task 1 commit)

**2. [Rule 1 — Bug] Biome auto-format reflowed `create` mutation indentation**
- **Found during:** Task 2 (post-implementation lint pass)
- **Issue:** Biome flagged the `create` mutation body indentation — the plan's spec used 6-space inner indentation on a `.input(...).mutation(...)` chain, but Biome's printer prefers de-indenting the mutation body when the chain is short enough to fit on the procedure declaration line.
- **Fix:** Ran `npx biome check --write` on the two changed files; Biome reflowed the indentation. Logic untouched; behavior identical.
- **Files modified:** `src/features/wardrobe/api/queries/requestQueries.ts`
- **Verification:** `npx biome check src/features/wardrobe/api/queries/` reports "Checked 2 files. No fixes applied." Type-check clean.
- **Committed in:** `e8b020d` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bug fixes against type-checker / linter)
**Impact on plan:** Both fixes were mechanical — corrected literal-type misuse and accepted the project's canonical formatter pass. No semantic divergence from plan; all `must_haves.truths` invariants preserved exactly.

## Issues Encountered

- **`pnpm` script wrappers blocked by `ERR_PNPM_IGNORED_BUILDS`** — known recurring issue from Phase 13/14. Worked around by invoking `npx tsc --noEmit` and `npx tsx scripts/<file>.ts` directly. The smoke-test script ran cleanly via `npx tsx`.
- **`timeout` background-task harness ate the smoke-test stdout** — first attempt at backgrounded smoke test produced a 0-byte output file (likely a node child-process stdout buffering interaction with the harness). Re-ran in foreground with `timeout 30 npx tsx scripts/smoke-test-wardrobe-requests.ts` and captured the full output: settings load OK, expiresAt derivation OK, sample student fetch OK, `mine` + `myRentals` queries OK (empty results — dev DB has zero wardrobe inventory yet). Smoke-test script deleted after verification per the temp-script convention.

## Smoke Test Results (against dev Neon)

Ran a temporary `scripts/smoke-test-wardrobe-requests.ts` (deleted after) to validate the Prisma + Settings + Notification shapes the new procedures depend on:

```
[smoke] wardrobe settings: { defaultConsignmentCommissionPct: 15, wardrobeRentalRequestExpiryDays: 7, wardrobeReturnReminderDays: 1 }
[smoke] derived expiresAt: 2026-06-05T17:18:55.429Z   <-- (today + 7d)
[smoke] sample dress: null                              <-- (dev DB has no AVAILABLE/PENDING wardrobe inventory yet)
[smoke] sample student: { id: 'cmgy69bd40002jy09gzkr2snd', User: { name: 'Candice Leung' } }
[smoke] mine result count: 0
[smoke] myRentals result count: 0
[smoke] OK — all shapes verified against dev Neon
```

Settings come back with defaults (no row in the `Settings` table yet for `key="wardrobe"` — `getWardrobeSettings` fail-soft path returns `DEFAULTS` per Phase 13 ADR). expiresAt derivation works correctly. No AVAILABLE/PENDING dresses to exercise the overlap predicate against in dev — first end-to-end test of `checkAvailability` + `create` will land when Plan 16-04 (DressDetail page) is wired against a real dress.

## User Setup Required

None — no external service configuration introduced by this plan. The procedures use existing Phase 13 (Settings) + existing Phase 14 (Notification) infrastructure.

## Next Phase Readiness

- **Plan 16-04 (DressDetail page)** unblocked — it now has `wardrobe.byId` (15-01) for dress data + `wardrobe.requests.checkAvailability` (this plan) for the date-picker availability gate.
- **Plan 16-05 (RequestRentalDialog)** unblocked — imports `createRequestSchema` from this file for client-side RHF validation, calls `wardrobe.requests.create` on submit. Schema reuse means dialog validation is GUARANTEED to match server validation byte-for-byte.
- **Plan 16-06 (MyRentalsTabs)** unblocked — uses `wardrobe.requests.mine` for the "Requests" tab and `wardrobe.requests.myRentals` for the "Rentals" tab.
- **Plan 16-07 (CancelRequestButton)** unblocked — calls `wardrobe.requests.cancel` with the PERM-03 caller-owns guard already in place.
- **Phase 17 (Admin Request Queue)** prerequisite met — every RentalRequest row this plan inserts is visible to Phase 17's admin queue. Status state machine handoff is: PENDING (created here) → APPROVED/REJECTED (admin acts in Phase 17) → CANCELED (student acts via this plan's `cancel`, but only while still PENDING).
- **Carried concerns:** Pre-existing `IceParticles` three-types error still present in repo type-check baseline. Not introduced by this plan; should be triaged separately.

---
*Phase: 16-dress-detail-rental-request*
*Completed: 2026-05-29*
