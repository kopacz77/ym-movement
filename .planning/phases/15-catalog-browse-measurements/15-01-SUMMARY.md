---
phase: 15-catalog-browse-measurements
plan: 01
subsystem: api
tags: [trpc, prisma, zod, wardrobe, catalog, measurements, postgres]

# Dependency graph
requires:
  - phase: 13-wardrobe-foundation
    provides: Dress / DressImage / Rental / RentalRequest models, Student measurement columns, imageRouter
  - phase: 14-admin-inventory-crud
    provides: dressInputSchema reference, admin.wardrobe procedures, DressStatus palette
provides:
  - "wardrobe.list — filtered/sorted/paginated public catalog (AVAILABLE+PENDING only)"
  - "wardrobe.byId — single dress detail with NOT_FOUND on non-public statuses"
  - "wardrobe.facets — distinct colors + sizeLabels for filter UI hydration"
  - "wardrobe.measurements.{get, update} — caller-scoped student measurement profile"
  - "PUBLIC_DRESS_SELECT — single SQL-level CAT-08 enforcement point"
  - "catalogFilterSchema — shared Zod input contract for server + URL parsers"
  - "callerHasMeasurements flag in list response for client UI gating"
affects:
  - 15-02 (fitScore.ts wiring will replace TODO markers in catalogQueries.list)
  - 15-03 (Slider + image domain config — independent UI layer)
  - 15-04 (MeasurementForm consumes wardrobe.measurements.get/update)
  - 15-06 (WardrobeFilterBar consumes catalogFilterSchema + wardrobe.facets)
  - 15-07 (DressCatalogGrid consumes wardrobe.list with URL state)
  - 16    (detail page reuses wardrobe.byId + PUBLIC_DRESS_SELECT shape)
  - 17    (request flow checks availability against the same Rental/Request anti-join)
  - 18    (consigner views inherit CAT-08 enforcement model)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PUBLIC_DRESS_SELECT — explicit-allow-list Prisma.DressSelect satisfies pattern for CAT-08"
    - "Caller-scoped session lookup via ctx.prisma.student.findUnique({ where: { userId: ctx.session.user.id }})"
    - "Anti-join via { Rentals: { none: {...} } } + { Requests: { none: {...} } } combined with AND for date-range availability"
    - "Server-side defense-in-depth gates for measurement-dependent features (BAD_REQUEST before query, not after)"
    - "Two-query parallel facets via Promise.all + distinct + select"

key-files:
  created:
    - src/features/wardrobe/lib/catalogFilters.ts
    - src/features/wardrobe/api/queries/catalogQueries.ts
    - src/features/wardrobe/api/queries/measurementQueries.ts
  modified:
    - src/features/wardrobe/api/queries/index.ts

key-decisions:
  - "protectedProcedure (not new studentProcedure): no studentProcedure middleware exists; adding one for two files is premature; coaches/admins viewing /wardrobe see the same catalog (intentional per research Open Question 4)"
  - "themeTags filter uses hasSome exact-tag match (not raw SQL ILIKE) for MVP: cardinality is bounded, the facets endpoint will eventually drive autocomplete; ILIKE fallback documented as the upgrade path"
  - "In-memory pagination via slice() (not Prisma skip/take): result set is bounded by AVAILABLE+PENDING + filter where clauses; in-memory sort needed anyway for sort=bestFit (Plan 15-02), so two-phase fetch is simpler than mixing strategies"
  - "list/byId/facets mounted flat on wardrobeRouter root (matches design-doc spec L298-299); images/measurements remain nested sub-routers for namespace clarity"
  - "BAD_REQUEST gate for sort=bestFit AND fitsMe=true fires before any expensive query: 'set chest, waist, or hips' — matches the disabled-toggle client UX guarantee"
  - "callerHasMeasurements derived from (chestCm ?? waistCm ?? hipsCm) != null: any one of the three is sufficient to enable Best Fit per research Open Question 5"
  - "measurementsUpdatedAt stamped unconditionally on every update call (MEASURE-03): timestamp tracks 'last reviewed', not 'last mutated'"
  - "byId returns NOT_FOUND for any status outside AVAILABLE/PENDING: does NOT leak existence of ARCHIVED/REJECTED/PENDING_APPROVAL dresses to public callers"
  - "Wave 1 stubs sort=bestFit and fitsMe filter as no-op pass-throughs with TODO(15-02) markers: procedure is deployable before Plan 15-02 lands fitScore.ts"

