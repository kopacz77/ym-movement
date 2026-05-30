# Phase 21: Testing, Seeding & Health Checks - Research

**Researched:** 2026-05-29
**Domain:** Playwright E2E + Vitest unit tests + Storybook/MSW VRT + Prisma seed + Next.js Route Handler
**Confidence:** HIGH (all findings verified against repo source)

## Executive Summary

Phase 21 wraps the wardrobe MVP by closing the testing, observability, and bootstrap gaps left by phases 13-20. Every infrastructure piece this phase needs already exists in the repo with an established pattern: Playwright is configured with role-based `storageState` files (super-admin/coach/coach2/student), Vitest is wired with jsdom + a `src/test/setup.ts` mock harness, Storybook uses `msw-storybook-addon` to stub TRPC at `/api/trpc/*` with `http.get` handlers, and `/api/health/data` is a thin Route Handler returning `{status, timestamp, counts, warnings?}`. Seed pattern is `tsx scripts/<name>.ts` with idempotent `prisma.*.upsert` calls.

The phase is wide but well-bounded. All nine STORY-01 components map cleanly to existing files (one naming correction needed: `ConsignmentEarningsTable` → `ConsignerEarningsTable`, `MeasurementEditor` → `MeasurementForm`). The unit-test surface is two pure functions in `src/features/wardrobe/lib/fitScore.ts` plus the private `computeConsignmentPayout` in `wardrobeRequestQueries.ts` (must be exported to be testable). E2E will reuse the existing 4-role auth pattern verbatim; the only new auth piece is a "consigner" persona, which is the student role with a Dress they own (no schema change — any User can be a Dress.Owner per design spec).