patterns-established:
  - "Public-safe Prisma select declared once as a module-level constant, typed via `satisfies Prisma.DressSelect` to prevent silent widening when new columns are added"
  - "Filter input schema lives in lib/ (not in the queries file) so URL-state parsers can import it without dragging TRPC transport into the client bundle"
  - "Sub-routers compose into the feature router via spread destructuring at the queries/index.ts level — wardrobe.list flat, wardrobe.images.* nested — keeping the TRPC client call paths semantic rather than structural"

# Metrics
duration: 9min
completed: 2026-05-29
---

# Phase 15 Plan 01: Catalog & Measurement TRPC Procedures Summary

**Public-ish wardrobe.list/byId/facets + wardrobe.measurements.get/update with SQL-level CAT-08 enforcement via PUBLIC_DRESS_SELECT and a Rental/Request anti-join for date-range availability**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-05-29T15:51:28Z
- **Completed:** 2026-05-29T16:00:15Z
- **Tasks:** 4
- **Files modified:** 4 (3 created + 1 modified)

## Accomplishments

- Shipped the entire TRPC read surface that Plan 15-06 (filter bar) and Plan 15-07 (catalog grid) will call into — `wardrobe.list`, `wardrobe.byId`, and `wardrobe.facets` are live on the wardrobeRouter root.
- Locked CAT-08 (internalNotes + consignmentCommissionPct never returned) at the SQL `select` level via a single `PUBLIC_DRESS_SELECT` constant typed `satisfies Prisma.DressSelect`. Smoke-verified that the keys array excludes both fields.
- Implemented the CAT-03 availability anti-join: `Rentals: { none: { paymentStatus IN [AWAITING_PAYMENT, PAID] AND date-overlap } } AND Requests: { none: { status: APPROVED AND date-overlap } }`.
- Added the caller-scoped `wardrobe.measurements.get/update` pair with mandatory `measurementsUpdatedAt = new Date()` stamp on every save (MEASURE-03) and server-side BAD_REQUEST gates for `sort=bestFit` / `fitsMe=true` when the caller has no chest/waist/hips set (CAT-05 defense-in-depth).
- Created the shared `catalogFilterSchema` in `lib/catalogFilters.ts` so the server TRPC layer and the eventual client URL-state parsers (Plan 15-07) share a single Zod contract.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared catalog filter Zod schema** — `11f4f7c` (feat)
2. **Task 2: Create catalogQueries.ts (list, byId, facets)** — `0d1eed6` (feat)
3. **Task 3: Create measurementQueries.ts (get, update)** — `a5fe2df` (feat)
4. **Task 4: Mount catalog + measurement routers on wardrobeRouter** — `9c5c7de` (feat)

## Files Created/Modified

| File | Lines | Role |
|------|-------|------|
| `src/features/wardrobe/lib/catalogFilters.ts` | 54 | Shared Zod schema (catalogFilterSchema, sortOptionSchema, type aliases) |
| `src/features/wardrobe/api/queries/catalogQueries.ts` | 277 | PUBLIC_DRESS_SELECT + catalogRouter (list/byId/facets) |
| `src/features/wardrobe/api/queries/measurementQueries.ts` | 107 | measurementUpdateSchema + measurementRouter (get/update) |
| `src/features/wardrobe/api/queries/index.ts` | 24 | Mounts list/byId/facets flat + images/measurements nested |