**Primary recommendation:** Split into 5 plans (seed+health, unit tests, E2E rental + permissions, E2E consigner, Storybook + VRT). Add a sixth plan only if Storybook count exceeds ~10 new stories. Use `page.route()` to mock email/blob endpoints rather than MSW (MSW is Storybook-only here). Spec lives at `tests/wardrobe.spec.ts` — NOT `tests/e2e/wardrobe.spec.ts` (the repo flattens specs into `tests/` despite the design doc's path).

## E2E Infrastructure Audit

### Test directory layout (corrects design-spec path assumption)
- Playwright `testDir: "./tests"` — specs are FLAT in `tests/*.spec.ts`, no `tests/e2e/` subfolder
- Helpers: `tests/helpers/{test-utils.ts, seed-test-data.ts}`
- Auth setup: `tests/auth.setup.ts` (matched by `testMatch: /auth\.setup\.ts/`)
- StorageState dir: `playwright/.auth/{super-admin,coach,coach2,student}.json`
- VRT spec: `tests/storybook-vrt.spec.ts` (uses separate `playwright-storybook.config.ts`)

**Action:** Spec MUST be at `tests/wardrobe.spec.ts`, not `tests/e2e/wardrobe.spec.ts`. The phase success criteria need this path correction (design doc says `tests/e2e/`; reality is `tests/`). Run target stays `pnpm test:e2e tests/wardrobe.spec.ts`.

### test-utils.ts API (very minimal — by design)

Exports:
- `testData` — credential constants (admin, coach, coach2, coach3, coach4, student, rink)
- `loginAsSuperAdmin(page)` — goto /auth/login, fill, submit, wait for /admin/dashboard
- `loginAsAdmin` — alias for backward compat
- `generateTestEmail(prefix)` — unique email helper

**No** role-switch helpers, **no** "expect 403" helper, **no** truncate/reseed-between-tests helper, **no** API-only fetch helper. Tests do their own `page.route()` for TRPC intercepts (see `payment-reminder-email.spec.ts`).

### Auth/storageState pattern (auth.setup.ts)

The setup spec runs four named setup steps serially:
1. `setup("seed test data")` — invokes `npx tsx tests/helpers/seed-test-data.ts` via `child_process.execSync` (one-time seed before any logins)
2. `setup("authenticate as super admin")` — logs in via UI, persists `playwright/.auth/super-admin.json`
3. `setup("authenticate as coach")` — same for coach
4. Plus coach2 and student variants

Login = fill `input[id="email"]` + `input[id="password"]`, click submit, `waitForURL`, then `page.context().storageState({ path })`. 60s timeout — Next.js cold compilation. Setup runs `serial`, then per-spec/per-test tests run parallel up to 2 workers.

### DB-state strategy: ONE shared seed, idempotent upsert
- Seed runs ONCE per Playwright invocation (the seed-data setup step) before any storage states are saved
- Pattern: `prisma.user.upsert({ where: { email }, update: {...}, create: {...} })` — idempotent
- Tests do NOT reset between runs. They rely on either (a) data the seed created or (b) `page.route()` intercepts to inject synthetic responses
- For DELETE-then-create patterns inside the seed (e.g. cleaning prior test artifacts), the seed uses tightly-scoped `deleteMany({ where: { referenceCode: "TEST-..." } })` filters
- **Pattern to mirror for wardrobe**: seed creates a known consigner user, known dresses, known rental request in each lifecycle state; tests avoid creating data unless they own the cleanup

### Negative-path / permission tests (existing pattern, role-guards.spec.ts)
Permissions in this app are enforced via Next.js middleware proxy → SILENT REDIRECT, not 403/error pages. The pattern:
```ts
test.use({ storageState: "playwright/.auth/student.json" });
test("student redirected from /admin/dashboard", async ({ page }) => {
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });
});
```

**For TRPC-procedure-level negative paths** (e.g. student calls `admin.wardrobeRequest.respondToRequest` directly), there is NO existing helper. Two viable approaches for PERM-04:
1. **Route-based** (preferred — matches existing style): Verify the role can't reach the page that exposes the mutation button (e.g. student goes to `/admin/wardrobe/requests` → redirected away).
2. **API-call-based** (newer pattern): Use `page.request.post('/api/trpc/admin.wardrobeRequest.respondToRequest?batch=1', {...})` and assert response `error.data.httpStatus === 403`. Document this as the canonical PERM-04 pattern since some procedures (e.g. consigner read-of-other-dress) won't surface as a route redirect.

### Email mocking (existing pattern, payment-reminder-email.spec.ts)
Tests DO NOT hit Resend. Pattern:
```ts
await page.route("**/api/trpc/admin.payment.sendPaymentReminder*", async (route) => {
  await route.fulfill({ status: 200, contentType: "application/json", json: [{ result: { data: { json: {...} } } }] });
});
```
Wardrobe mutations send email via try/catch (non-blocking) — the mutation completes fine even if Resend throws. **For verifying "email was triggered", proxy via the in-app Notification row** that the same mutation creates synchronously inside the transaction (`createNotification` in wardrobeRequestQueries.ts). Notifications are visible at `/notifications` or via the bell-icon dropdown.

### TRPC response shape (critical for `page.route()` mocks)
Two shapes:
- Batched (default, `?batch=1`): `[{ result: { data: { json: {...} } } }]`
- Single: `{ result: { data: { json: {...} } } }`
- Error: `[{ error: { message, code: -32603, data: { code, httpStatus, path } } }]`
Always handle both. See `injectPendingPayment` in payment-reminder-email.spec.ts L49-88 for the canonical template.

## Unit Test Infrastructure

### Runner: Vitest
- Script: `pnpm test` (watch) or `pnpm test:run` (CI), `pnpm test:coverage`
- Config: `vitest.config.ts` — jsdom environment, `setupFiles: ["./src/test/setup.ts"]`, glob `**/*.{test,spec}.{ts,tsx,...}`, EXCLUDES `tests/**` (Playwright) and `**/*.disabled/**`
- Workers capped at 2 threads — WSL OOM concern
- Alias `@/` → `./src`

### Existing __tests__ patterns
- `src/lib/__tests__/pricing.test.ts` — pure function tests, factory helpers, deeply nested `describe` blocks
- `src/app/auth/login/__tests__/page.test.tsx` — component test with RTL
- `src/features/admin/components/coaches/management/__tests__/EditCoachPricingDialog.test.tsx` — dialog component test
- Convention: `__tests__/` subfolder alongside the module under test

### setup.ts (already mocked for you)
- jest-dom matchers
- `next/navigation` (router/searchParams/pathname/redirect)
- `next-auth/react` (useSession, signIn/signOut, SessionProvider)
- `next/dynamic` (returns simple component)
- `global.fetch`, IntersectionObserver, ResizeObserver, matchMedia, HTMLCanvasElement.getContext

### Module-isolation strategy for TEST-05
1. **`fitScore.ts` — easy.** Pure module, no Prisma/React imports. Add `src/features/wardrobe/lib/__tests__/fitScore.test.ts`. Cover: `passesFitsMeFilter`, `scoreDress`, `scoreToPercent`, `expectedDressLengthForHeight`. Key cases: null caller dims (MATCH), null dress dims (MATCH but penalty), alterable slack ±2cm, length-vs-height ±8cm tolerance, score clamp 0..100, negative score from all-null dress dims (-0.3).

2. **`consignmentPayoutAmount` — needs an export.** `computeConsignmentPayout` is `function` (not exported) inside `src/features/admin/api/queries/wardrobeRequestQueries.ts` L78-86. Refactor: extract to `src/features/wardrobe/lib/payout.ts` (new file), re-import in wardrobeRequestQueries.ts. Then test from `src/features/wardrobe/lib/__tests__/payout.test.ts`. Cover: 0% → null, 15% default → correct cents, 100% (theoretical) → 0, rounding behaviour (Math.round half-up, e.g. `5000 * 15 / 100 = 750` exact, `5375 * 15 / 100 = 806.25 → 806`), bug-regression case from any production payout discrepancy.

3. **DO NOT mock Prisma for these** — they're pure. The test surface is `(dress, rentalFee) → number | null`.

### Optional bonus: `fitCheckBars.ts`, `catalogFilters.ts`
Both are pure utilities. Worth including in same plan if budget permits — keeps the unit-test footprint tight.

## Storybook + VRT Infrastructure

### Config
- `.storybook/main.ts` — `stories: ["../src/**/*.stories.@(ts|tsx)"]`, framework `@storybook/nextjs-vite`, addons `addon-themes` + `addon-a11y`
- `.storybook/preview.tsx` — initializes MSW (`msw-storybook-addon`), wraps with `TRPCDecorator`, theme toggle, font wrapper
- `.storybook/decorators/TRPCDecorator.tsx` — wires `api.Provider` + `QueryClientProvider` with `httpBatchLink({ url: "/api/trpc", transformer: superjson })`

### MSW handler pattern (verified, SmartKPICards.stories.tsx)
```ts
import { HttpResponse, http } from "msw";

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/trpc/admin.analytics.getOverview*", () => {
          return HttpResponse.json([
            { result: { data: { activeLessons: 6, monthlyRevenue: 4850, ... } } },
          ]);
        }),
      ],
    },
  },
};
```

Note: SmartKPICards mock returns `{ data: {...} }` directly (no `.json` wrapper). This is because the story renders through TRPCDecorator's `httpBatchLink` which strips superjson on receive. **For procedures that pass complex types (Date, BigInt, null), the response MUST be wrapped in `data: { json: {...} }`** — see how production responses look. Pricing tip: use plain Date.toISOString() and Number cents to dodge the issue; alternatively use the `superjson.serialize()` output shape `{ json: ..., meta: {...} }`.

**For msw handlers that serve LIST queries**, the `*` glob handles batch encoding which appends `?batch=1&input=...`. Verify your handler URL pattern matches both batched and non-batched calls.

### Loading + Empty + High-Volume conventions (verified pattern)
Every story file in the repo defines 3-4 stories: `Default`, `Empty`, `Loading` (via `new Promise(() => {})` to keep query in-flight), and sometimes a volume variant. **Wardrobe stories should follow this convention.**

### Existing wardrobe story files
**ZERO `.stories.tsx` exist for any wardrobe component.** Search confirmed:
```bash
find src/features/wardrobe -name "*.stories.tsx" → []
```
All STORY-01 stories are NEW. No pre-existing partial work to integrate.

### VRT spec pattern (storybook-vrt.spec.ts)
```ts
const stories = [
  "ui-button--all-variants",
  "admin-dashboard-smartkpicards--default",
  // ...
];
for (const storyId of stories) {
  test(`VRT: ${storyId}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${storyId}&viewMode=story`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500); // animations/charts
    await expect(page).toHaveScreenshot(`${storyId}.png`);
  });
}
```
Story ID format: kebab-case of `meta.title` + `--` + kebab-case of story export name. Snapshots stored under `tests/storybook-vrt.spec.ts-snapshots/`. **1% diff tolerance** (`maxDiffPixelRatio: 0.01`).

### `/wardrobe` empty + populated VRT (STORY-03 nuance)
`/wardrobe` is a Next.js Route Handler-backed page, not a Storybook story. The existing VRT only screenshots Storybook iframes. Two options:
1. **Recommended:** Create a thin presentational shell `<CatalogGridPresentation dresses={...} />` story with MSW-mocked catalog. Two stories: `Empty` (zero dresses) + `Populated` (6 dresses). Keep behind a `Wardrobe/Catalog` storybook section. This stays in scope of existing VRT infra.
2. Alternative: Use `playwright.config.ts` (NOT storybook) to screenshot `/wardrobe` after seed — but this requires a second VRT spec file, mixes concerns, and tests page-level behaviour rather than visual coherence. Reject.

## Health Endpoint Shape

### Current `/api/health/data/route.ts` (60 lines, simple)
```ts
export async function GET() {
  try {
    const [users, students, rinks, timeSlots, lessons, payments] = await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.rink.count(),
      prisma.rinkTimeSlot.count(),
      prisma.lesson.count(),
      prisma.payment.count(),
    ]);
    const counts = { users, students, rinks, timeSlots, lessons, payments };
    const warnings: string[] = [];
    if (timeSlots === 0) warnings.push("RinkTimeSlot table is empty");
    if (lessons === 0) warnings.push("Lesson table is empty");
    if (payments === 0) warnings.push("Payment table is empty");
    return NextResponse.json({
      status: warnings.length > 0 ? "warning" : "healthy",
      timestamp: new Date().toISOString(),
      counts,
      ...(warnings.length > 0 && { warnings }),
    }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "error", timestamp, message: "Failed to query database" }, { status: 503 });
  }
}
```

### Extension for TEST-07
Add `dresses`, `rentalRequests`, `rentals` to the destructured Promise.all + `counts` object. Decision: **do NOT emit warnings when these are 0** — wardrobe is opt-in and a fresh tenant should not flag yellow. Note: design spec uses `dresses` (plural lowercase), `rentalRequests`, `rentals` — match this exactly. Notification count is **not** in the current endpoint despite memory mentioning it, so wardrobe additions are purely additive.

### Notification model: not in counts
The phase context mentioned Notification was in the current endpoint. Verified: it is NOT. No action needed for notifications in this task.

## Seed Script Strategy

### Existing seed scripts pattern (multiple, all `scripts/<name>.ts`)
- `scripts/seed-video-lesson-rink.ts` — small, focused, exits cleanly
- `tests/helpers/seed-test-data.ts` — large, idempotent upserts, prints progress
- Run with `tsx scripts/<name>.ts` directly OR add to package.json scripts as `seed:wardrobe`

### Pattern to mirror
- Import `PrismaClient` from `@prisma/client`; instantiate once at module scope
- Top-level `main()` async function
- **Guard first thing:** refuse to run if `process.env.NODE_ENV === "production"` unless an explicit override env var (e.g. `ALLOW_PROD_SEED=1`) is set
- Idempotent: upsert by stable natural key (e.g. title + ownerId)
- Print progress per fixture
- `main().catch(console.error).finally(() => prisma.$disconnect())`

### Production guard (CRITICAL — REQ states "Seed script must NEVER run in production")
Two-layer guard:
1. **Env check:** `if (process.env.NODE_ENV === "production")` — fail closed unless explicit `ALLOW_PROD_SEED=1`
2. **DB URL inspection:** check `process.env.DATABASE_URL` does NOT contain the production Neon project ID. Hard to keep accurate, so prefer env-check + npm script naming convention (`seed:wardrobe:dev`).

### Placeholder images (CRITICAL decision)
**No fixture image directory exists in the repo.** Wardrobe images flow through `src/app/api/wardrobe/upload/route.ts` → Vercel Blob. URLs are stored as `DressImage.url` strings. Three options:
1. **`https://picsum.photos/seed/<dress-id>/600/800` (RECOMMENDED).** Stable URLs, deterministic by seed, free, no upload step, no Blob storage burned. Six dresses → six unique seeds. Works because the schema stores arbitrary URLs.
2. **Vercel Blob upload at seed time.** Heavy: requires API calls, costs storage. Overkill for 6 placeholder images.
3. **Check in to `public/seed/wardrobe/*.jpg` and reference `/seed/wardrobe/dress-1.jpg`.** Adds ~500KB-2MB to repo. Acceptable but inferior to picsum for stable random-looking variety.

**Recommendation: picsum.photos.** Add 3 images per dress (sortOrder 0/1/2, first isPrimary). Document URL pattern in the seed script comment so it's clear they're external placeholders.

### Six-dress fixture distribution (matches DressCategory enum)
- CLASSICAL × 2 (one Yura-owned, one consigned)
- DRAMATIC × 1 (consigned)
- THEMED × 1 (Yura-owned)
- ICE_DANCE_PARTNER × 1
- ICE_DANCE_SINGLE × 1

All AVAILABLE status. Vary size ranges to demonstrate "fits me" filter behaviour against the seeded student measurements (heightCm=160, chestCm=86, waistCm=68, hipsCm=92).

## Open Questions Answered

| # | Question | Answer |
|---|---|---|
| 1 | test-utils.ts API | Minimal: `testData`, `loginAsSuperAdmin`, `loginAsAdmin`, `generateTestEmail`. No DB-reset helper. Use this verbatim; mirror with `loginAsCoach`, `loginAsStudent` only if needed (storageState makes them mostly unnecessary). |
| 2 | DB state between tests | NOT reset. One global seed-data setup step runs idempotent upserts. Wardrobe seed in auth.setup.ts: add a sibling setup step that runs a new `tests/helpers/seed-wardrobe-test-data.ts` script OR extend the existing seed-test-data.ts file (preferred — keeps single seed entry point). |
| 3 | "Expect 403" pattern | None exists. Two options: (a) URL-redirect assert (`toHaveURL`), (b) direct API call via `page.request.post('/api/trpc/...')` and assert `body[0].error.data.httpStatus === 403`. Use (a) for page-guarded routes, (b) for TRPC procedures that don't have a route boundary. |
| 4 | MSW pattern | `http.get("*/api/trpc/<router>.<procedure>*", () => HttpResponse.json([{ result: { data: { json: {...} } } }]))`. Use `*` prefix for batched URL handling. Three example handlers to reference: SmartKPICards (analytics.getOverview), CoachUpcomingLessons, ActivityFeed. |
| 5 | STORY-01 component names | See reconciliation table below. Mismatches: `ConsignmentEarningsTable` → `ConsignerEarningsTable`, `MeasurementEditor` → `MeasurementForm`. All other STORY-01 names match exactly. None have existing stories. |
| 6 | MeasurementEditor name | Actual: `src/features/wardrobe/components/MeasurementForm.tsx`. Confirmed via find. |
| 7 | Placeholder images | Use `https://picsum.photos/seed/<id>/600/800`. No repo fixtures, no Blob upload required, schema accepts arbitrary URLs. |
| 8 | Unit test runner | **Vitest.** `pnpm test:run`. Existing example: `src/lib/__tests__/pricing.test.ts`. Convention: `__tests__/` subfolder. |
| 9 | Health endpoint shape | `{ status: "healthy" \| "warning" \| "error", timestamp: ISO, counts: {table: number, ...}, warnings?: string[] }`, status 200 normal / 503 on db error. Add `dresses`, `rentalRequests`, `rentals` to counts. Do NOT add wardrobe to warnings (wardrobe is opt-in, empty is valid). |
| 10 | Skip seed in prod | Two-layer guard: `process.env.NODE_ENV !== "production"` AND optional `ALLOW_PROD_SEED=1` override. Plus discipline of naming script `seed-wardrobe:dev` in package.json so devs can't fat-finger. **Critical to enforce** given the 2026-04-05 + 2026-04-24 data wipe history. |
| 11 | Permissions matrix doc | Yes — `docs/plans/2026-05-28-ym-wardrobe-mvp-design.md` L490-507 has the full table. PERM-04 maps to verifying these rows. See "Permissions matrix targets for PERM-04" below. |
| 12 | Email mocking | **No email helper, no preview.** Existing tests do not mock email — wardrobe mutations swallow Resend errors in try/catch. To verify "email fired", proxy via the `Notification` row created in the same transaction (more reliable, no Resend dependency). For belt-and-suspenders, intercept the TRPC mutation response and assert success status. |
| 13 | Plan breakdown | 5 plans recommended (details below). Phase 21 is wide but not deep — each plan is 3-6 tasks. |

## Permissions Matrix Targets for PERM-04 (from design spec L490-507)

Negative paths to test (highest-leverage subset):
1. **STUDENT cannot approve rental request** — call `admin.wardrobeRequest.respondToRequest` from student role → expect 403
2. **STUDENT cannot mark payment received** — call `admin.wardrobeRequest.markPaymentReceived` → expect 403
3. **STUDENT cannot create dress with full fields** (bypass-approval path) — `admin.wardrobeDress.create*` → expect 403
4. **CONSIGNER cannot edit another consigner's dress** — call `wardrobe.consigner.update` with someone else's dressId → expect 403/NOT_FOUND
5. **COACH cannot approve rental request** (admin-only action) — same as #1 from coach role → expect 403
6. **STUDENT cannot view consigner earnings** — GET `/wardrobe/consigned?tab=earnings` for non-owner → empty state OR redirect (verify which by inspecting route)
7. **STUDENT cannot edit global wardrobe settings** — `admin.wardrobeSettings.update` → expect 403
8. **CONSIGNER cannot see other consigners' dresses in their consigned tab** — query `wardrobe.consigner.myDresses` → assert response contains only own ownerId

## Component Name Reconciliation (STORY-01)

| STORY-01 Spec Name | Actual Filename | File Path | Has Story? |
|---|---|---|---|
| DressCard | DressCard.tsx | `src/features/wardrobe/components/DressCard.tsx` | NO |
| DressDetailHero | DressDetailHero.tsx | `src/features/wardrobe/components/detail/DressDetailHero.tsx` | NO |
| FitCheckCard | FitCheckCard.tsx | `src/features/wardrobe/components/detail/FitCheckCard.tsx` | NO |
| MeasurementEditor | **MeasurementForm.tsx** | `src/features/wardrobe/components/MeasurementForm.tsx` | NO |
| RequestRentalDialog | RequestRentalDialog.tsx | `src/features/wardrobe/components/request/RequestRentalDialog.tsx` | NO |
| RentalStatusBadge | RentalStatusBadge.tsx | `src/features/wardrobe/components/request/RentalStatusBadge.tsx` | NO |
| ConsignmentEarningsTable | **ConsignerEarningsTable.tsx** | `src/features/wardrobe/components/consigner/ConsignerEarningsTable.tsx` | NO |
| WardrobeFilterBar | WardrobeFilterBar.tsx | `src/features/wardrobe/components/WardrobeFilterBar.tsx` | NO |
| PendingApprovalQueue | PendingApprovalQueue.tsx | `src/features/wardrobe/components/admin/PendingApprovalQueue.tsx` | NO |

**Two naming corrections required in the plan/spec to avoid downstream task confusion.**

## Plan Breakdown Recommendation

Five plans, organized by concern. Sized so each plan is 3-6 tasks, deps explicit. Wave assignment treats E2E specs as the latest gate (they need everything else).

### Plan 21-01: Seed Script + Health Endpoint Extension (Wave 1, parallel-safe)
**Tasks (~4):**
1. Create `src/features/wardrobe/lib/payout.ts` — extract `computeConsignmentPayout` (export it), update import in wardrobeRequestQueries.ts
2. Create `scripts/seed-wardrobe.ts` — 6 dresses across categories, picsum images, env guard, idempotent upserts. Add `seed:wardrobe:dev` npm script
3. Extend `src/app/api/health/data/route.ts` — add `dresses`, `rentalRequests`, `rentals` counts
4. Manual verification: run seed → /wardrobe shows 6 dresses; hit /api/health/data → new counts present
**depends_on:** none (foundation)
**wave:** 1

### Plan 21-02: Unit Tests (Wave 2, depends on 21-01 for payout.ts extract)
**Tasks (~3):**
1. Create `src/features/wardrobe/lib/__tests__/fitScore.test.ts` — cover passesFitsMeFilter, scoreDress, scoreToPercent, expectedDressLengthForHeight. Min 15 cases.
2. Create `src/features/wardrobe/lib/__tests__/payout.test.ts` — cover 0%/15%/100% commission, rounding, edge cases. Min 8 cases.
3. (Optional) Add `fitCheckBars.test.ts` + `catalogFilters.test.ts` if budget permits
**depends_on:** 21-01 (payout.ts must exist)
**wave:** 2

### Plan 21-03: E2E Rental Happy Path + Permissions (Wave 3)
**Tasks (~5):**
1. Extend `tests/helpers/seed-test-data.ts` with wardrobe data (a consigner test user, a known dress in each lifecycle state, a measurement profile for the test student)
2. Create `tests/wardrobe.spec.ts` describe-block "Rental Happy Path (TEST-01)" — student measurements → browse with fits-me → detail → request → admin approve → mark paid → mark returned → release deposit. Use notification proxy for email verification.
3. Add "Permission Negative Paths (PERM-04, TEST-04)" describe block — 5-8 negative tests using mix of URL-redirect and direct TRPC call assertions
4. Document the canonical `assertTrpcForbidden(page, procedure, input)` helper in `tests/helpers/test-utils.ts` (the missing piece — small new utility)
5. Verify `pnpm test:e2e tests/wardrobe.spec.ts` runs green locally
**depends_on:** 21-01 (seed exists)
**wave:** 3

### Plan 21-04: E2E Consigner Happy Path + Rejection (Wave 3, parallel to 21-03)
**Tasks (~4):**
1. Add "Consigner Happy Path (TEST-02)" — login as consigner persona → upload dress at `/wardrobe/consigned/new` → status PENDING_APPROVAL → switch to admin → approve → switch back, dress visible
2. Add "Consigner Rejection + Resubmit (TEST-03)" — same upload → admin rejects with reason → consigner sees notification → edits + resubmits → admin approves
3. Add "Consigner sees only own dresses" (PERM-04 isolation check) — consigner queries myDresses, only own ownerId present
4. Verify run via `pnpm test:e2e tests/wardrobe.spec.ts -g "Consigner"`
**depends_on:** 21-01
**wave:** 3

### Plan 21-05: Storybook Stories + VRT Snapshots (Wave 3, parallel to 21-03/04)
**Tasks (~5):**
1. Create stories for: DressCard, RentalStatusBadge, FitCheckCard, WardrobeFilterBar (simple presentational, 3-4 variants each)
2. Create stories for: DressDetailHero, MeasurementForm, RequestRentalDialog, PendingApprovalQueue, ConsignerEarningsTable (more complex, may need MSW handlers for nested TRPC queries)
3. Create stories for /wardrobe Empty + Populated states (CatalogGrid wrapper)
4. Update `tests/storybook-vrt.spec.ts` — append 11+ new story IDs to the `stories` array
5. Run `pnpm test:vrt` → generate baseline snapshots, commit them
**depends_on:** none structurally, but recommend after 21-01 so MSW handlers can use realistic fixture data shapes
**wave:** 3

**Optional Plan 21-06: VRT polish + flaky-test mitigation** — Only if VRT runs reveal flakiness (e.g. font loading, chart animations). Add explicit waits, mask volatile elements via `page.locator(...).mask()`, adjust tolerance per story.

## File-by-File Change List

### NEW files
- `scripts/seed-wardrobe.ts` (Plan 21-01)
- `src/features/wardrobe/lib/payout.ts` (Plan 21-01 — extracted from wardrobeRequestQueries.ts)
- `src/features/wardrobe/lib/__tests__/fitScore.test.ts` (21-02)
- `src/features/wardrobe/lib/__tests__/payout.test.ts` (21-02)
- `tests/wardrobe.spec.ts` (21-03, 21-04 share the file)
- `src/features/wardrobe/components/DressCard.stories.tsx` (21-05)
- `src/features/wardrobe/components/WardrobeFilterBar.stories.tsx` (21-05)
- `src/features/wardrobe/components/MeasurementForm.stories.tsx` (21-05)
- `src/features/wardrobe/components/detail/DressDetailHero.stories.tsx` (21-05)
- `src/features/wardrobe/components/detail/FitCheckCard.stories.tsx` (21-05)
- `src/features/wardrobe/components/request/RentalStatusBadge.stories.tsx` (21-05)
- `src/features/wardrobe/components/request/RequestRentalDialog.stories.tsx` (21-05)
- `src/features/wardrobe/components/admin/PendingApprovalQueue.stories.tsx` (21-05)
- `src/features/wardrobe/components/consigner/ConsignerEarningsTable.stories.tsx` (21-05)
- `src/features/wardrobe/components/CatalogGrid.stories.tsx` (21-05 — Empty + Populated, satisfies STORY-03)
- `tests/storybook-vrt.spec.ts-snapshots/wardrobe-*.png` × ~12 (21-05, baseline screenshots)

### MODIFIED files
- `src/app/api/health/data/route.ts` (21-01 — add 3 counts)
- `src/features/admin/api/queries/wardrobeRequestQueries.ts` (21-01 — replace inline `computeConsignmentPayout` with import from `@/features/wardrobe/lib/payout`)
- `package.json` (21-01 — add `seed:wardrobe:dev` script)
- `tests/helpers/seed-test-data.ts` (21-03 — extend with wardrobe consigner + measurement profile + lifecycle-state dresses; OR keep wardrobe seed separate via a new setup step in auth.setup.ts, decided in 21-03 task)
- `tests/auth.setup.ts` (21-03 conditionally — only if wardrobe seed is separate script)
- `tests/helpers/test-utils.ts` (21-03 — add `assertTrpcForbidden(page, procedurePath, input)` helper)
- `tests/storybook-vrt.spec.ts` (21-05 — append 11+ story IDs to `stories` array)

## Risks + Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Seed script runs against production | LOW (with guards), CATASTROPHIC | Two-layer env guard + named `seed:wardrobe:dev` script. Manual `pnpm db:check` before/after seed to verify counts. |
| Refactoring `computeConsignmentPayout` to a new module breaks production payout flow | MEDIUM | Behaviour-preserving extract: copy function, change `function` → `export function`, update 1 import. Cover with the new payout.test.ts BEFORE committing. Add a regression test for any production payout value already in the wild. |
| VRT snapshots flaky due to font loading / charts / animations | MEDIUM | Existing config has `networkidle` + 500ms wait. If still flaky, mask volatile selectors (`page.locator(...).mask()`) or bump `maxDiffPixelRatio` for specific stories. |
| MSW handler for batched TRPC URL doesn't match | MEDIUM | Use `*/api/trpc/<router>.<proc>*` glob; explicitly test single and batched shapes. Reference SmartKPICards.stories.tsx as canonical template. |
| Email verification proxy via Notifications doesn't catch silent email failure | LOW | Email failures are non-blocking by design; the goal is to verify the mutation completed correctly, not that Resend delivered. Notification row is the proper proxy. Add a separate integration test (deferred to v2.1) if real email observability is needed. |
| Permission negative tests miss a procedure | MEDIUM | Build a checklist from `docs/plans/2026-05-28-ym-wardrobe-mvp-design.md` L490-507 matrix. Treat each non-empty cell as a test case. Use the matrix as the source of truth in the plan. |
| Phase 21 ships with consigner data leak (consigner sees other consigner's dresses) | LOW-MEDIUM | This is exactly what PERM-04 / TEST-04 catches. Make this the FIRST negative test written and run during plan execution. |
| Storybook story for /wardrobe Empty state requires Next.js routing | LOW | Reject Option 2 (route-based VRT). Use CatalogGrid presentational wrapper with MSW. If wrapper doesn't cleanly separate, extract a `CatalogGridPresentation` component as part of this task. |
| Picsum images go 404 / are blocked in CI | LOW-MEDIUM | Picsum has 99.9% uptime since 2014. Mitigation: catch image-load errors gracefully in DressCard; alternatively pre-cache a few JPGs in `public/seed/wardrobe/` as fallback. Decide during 21-01. |

---

## Sources

### Primary (HIGH confidence — direct repo source)
- `/home/kopacz/projects/ym-movement/playwright.config.ts`
- `/home/kopacz/projects/ym-movement/playwright-storybook.config.ts`
- `/home/kopacz/projects/ym-movement/vitest.config.ts`
- `/home/kopacz/projects/ym-movement/tests/auth.setup.ts`
- `/home/kopacz/projects/ym-movement/tests/helpers/test-utils.ts`
- `/home/kopacz/projects/ym-movement/tests/helpers/seed-test-data.ts`
- `/home/kopacz/projects/ym-movement/tests/storybook-vrt.spec.ts`
- `/home/kopacz/projects/ym-movement/tests/role-guards.spec.ts`
- `/home/kopacz/projects/ym-movement/tests/payment-reminder-email.spec.ts`
- `/home/kopacz/projects/ym-movement/tests/data-isolation.spec.ts`
- `/home/kopacz/projects/ym-movement/.storybook/main.ts`
- `/home/kopacz/projects/ym-movement/.storybook/preview.tsx`
- `/home/kopacz/projects/ym-movement/.storybook/decorators/TRPCDecorator.tsx`
- `/home/kopacz/projects/ym-movement/src/app/api/health/data/route.ts`
- `/home/kopacz/projects/ym-movement/src/features/wardrobe/lib/fitScore.ts`
- `/home/kopacz/projects/ym-movement/src/features/admin/api/queries/wardrobeRequestQueries.ts` (L78-86 for computeConsignmentPayout)
- `/home/kopacz/projects/ym-movement/src/lib/__tests__/pricing.test.ts`
- `/home/kopacz/projects/ym-movement/src/features/admin/components/dashboard/SmartKPICards.stories.tsx`
- `/home/kopacz/projects/ym-movement/docs/plans/2026-05-28-ym-wardrobe-mvp-design.md` (L490-540, permissions + testing strategy)
- `/home/kopacz/projects/ym-movement/prisma/schema.prisma` (Dress, DressImage, RentalRequest, Rental, Settings, DressCategory/Status enums)
- `/home/kopacz/projects/ym-movement/scripts/seed-video-lesson-rink.ts` (seed script template)

### Confidence breakdown
- E2E infrastructure: **HIGH** — read every relevant file
- Unit test infrastructure: **HIGH** — vitest config + 3 existing test files reviewed
- Storybook + VRT: **HIGH** — main.ts, preview.tsx, TRPCDecorator, one example story, the VRT spec all read
- Health endpoint shape: **HIGH** — exact source read
- Seed strategy: **HIGH** — pattern verified across 2 existing seed scripts
- Component name reconciliation: **HIGH** — verified via find for all 9 component names
- Permissions matrix targets: **HIGH** — design spec L490-507 read directly
- Picsum image suggestion: **MEDIUM** — service is stable but external dependency; mitigation documented

**Research date:** 2026-05-29
**Valid until:** 2026-06-29 (stable infrastructure; only churn risk is if Storybook/Playwright/Vitest get major-version upgrades in phase 22+)