`src/lib/root.ts` intentionally untouched — wardrobeRouter was already mounted during Phase 13.

## PUBLIC_DRESS_SELECT field list (CAT-08 enforcement)

The single SQL choke point. Every catalog procedure selects via this constant:

```
id, title, description, category, themeTags, color, secondaryColors, condition,
yearMade, sizeLabel, chestMinCm, chestMaxCm, waistMinCm, waistMaxCm, hipsMinCm,
hipsMaxCm, torsoMinCm, torsoMaxCm, lengthCm, alterableSmaller, alterableLarger,
competitionPrice, seasonalPrice, purchasePrice, securityDeposit, cleaningFee,
status, createdAt, updatedAt,
Owner: { id, name },
Images: { id, url, isPrimary, sortOrder } orderBy sortOrder asc
```

**Deliberately omitted:** `internalNotes`, `consignmentCommissionPct`, `archivedAt`, `ownerId`.

Smoke verified statically by enumerating `Object.keys(PUBLIC_DRESS_SELECT)` and asserting neither forbidden field is present.

## Availability anti-join WHERE clause (CAT-03)

When `input.availableFrom && input.availableTo` are both set:

```ts
where.AND = [
  {
    Rentals: {
      none: {
        AND: [
          { paymentStatus: { in: ["AWAITING_PAYMENT", "PAID"] } },
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      },
    },
  },
  {
    Requests: {
      none: {
        AND: [
          { status: "APPROVED" },
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      },
    },
  },
];
```

This excludes both confirmed-rental conflicts (paid or awaiting-payment) and approved-but-not-yet-paid requests. PENDING requests do NOT block — they are not yet binding.

## Smoke Test Results

End-to-end against dev Neon (script `scripts/smoke-phase-15-01.ts`, deleted after pass):

| # | Assertion | Result |
|---|-----------|--------|
| 1 | `wardrobe.list({})` returns `{ items, total, page, limit, callerHasMeasurements }` | PASS |
| 2 | First item keys exclude `internalNotes` + `consignmentCommissionPct` | N/A (0 dresses in dev DB; CAT-08 verified statically via PUBLIC_DRESS_SELECT keys) |
| 3 | `wardrobe.facets()` returns `{ colors: string[], sizeLabels: string[] }` | PASS |
| 4 | `wardrobe.measurements.update({ chestCm: 91 })` then `.get()` returns `chestCm=91` with `measurementsUpdatedAt` within 5s | PASS |
| 5 | `wardrobe.list({ sort: "bestFit" })` for a student with all-null measurements throws TRPCError code `BAD_REQUEST` | PASS |

Type-check: `npx tsc --noEmit` clean on all new files (pre-existing IceParticles.tsx + sidebar.tsx errors unchanged — documented as STATE.md blockers).

## TODO(15-02) markers placed

Plan 15-02 will replace these stubs with real `scoreDress` / `passesFitsMeFilter` wiring:

| Location | Current behavior | Plan 15-02 will install |
|----------|------------------|--------------------------|
| `catalogQueries.list` — `sort === "bestFit"` branch | Falls back to newest ordering | `result.sort((a, b) => scoreDress(b, m) - scoreDress(a, m))` |
| `catalogQueries.list` — `fitsMe === true` branch | No-op pass-through (gate already rejects no-measurement callers) | `result = result.filter(d => passesFitsMeFilter(d, callerMeasurements))` |

Both TODOs are inline comments at the relevant code sites. The BAD_REQUEST gates on `sort=bestFit` and `fitsMe=true` remain authoritative regardless of whether 15-02 has shipped.

## Decisions Made

See `key-decisions` in frontmatter for the full enumerated list. Highlights:

1. **`protectedProcedure` over a new `studentProcedure` middleware** — two procedures don't justify a new middleware; coaches/admins viewing `/wardrobe` see the same catalog by design.
2. **`hasSome` exact-tag match for `themeQuery`** — MVP simplicity; raw-SQL ILIKE is the documented fallback if users request substring search.
3. **In-memory pagination** — bounded result set + future bestFit sort requires the full set anyway; mixing skip/take with in-memory sort would complicate Plan 15-02 wiring.
4. **`list`/`byId`/`facets` flat on `wardrobeRouter` root** — matches the design-doc TRPC namespace spec; only `images.*` and `measurements.*` are nested.
5. **`measurementsUpdatedAt` stamped unconditionally** — timestamp tracks "last reviewed", not "last mutated"; lets the UI show a recency indicator that's honest even when values didn't change.
6. **`byId` 404s on non-public statuses** — does not leak the existence of ARCHIVED/REJECTED dresses to public catalog callers.

## Deviations from Plan

None — plan executed exactly as written. All 4 tasks completed in order, every artifact at or above its `min_lines` target, every must-have truth verified by smoke test or static check.

## Issues Encountered

Smoke script Assertion 5 reported FAIL on the first invocation while the actual TRPC procedure was throwing BAD_REQUEST correctly. Root cause: a stale state from a prior interrupted run had left the test student with `chestCm=91`; my smoke script's restoration logic ran cleanly on the second invocation. Verified via an isolated probe script that the procedure does emit `code: "BAD_REQUEST"` for a student with all-null measurements. No code change needed — the procedure was correct from Task 2.

Dev Neon has zero Dress rows (Phase 14 left a fresh inventory grid with no seed data), so Assertion 2's dynamic check (first item key inspection) was not exercised. CAT-08 is verified at the static `PUBLIC_DRESS_SELECT` keys level — which IS the actual enforcement layer — so the assertion is honored in spirit. When Phase 14 inventory gets populated, the next call to `wardrobe.list` will return rows with the guaranteed CAT-08-safe shape.

## User Setup Required

None for this plan. Phase 14's carried `BLOB_READ_WRITE_TOKEN` setup requirement still stands for end-to-end image testing once the catalog gets real images, but is not relevant to the TRPC procedures shipped here.

## Next Phase Readiness

**Ready for Plan 15-02 (fit-score module):**
- `catalogQueries.list` has TODO(15-02) markers at both the bestFit sort branch and the fitsMe filter branch — 15-02 needs only to import `scoreDress` / `passesFitsMeFilter` from `src/features/wardrobe/lib/fitScore.ts` and replace the no-op fallbacks.
- The `callerMeasurements` lookup is already in place above the TODOs; 15-02 reuses it directly.

**Ready for Plan 15-04 (measurement form):**
- `wardrobe.measurements.get` returns the exact `Pick<Student, measurement-columns>` shape the RHF form needs.
- `measurementUpdateSchema` is the same Zod schema the client form should validate against via `zodResolver` (matches the 14-04 single-source-Zod-reuse pattern).

**Ready for Plan 15-06 (filter bar):**
- `catalogFilterSchema` exports `categories`, `colors`, `sizeLabels`, `themeQuery`, `lengthCmMin/Max`, `priceMinCents/Max`, `availableFrom/To`, `fitsMe`, `sort`, `page`, `limit` with sensible defaults; URL-state parsers can `.partial().parse()` against it.
- `wardrobe.facets()` hydrates the color and sizeLabel chip groups dynamically.

**Ready for Plan 15-07 (catalog grid):**
- `wardrobe.list` returns `{ items, total, page, limit, callerHasMeasurements }`. The `callerHasMeasurements` field is the gate the Best Fit dropdown option and Fits Me toggle should consume client-side (defense-in-depth — server still rejects bad calls).
- All response items conform to `PUBLIC_DRESS_SELECT`; `DressCard` can type its props against the inferred shape.

**No blockers** for any downstream plan in this phase.

---
*Phase: 15-catalog-browse-measurements*
*Completed: 2026-05-29*
