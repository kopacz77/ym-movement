# Phase 15: Catalog Browse & Measurements - Research

**Researched:** 2026-05-29
**Domain:** Marketplace catalog (TRPC public reads, Prisma scalar-list filters, URL-state filter bar, range sliders, measurement-driven fit scoring)
**Confidence:** HIGH

## Summary

Phase 15 builds the student-facing wardrobe surface: a `/wardrobe` catalog list page, a `/wardrobe/measurements` profile page, and the supporting TRPC procedures. The good news: Phase 13 already shipped the entire data model (Dress structured sizing, Student measurement columns, RentalRequest/Rental for availability), Phase 14 established the URL-state filter pattern in `DressInventoryGrid`, and the brand primitives (`DressStatusBadge`, `CategoryBadge`, `StatusFilterChips`) already exist for reuse. There is no schema work in Phase 15 — only API + UI.

Three meaningful greenfield decisions stack up:

1. **Public catalog router** (`wardrobe.list`, `wardrobe.byId`) is greenfield. Mount under the existing `src/features/wardrobe/api/queries/` module as a `catalogQueries.ts` file, exposing both via `protectedProcedure` (matches the design spec: "students of YM only", and the route already lives under `(protected)`). Strip `internalNotes` server-side via Prisma `select` — never rely on client-side filtering.
2. **Fit scoring as a shared pure module** at `src/features/wardrobe/lib/fitScore.ts`. The server uses it for `sort=bestFit` (compute score in-memory after Prisma fetch — the algorithm is non-trivial SQL, and the result sets are bounded by pagination), and Phase 16's detail page will reuse it for the Fit Check card. No new dependency.
3. **Range slider** is a new UI primitive. Project does not currently install `@radix-ui/react-slider` — Phase 15 adds it (matches all other Radix wrappers already in `src/components/ui/`) and wraps it as `src/components/ui/slider.tsx`. This is the only new package.

**Primary recommendation:** Mirror the 14-05 `DressInventoryGrid` pattern wholesale for filter URL state — same `parseStatusesParam` style helpers, same `router.replace + scroll:false`, same default-value elision. Do NOT extract a shared "URL state hook" yet; two consumers (admin grid + student catalog) is below the abstraction threshold. Land the catalog as a single page that composes a sticky `WardrobeFilterBar` over a `DressCatalogGrid`, with `DressCard` as the per-tile primitive that Phase 18 can later reuse for the consigner "My listings" view.

## Standard Stack

The locked stack for this phase. All of these are already installed except `@radix-ui/react-slider`.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@trpc/server` + `@trpc/react-query` | v11 | API procedures + typed client hooks | Project standard; Phase 14 established the pattern (`api.admin.wardrobe.list.useQuery`) |
| Prisma | (project version) | DB access; `select` to strip `internalNotes`; scalar-list `hasSome`/`has` filters for `themeTags` | Already used everywhere |
| `react-day-picker` | ^9.11.3 | Date range picker via `<Calendar mode="range" />` | Already used in `TravelDateBlocker.tsx`; the project's `Calendar` wrapper at `src/components/ui/calendar.tsx` is the DayPicker wrapper |
| `date-fns` | 4.1.0 | Date formatting / comparison for availability filter normalization | Project standard |
| `@radix-ui/react-popover` | ^1.1.15 | Wraps the date range picker trigger | Already installed |
| `@radix-ui/react-switch` | ^1.2.6 | "Fits me" toggle | Already installed; wrapper at `src/components/ui/switch.tsx` |
| `@radix-ui/react-tooltip` | ^1.2.8 | Disabled-state tooltip on "Fits me" when measurements unset | Already installed; wrapper at `src/components/ui/tooltip.tsx` |
| `@radix-ui/react-select` | ^2.2.6 | Sort dropdown | Already installed |

### Supporting (already present, no new install)
| Library | Purpose | Where |
|---------|---------|-------|
| `next/navigation` (`useSearchParams`, `useRouter`) | URL-state filter persistence | Phase 14 `DressInventoryGrid` template |
| `useDebouncedState` | Debounced text input for theme search | `src/lib/context-utils.tsx:157` |
| `sonner` (`toast`) | Save confirmation on measurement update | Project standard |
| `react-hook-form` + `@hookform/resolvers/zod` | Measurements form validation | Used heavily in `DressForm.tsx`, `WardrobeSettingsForm.tsx` |
| `lucide-react` | Icons (`Ruler` for measurements, `Filter`, `X`, `ArrowUpDown`, `Shirt`) | Project standard |

### New install (only one)
| Package | Version | Reason |
|---------|---------|--------|
| `@radix-ui/react-slider` | ^1.3.x (latest 1.x) | Range sliders for length (cm) and price (cents). Confirmed via Radix docs: `<Slider.Root value={[min, max]}>` with two `<Slider.Thumb />` is the canonical two-thumb range pattern. |

Install:
```bash
pnpm add @radix-ui/react-slider
```

Then create `src/components/ui/slider.tsx` mirroring `switch.tsx` style:

```tsx
"use client";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-slate-200">
      <SliderPrimitive.Range className="absolute h-full bg-[#0891b2]" />
    </SliderPrimitive.Track>
    {props.value?.map((_, i) => (
      <SliderPrimitive.Thumb
        key={i}
        className="block h-4 w-4 rounded-full border-2 border-[#0891b2] bg-white shadow ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0891b2] disabled:pointer-events-none disabled:opacity-50"
      />
    ))}
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
```

### Alternatives Considered
| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| `@radix-ui/react-slider` | `rc-slider` or native `<input type="range">` | Native input is single-thumb only; rc-slider would diverge from the all-Radix UI primitive convention |
| In-memory bestFit sort | SQL window function / raw query | Algorithm requires per-row null-counting and arithmetic on min+max; a Prisma `findMany` with paginated take + in-memory score is simpler and the result set is bounded |
| `studentProcedure` middleware | `protectedProcedure` + inline guard | No `studentProcedure` exists today; introducing one for two files is premature. The two procedures that need "current student" simply do `ctx.prisma.student.findUnique({ where: { userId: ctx.session.user.id } })` and 404 if not found — exact pattern used in `bookingQueries.ts:49`. |

## Architecture Patterns

### Recommended Structure (greenfield + additive)

```
src/features/wardrobe/
├── api/queries/
│   ├── index.ts                  # MODIFIED: mount catalogRouter + measurementRouter
│   ├── catalogQueries.ts         # NEW: wardrobe.list, wardrobe.byId (public-ish reads)
│   ├── measurementQueries.ts     # NEW: wardrobe.measurements.get, .update
│   ├── imageQueries.ts           # existing
│   └── settingsQueries.ts        # existing (admin only)
├── lib/
│   ├── fitScore.ts               # NEW: pure functions — scoreDress(), passesFitsMeFilter()
│   ├── catalogFilters.ts         # NEW: shared zod schema for marketplace filter input
│   └── compressImage.ts          # existing
└── components/
    ├── DressCard.tsx             # NEW: tile primitive (image + badges + price + fit %)
    ├── DressStatusBadge.tsx      # existing — reuse
    ├── CategoryBadge.tsx         # existing — reuse
    ├── BestFitBadge.tsx          # NEW: "Best fit 87%" pill, only shown when measurements set
    ├── catalog/                  # NEW subfolder for student-facing components
    │   ├── DressCatalogGrid.tsx  # client component, owns URL state, renders WardrobeFilterBar + cards
    │   ├── WardrobeFilterBar.tsx # sticky filter row (category, color, size, theme, length, price, dates, fitsMe, sort)
    │   ├── CategoryFilterChips.tsx       # multi-select chip group for DressCategory enum
    │   ├── ColorFilterChips.tsx          # multi-select chip group (from distinct catalog colors)
    │   ├── SizeLabelFilterChips.tsx      # multi-select chip group (from distinct catalog sizeLabels)
    │   ├── RangeSliderField.tsx          # wraps Slider primitive with min/max labels
    │   ├── AvailabilityDateRange.tsx     # Popover-wrapped Calendar mode="range"
    │   ├── FitsMeToggle.tsx              # Switch + Tooltip; disabled when measurements unset
    │   └── SortSelect.tsx                # Select dropdown: Newest / Price↑ / Price↓ / Best Fit
    └── measurements/             # NEW subfolder
        ├── MeasurementForm.tsx           # the form rendered at /wardrobe/measurements
        └── UnitToggle.tsx                # per-field cm/in display switcher (cm canonical, in is display)

src/app/(protected)/wardrobe/
├── layout.tsx                    # NEW: wraps children in <AppLayout role="student">
├── page.tsx                      # REPLACED: renders <DressCatalogGrid />
└── measurements/
    └── page.tsx                  # NEW: renders <MeasurementForm />

src/components/ui/
└── slider.tsx                    # NEW: Radix slider wrapper (see above)
```

### Pattern 1: Public-ish TRPC procedure with `select` to strip internal fields

`internalNotes` is the canary that gates everything. Any catalog procedure MUST use Prisma `select` (not `include` with all fields) so the column is excluded at the SQL level. Never depend on client-side hiding.

```ts
// src/features/wardrobe/api/queries/catalogQueries.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { DressCategory, DressStatus, type Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { scoreDress, passesFitsMeFilter } from "@/features/wardrobe/lib/fitScore";

// PUBLIC-SAFE select: every field a student is allowed to see, internalNotes deliberately omitted.
const PUBLIC_DRESS_SELECT = {
  id: true,
  title: true,
  description: true,
  category: true,
  themeTags: true,
  color: true,
  secondaryColors: true,
  condition: true,
  yearMade: true,
  sizeLabel: true,
  chestMinCm: true, chestMaxCm: true,
  waistMinCm: true, waistMaxCm: true,
  hipsMinCm: true,  hipsMaxCm: true,
  torsoMinCm: true, torsoMaxCm: true,
  lengthCm: true,
  alterableSmaller: true,
  alterableLarger: true,
  competitionPrice: true,
  seasonalPrice: true,
  purchasePrice: true,
  securityDeposit: true,
  cleaningFee: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  Owner: { select: { id: true, name: true } },           // expose owner name (consigner attribution)
  Images: { orderBy: { sortOrder: "asc" as const }, select: { id: true, url: true, isPrimary: true, sortOrder: true } },
  // internalNotes: NEVER. consignmentCommissionPct: NEVER.
} satisfies Prisma.DressSelect;
```

### Pattern 2: Marketplace filter input schema (shared, declarative)

```ts
// src/features/wardrobe/lib/catalogFilters.ts
import { z } from "zod";
import { DressCategory } from "@prisma/client";

export const sortOptionSchema = z.enum(["newest", "priceAsc", "priceDesc", "bestFit"]);
export type SortOption = z.infer<typeof sortOptionSchema>;

export const catalogFilterSchema = z.object({
  categories: z.array(z.nativeEnum(DressCategory)).optional(),
  colors: z.array(z.string()).optional(),
  sizeLabels: z.array(z.string()).optional(),
  themeQuery: z.string().trim().optional(),
  lengthCmMin: z.number().int().nonnegative().optional(),
  lengthCmMax: z.number().int().nonnegative().optional(),
  priceMinCents: z.number().int().nonnegative().optional(),
  priceMaxCents: z.number().int().nonnegative().optional(),
  availableFrom: z.coerce.date().optional(),
  availableTo: z.coerce.date().optional(),
  fitsMe: z.boolean().default(false),
  sort: sortOptionSchema.default("newest"),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(48).default(24),
});
export type CatalogFilterInput = z.infer<typeof catalogFilterSchema>;
```

### Pattern 3: Status filter — AVAILABLE + PENDING only

CAT-01 specifies "AVAILABLE or PENDING dresses". PENDING means the dress has an approved-but-not-yet-paid request against it — still visible, but the detail page (Phase 16) will show a warning. PENDING_APPROVAL/REJECTED/ARCHIVED/RENTED/MAINTENANCE are ALL hidden from the public catalog.

```ts
const PUBLIC_STATUSES: DressStatus[] = ["AVAILABLE", "PENDING"];
const where: Prisma.DressWhereInput = { status: { in: PUBLIC_STATUSES } };
```

### Pattern 4: themeTags filter — Postgres `String[]` scalar list

Prisma scalar-list filters: `has` (single value), `hasSome` (any of), `hasEvery` (all of). For free-text theme search, the simplest correct mapping is "any tag whose value contains the query, case-insensitive". Since `String[]` does not support `contains` inside the array filter, the practical implementation is either:
- (a) require exact-tag match via `hasSome` against a whitelist of suggestions, OR
- (b) fetch tags into memory and filter (heavy), OR
- (c) raw SQL: `WHERE EXISTS (SELECT 1 FROM unnest("themeTags") t WHERE t ILIKE '%' || :q || '%')`.

**Recommendation:** Option (c) via `ctx.prisma.$queryRaw` ONLY when `themeQuery` is set; for the no-themeQuery path the regular query path runs. Wrap the raw query into a helper `whereDressMatchesTheme(themeQuery)` that returns the matching id set, then add `{ id: { in: matchingIds } }` to the main `where`. This is a one-place hot spot and keeps the main query Prisma-typed.

Alternative simpler fallback for MVP: `where.themeTags = { hasSome: [themeQuery] }` (exact tag match only). Note this trade-off in the PLAN; pick (c) if the data shape (curated theme strings like "Velvet", "Sequins") is open-ended, pick exact-match if tags will always be picked from a small list.

### Pattern 5: Availability date range — anti-join via `NOT` in Prisma

CAT-03 says: a dress should be excluded if it has an overlapping confirmed rental or approved request during the requested window.

A `Rental` is active if `paymentStatus` is `AWAITING_PAYMENT` or `PAID` (RETURNED + DEPOSIT_RELEASED are done; LATE_FEE_OWED is also done from an availability standpoint). A `RentalRequest` is "claiming" the dress if `status = APPROVED` (PENDING isn't yet binding; CONVERTED already became a Rental).

```ts
if (input.availableFrom && input.availableTo) {
  const start = input.availableFrom;
  const end = input.availableTo;
  where.AND = [
    { Rentals: { none: {
        AND: [
          { paymentStatus: { in: ["AWAITING_PAYMENT", "PAID"] } },
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      } } },
    { Requests: { none: {
        AND: [
          { status: "APPROVED" },
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      } } },
  ];
}
```

### Pattern 6: Best Fit sort — compute in memory after fetch

The fit score is non-trivial SQL (per-row arithmetic over min+max columns, null counting, alterable-slack offsets). The cleaner approach is:

1. Fetch up to (page * limit) rows that pass all filters.
2. Compute score in memory.
3. Sort + paginate.

Because the catalog will not exceed a few hundred AVAILABLE dresses in the foreseeable future, in-memory sort is acceptable. If `sort=bestFit` is requested but the caller has no measurements set, return a 400 BAD_REQUEST — same UX guarantee as the disabled-toggle on the client.

```ts
let result = dresses;
if (input.sort === "bestFit") {
  if (!callerMeasurements) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Set measurements before sorting by best fit" });
  }
  result = result
    .map((d) => ({ d, score: scoreDress(d, callerMeasurements) }))
    .sort((a, b) => b.score - a.score)
    .map(({ d }) => d);
} else if (input.sort === "priceAsc") {
  result.sort((a, b) => a.competitionPrice - b.competitionPrice);
} else if (input.sort === "priceDesc") {
  result.sort((a, b) => b.competitionPrice - a.competitionPrice);
}
// "newest" is already covered by `orderBy: { createdAt: "desc" }` in findMany
```

### Pattern 7: URL state — mirror 14-05 directly

The Phase 14 `DressInventoryGrid` established the canonical URL-state recipe (see `src/features/wardrobe/components/admin/DressInventoryGrid.tsx:76-128`). Apply the same idea but with a wider parameter set. Key rules:
- Local input state (`useState`) for the text/search field; flush to URL on blur or Enter (NOT every keystroke — `router.replace` churns history)
- Sliders: flush to URL on pointer release (`onValueCommit` on Radix Slider), not on every drag
- Special-case defaults: `sort=newest`, `page=1`, `fitsMe=false`, empty arrays → delete the param to keep URLs clean
- Reset page=1 on any filter change other than sort
- `router.replace(qs ? '?'+qs : '?', { scroll: false })` — never `push`, never scroll

### Pattern 8: Measurements TRPC — caller-scoped only

```ts
// src/features/wardrobe/api/queries/measurementQueries.ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

const measurementUpdateSchema = z.object({
  heightCm: z.number().int().positive().max(250).nullable().optional(),
  chestCm: z.number().int().positive().max(200).nullable().optional(),
  waistCm: z.number().int().positive().max(200).nullable().optional(),
  hipsCm: z.number().int().positive().max(200).nullable().optional(),
  torsoCm: z.number().int().positive().max(200).nullable().optional(),
  inseamCm: z.number().int().positive().max(200).nullable().optional(),
  sleeveLengthCm: z.number().int().positive().max(200).nullable().optional(),
  preferredFitNotes: z.string().max(500).nullable().optional(),
});

export const measurementRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const student = await ctx.prisma.student.findUnique({
      where: { userId: ctx.session.user.id },
      select: {
        heightCm: true, chestCm: true, waistCm: true, hipsCm: true,
        torsoCm: true, inseamCm: true, sleeveLengthCm: true,
        preferredFitNotes: true, measurementsUpdatedAt: true,
      },
    });
    if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student profile required" });
    return student;
  }),
  update: protectedProcedure.input(measurementUpdateSchema).mutation(async ({ ctx, input }) => {
    const student = await ctx.prisma.student.findUnique({
      where: { userId: ctx.session.user.id },
      select: { id: true },
    });
    if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student profile required" });
    return ctx.prisma.student.update({
      where: { id: student.id },
      data: { ...input, measurementsUpdatedAt: new Date() },
    });
  }),
});
```

Notes:
- Use `.nullable().optional()` so the form can clear a field (`null`) or omit it (undefined). Empty string from the input is converted to `null` client-side before submit. NEVER convert empty → `0`.
- `measurementsUpdatedAt` is always stamped on update (MEASURE-03).
- No need for studentId in input — it's always the caller's.

### Anti-Patterns to Avoid

- **Including internalNotes in `wardrobe.list` / `wardrobe.byId`.** CAT-08 is non-negotiable. Use `select`, not `include` — defense in depth.
- **Filtering client-side after fetching.** Pagination breaks if filters happen post-fetch. ALL filter predicates run inside the Prisma `where` (or via the themeTags raw subquery).
- **Storing inches as the source of truth.** Phase 13 picked cm as canonical and the Student columns are Int cm. Treat inches purely as a per-field display/input convenience: localStorage flag `wardrobe:unit:chest = "in"` is fine, but the wire format is always cm.
- **Using `router.push` for filter changes.** Every history entry would explode browser back-button UX. Always `router.replace({ scroll: false })`.
- **Calling `useDebouncedState` then writing the immediate value to the URL.** Use the immediate value for the input element, the debounced value for the URL/query.
- **Putting the Fits Me logic only on the server.** The Best Fit % badge on each card is computed client-side from the same `fitScore.ts` helper (same input shape: `Pick<Student, "chestCm" | "waistCm" | "hipsCm">` + dress structured fields). Reuse the module on both sides.
- **Custom multi-select dropdown.** The chip-toggle pattern from `StatusFilterChips.tsx` is sufficient for the 5-7 element enum filters and is consistent with the rest of the chrome.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Range slider | Custom two-thumb HTML/JS | `@radix-ui/react-slider` | Accessibility (keyboard arrows, ARIA), touch/pointer handling, RTL — all solved |
| Date range picker | Custom calendar | `<Calendar mode="range" />` (already wrapped) | Already used by `TravelDateBlocker`; `react-day-picker` handles months, locales, today highlight |
| Debounced URL state | Manual setTimeout | `useDebouncedState` from `src/lib/context-utils.tsx` | Already present, returns `[immediate, debounced, setValue]` triple |
| Confirmation toast | `window.confirm` | `toast` from `sonner` | Project standard; `window.confirm` is explicitly disallowed |
| Filter pill / chip styling | Tailwind classes ad-hoc | Match `StatusFilterChips.tsx` cyan/slate pattern | Consistency with admin grid |
| Tooltip provider | Wrap each tooltip individually | Single `TooltipProvider` near root | Radix recommendation |
| Image rendering | `next/image` | `<img>` with `biome-ignore lint/performance/noImgElement` | Vercel Blob domain still NOT in `next.config images.remotePatterns` per Phase 14 SUMMARY (deferred to Phase 15 if needed). Phase 14 used the plain-img pattern; mirror it for now, OR add the blob domain to `next.config.ts` as a small additive change. Defer decision to plan author. |
| Empty state | Custom layout | `EncouragingEmptyState type="general" userRole="student"` from `src/components/ui/encouraging-empty-state.tsx` | Project-wide brand voice. Or write a small inline empty state matching the 14-05 admin-grid dashed-border pattern — both are acceptable. |

**Key insight:** Phase 15 is overwhelmingly composition. Two new files (slider primitive, fit score module) are the only "real" code; everything else is wiring existing primitives.

## Common Pitfalls

### Pitfall 1: themeTags filter silently matches nothing

**What goes wrong:** Using `where.themeTags = { contains: "velvet" }` (does not exist for scalar lists) or `{ hasSome: ["velvet"] }` (requires exact match) returns zero results when users type free text.
**Why:** Prisma scalar-list filters do not support `contains` or `mode: "insensitive"` within the array.
**How to avoid:** Either constrain `themeQuery` to a select-from-suggestions UI (uses `hasSome`), OR use the raw-SQL `WHERE EXISTS (SELECT 1 FROM unnest("themeTags") t WHERE t ILIKE '%' || :q || '%')` pattern.
**Warning signs:** Theme search returning empty for known-good substring matches in dev.

### Pitfall 2: `Rental.paymentStatus` enum confusion

**What goes wrong:** Marking RENTED dresses unavailable by checking `Dress.status = "RENTED"` only. Misses the AVAILABLE-but-has-an-overlapping-future-Rental case.
**Why:** Dress.status reflects the CURRENT state; a future-dated Rental for a presently-available dress still blocks that date window.
**How to avoid:** Always evaluate availability via `Rental.startDate/endDate` and `paymentStatus IN (AWAITING_PAYMENT, PAID)`, not via `Dress.status`. PENDING dresses can still be browsed but should display a "Pending rental" indicator on the card.
**Warning signs:** A student requests dates that overlap a confirmed rental and the conflict is only caught at request-submit time (Phase 16) instead of during browse.

### Pitfall 3: Best Fit score blows up on null measurements

**What goes wrong:** `(min + max) / 2` when both are null = NaN; `(max - min) / 2 + 1` when min == max = 1 (acceptable) but when one is null = NaN.
**Why:** Optional dress fields can be null per Phase 13 schema (`Int?`).
**How to avoid:** Treat any null structured field as a -0.1 penalty contribution to the score and skip the dimension in the proximity calculation. Document explicitly in `fitScore.ts`.
**Warning signs:** "Best fit" sort produces dresses in nonsensical order (NaN sorts as the last element in JS, masking the bug).

### Pitfall 4: Empty array URL params

**What goes wrong:** `?categories=` (empty value) or `?categories=,,,` (trailing commas) crashes the zod parse.
**Why:** `URLSearchParams.set("categories", arr.join(","))` produces an empty string when `arr` is empty.
**How to avoid:** Mirror 14-05's "default-value elision" — `if (arr.length === 0) params.delete("categories")` before `params.set`. The parser must also tolerate the empty case and return `[]`.

### Pitfall 5: Sort=bestFit without measurements

**What goes wrong:** Server returns 500 because `callerMeasurements` is null and the scorer divides by zero, OR returns randomized "best fit" results that confuse students.
**Why:** Best Fit is meaningless without measurements.
**How to avoid:** (a) Disable the Best Fit option in the sort dropdown client-side when measurements are unset; (b) server throws `BAD_REQUEST` if `sort=bestFit && !callerMeasurements`. Defense in depth.

### Pitfall 6: Measurement page shows stale `measurementsUpdatedAt`

**What goes wrong:** After save, the "Last updated" line still shows the previous time until page refresh.
**Why:** Forgetting to `utils.wardrobe.measurements.get.invalidate()` after the mutation.
**How to avoid:** Standard TRPC invalidate-on-success pattern (see `DressInventoryGrid.tsx:140-146`):
```ts
const update = api.wardrobe.measurements.update.useMutation({
  onSuccess: () => {
    utils.wardrobe.measurements.get.invalidate();
    toast.success("Measurements saved");
  },
});
```

### Pitfall 7: Color filter as hardcoded enum vs. dynamic distinct

**What goes wrong:** Hardcoding `["Black", "Red", "Royal Blue", ...]` and missing the dress that's described as "Burgundy". `Dress.color` is a free-text `String` (see `dressInputSchema:27`).
**Why:** No canonical color taxonomy exists.
**How to avoid (recommended):** Add a tiny `wardrobe.list.facets` query (or extend `list` to return facet counts) that returns distinct `color` values across the current AVAILABLE+PENDING catalog. The chip group renders from this list. For MVP, an even simpler path: include `secondaryColors` too and de-duplicate. Alternative: defer to a free-text input. Both are valid; recommend the facets approach because it keeps the filter UI usable from day one.

### Pitfall 8: Sticky filter bar covers card content on mobile

**What goes wrong:** `position: sticky; top: 0` clobbers the cards when scrolled because the header is also sticky.
**Why:** The `AppLayout` header is `sticky top-0 z-10 h-24`.
**How to avoid:** Filter bar should be `sticky top-24 z-0` (below header) on desktop. On mobile (where AppLayout uses a different header), validate the offset visually.

### Pitfall 9: Disabled Switch + Tooltip not announced to screen readers

**What goes wrong:** The "Fits me" toggle is `disabled` when measurements aren't set; a tooltip explains why, but the disabled state strips pointer events so the tooltip never fires.
**Why:** Radix Tooltip needs a focusable trigger; a `disabled` button is not interactable.
**How to avoid:** Wrap the disabled Switch in a `<span>` that owns the tooltip trigger, OR use `aria-disabled="true"` + `data-state="disabled"` styling instead of the `disabled` attribute, so the trigger still receives focus and the tooltip fires.

## Code Examples

Verified patterns from project files. Confidence: HIGH (all from current codebase except slider, which is from Radix docs).

### Fit score module (greenfield, complete reference impl)

```ts
// src/features/wardrobe/lib/fitScore.ts
//
// Pure, side-effect-free fit-scoring helpers shared by the server (catalog
// list when sort=bestFit) and the client (per-card BestFitBadge). Reusable in
// Phase 16 for the detail-page Fit Check card.
//
// Algorithm reference: docs/plans/2026-05-28-ym-wardrobe-mvp-design.md L379-389.

export type DressFitFields = {
  chestMinCm: number | null;
  chestMaxCm: number | null;
  waistMinCm: number | null;
  waistMaxCm: number | null;
  hipsMinCm: number | null;
  hipsMaxCm: number | null;
  lengthCm: number | null;
  alterableSmaller: boolean;
  alterableLarger: boolean;
};

export type StudentFitFields = {
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  heightCm?: number | null;
};

export const ALTERABLE_SLACK_CM = 2;
const EXPECTED_LENGTH_TOLERANCE_CM = 8;

/**
 * Returns true if every stored caller measurement satisfies the
 * `dress.dimMin - slack ≤ caller.dim ≤ dress.dimMax + slack` predicate.
 *
 * Null caller dims short-circuit to MATCH (don't penalize incomplete profiles).
 * Null dress dims short-circuit to MATCH (don't penalize incomplete listings).
 */
export function passesFitsMeFilter(
  dress: DressFitFields,
  student: StudentFitFields,
): boolean {
  const slackLo = dress.alterableSmaller ? ALTERABLE_SLACK_CM : 0;
  const slackHi = dress.alterableLarger ? ALTERABLE_SLACK_CM : 0;

  const dims: Array<[keyof StudentFitFields, number | null, number | null]> = [
    ["chestCm", dress.chestMinCm, dress.chestMaxCm],
    ["waistCm", dress.waistMinCm, dress.waistMaxCm],
    ["hipsCm",  dress.hipsMinCm,  dress.hipsMaxCm],
  ];
  for (const [key, dMin, dMax] of dims) {
    const s = student[key];
    if (s == null || dMin == null || dMax == null) continue;
    if (s < dMin - slackLo) return false;
    if (s > dMax + slackHi) return false;
  }

  // Length check (uses heightCm proxy)
  if (dress.lengthCm != null && student.heightCm != null) {
    const expected = expectedDressLengthForHeight(student.heightCm);
    if (Math.abs(dress.lengthCm - expected) > EXPECTED_LENGTH_TOLERANCE_CM) return false;
  }

  return true;
}

/**
 * Score in [0, 3] minus null-field penalties. Higher is better.
 * Used by sort=bestFit and the per-card BestFitBadge.
 */
export function scoreDress(dress: DressFitFields, student: StudentFitFields): number {
  const slackLo = dress.alterableSmaller ? ALTERABLE_SLACK_CM : 0;
  const slackHi = dress.alterableLarger ? ALTERABLE_SLACK_CM : 0;
  const dims: Array<[number | null, number | null, number | null]> = [
    [student.chestCm, dress.chestMinCm, dress.chestMaxCm],
    [student.waistCm, dress.waistMinCm, dress.waistMaxCm],
    [student.hipsCm,  dress.hipsMinCm,  dress.hipsMaxCm],
  ];

  let score = 0;
  let nullDimensions = 0;
  for (const [s, dMin, dMax] of dims) {
    if (s == null || dMin == null || dMax == null) {
      nullDimensions += 1;
      continue;
    }
    const minWithSlack = dMin - slackLo;
    const maxWithSlack = dMax + slackHi;
    const center = (minWithSlack + maxWithSlack) / 2;
    const halfRange = (maxWithSlack - minWithSlack) / 2 + 1; // +1 prevents div-by-zero
    score += 1 - Math.min(1, Math.abs(s - center) / halfRange);
  }

  // Penalize sparse listings: -0.1 per missing structured dimension
  return score - nullDimensions * 0.1;
}

/** Convert raw score to 0..100 percent (clamped). Used by BestFitBadge. */
export function scoreToPercent(score: number): number {
  // Max possible: 3.0. Clamp to a presentable 0–100 window.
  const pct = Math.round((Math.max(0, score) / 3) * 100);
  return Math.min(100, Math.max(0, pct));
}

/**
 * Heuristic: competition-dress length ≈ 0.45 * height for adults.
 * Tunable; the 8cm tolerance in passesFitsMeFilter is forgiving.
 */
export function expectedDressLengthForHeight(heightCm: number): number {
  return Math.round(heightCm * 0.45);
}
```

### Mounting the new routers

```ts
// src/features/wardrobe/api/queries/index.ts
import { createTRPCRouter } from "@/lib/trpc";
import { catalogRouter } from "./catalogQueries";
import { imageRouter } from "./imageQueries";
import { measurementRouter } from "./measurementQueries";

export const wardrobeRouter = createTRPCRouter({
  list: catalogRouter.list,           // wardrobe.list   — flat on the root for clean DX
  byId: catalogRouter.byId,           // wardrobe.byId
  images: imageRouter,                 // wardrobe.images.*
  measurements: measurementRouter,     // wardrobe.measurements.{get, update}
});
```

(Alternative: nest under `wardrobe.catalog.list` — same router file, different mount. Recommend keeping `wardrobe.list`/`wardrobe.byId` flat to match the design doc spec at L298-299.)

### URL-state filter parsing (mirror of 14-05)

```ts
// inside DressCatalogGrid.tsx
function parseEnumArrayParam<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter((s): s is T => (allowed as readonly string[]).includes(s));
}
function parseIntParam(raw: string | null): number | undefined {
  if (raw == null) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) || n < 0 ? undefined : n;
}
function parseDateParam(raw: string | null): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// In the component:
const categories = useMemo(
  () => parseEnumArrayParam(searchParams.get("categories"), Object.values(DressCategory)),
  [searchParams],
);
const sort = useMemo(() => sortOptionSchema.catch("newest").parse(searchParams.get("sort")), [searchParams]);
// ... etc.
```

### Measurements form (pattern reference)

Use `react-hook-form` + `zodResolver(measurementUpdateSchema)`. Empty inputs map to `null` via a custom `setValueAs`:
```ts
<Input
  type="number"
  step={1}
  {...form.register("chestCm", {
    setValueAs: (v) => (v === "" || v == null ? null : Number.parseInt(String(v), 10)),
  })}
/>
```
Pre-fill from `wardrobe.measurements.get` via `form.reset(data)` in a `useEffect`. Show `measurementsUpdatedAt` formatted via `date-fns.format(...)` as a small caption above the Save button.

### DressCard signature (greenfield primitive)

```tsx
// src/features/wardrobe/components/DressCard.tsx
import Link from "next/link";
import { Shirt } from "lucide-react";
import { CategoryBadge } from "./CategoryBadge";
import { DressStatusBadge } from "./DressStatusBadge";
import { BestFitBadge } from "./BestFitBadge";
import { formatCurrencyFromCents } from "@/lib/utils";

interface DressCardProps {
  dress: {
    id: string;
    title: string;
    category: import("@prisma/client").DressCategory;
    status: import("@prisma/client").DressStatus;
    sizeLabel: string;
    competitionPrice: number;
    Images: Array<{ url: string; isPrimary: boolean }>;
  };
  fitScorePercent?: number;  // shown when caller has measurements
  href?: string;             // defaults to /wardrobe/[id]
}
export function DressCard({ dress, fitScorePercent, href }: DressCardProps) {
  /* aspect-square image, badges, price, fit %, Link wrapper */
}
```

## State of the Art

| Concern | Current Approach | Why |
|---------|------------------|-----|
| TRPC procedure types | `protectedProcedure` + inline session.user.id lookup | No `studentProcedure` middleware exists; one-off lookups are clearer than introducing a new middleware for 2 procedures |
| Scalar list filtering | Prisma `hasSome`/`has` or raw SQL `unnest()` ILIKE | No supported `contains` on `String[]` in Prisma 6.x |
| URL state | `useSearchParams` + `router.replace` + default-elision | Established by 14-05; no shared abstraction yet, two consumers does not warrant one |
| Range slider | New: `@radix-ui/react-slider` 1.3.x | Replaces no prior solution; only Radix variant matching project convention |
| Best Fit | In-memory sort post-fetch | Algorithm too complex for clean SQL; bounded result set makes it cheap |

**Deprecated/outdated:** None. Phase 13's design notes still apply verbatim for fit scoring.

## Open Questions

1. **Color filter source — facets endpoint or static list?**
   - What we know: `Dress.color` is free-text String; users will type things like "Burgundy" or "Royal Blue".
   - What's unclear: Whether to (a) extend `wardrobe.list` response with a `facets: { colors: string[], sizeLabels: string[] }` block computed from the unfiltered catalog, or (b) hardcode a curated list of color buckets.
   - Recommendation: Add `facets` to the `wardrobe.list` response. One extra Prisma `findMany({ distinct: ["color"], select: { color: true } })` per request is cheap and the UX is dramatically better. Plan author can defer the facet endpoint to a follow-on if it complicates Wave 1; falling back to a single text-search input for color is acceptable for first ship.

2. **Theme search — exact tag match (hasSome) vs. raw SQL ILIKE substring?**
   - What we know: Tags are user-curated; cardinality is unknown but likely small (< 50 distinct tags across catalog).
   - What's unclear: Whether the UX needs free-text or autocomplete-from-known-tags.
   - Recommendation: MVP ships exact-match via `hasSome` with the same facet-derived autocomplete. Substring ILIKE via raw SQL is the fallback if users complain. Document in PLAN.

3. **Next-image vs. plain img.**
   - What we know: Phase 14 used `<img>` with `biome-ignore` because Vercel Blob domain isn't in `next.config images.remotePatterns`. SUMMARY 14-05 notes "Phase 15 (public catalog) will revisit when image optimization matters."
   - What's unclear: Whether the catalog list (lots of images) warrants adding the Blob domain to `next.config.ts` now.
   - Recommendation: Add the Blob domain pattern to `next.config.ts` as a small additive change in Wave 1, then use `<Image>` with `sizes` for the catalog grid. Worth the perf win on 1/2/3/4-col layouts.

4. **AppLayout wrapper file location.**
   - What we know: 14-07 explicitly deferred this; the `(protected)` route group has NO top-level `layout.tsx`; admin/coach/student each have their own `layout.tsx` that wraps with `AppLayout role="..."`.
   - What's unclear: Should `(protected)/wardrobe/layout.tsx` wrap with `<AppLayout role="student">` (since `/wardrobe` is in the student nav) for all callers, or should it adapt based on `useCurrentUser().role`?
   - Recommendation: `layout.tsx` wraps with `<AppLayout role="student">` unconditionally for `/wardrobe/*`. Admins viewing `/wardrobe` will see the student chrome — that's fine because admins go to `/admin/wardrobe` for inventory management. Visiting `/wardrobe` as an admin is a "preview" use case. Coaches don't have a wardrobe nav entry but the page should still render gracefully if they navigate there directly.

5. **`bestFit` sort when caller has only partial measurements.**
   - What we know: Algorithm uses chest+waist+hips. Null student measurements are treated as "match" but still penalize via `nullDimensions`.
   - What's unclear: Should `sort=bestFit` require ALL three of chest/waist/hips set, or any non-null measurement?
   - Recommendation: Require at least one of chest/waist/hips set to enable Best Fit. Tooltip explicitly says "Set chest, waist, or hips to enable Best Fit". Detail-page Fit Check still warns when fields are partial.

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` L213-260 (Student measurements) and L514-628 (Dress/RentalRequest/Rental) — schema source of truth.
- `src/features/wardrobe/components/admin/DressInventoryGrid.tsx` (entire file) — canonical URL-state pattern, archive UX, grid layout.
- `src/features/admin/api/queries/wardrobeDressQueries.ts` — admin list/byId/update procedure shape and Zod input schema (`dressInputSchema`) for mirroring.
- `src/features/wardrobe/api/queries/imageQueries.ts` — `protectedProcedure` + per-row authorization pattern for shared (admin + owner) endpoints.
- `src/lib/trpc.ts` — confirms available procedure types: `publicProcedure`, `protectedProcedure`, `adminProcedure`, `coachProcedure`, `superAdminProcedure`. No `studentProcedure`.
- `src/features/wardrobe/components/admin/StatusFilterChips.tsx` — chip multi-select template.
- `src/features/wardrobe/components/DressStatusBadge.tsx`, `CategoryBadge.tsx` — existing primitives to reuse.
- `src/features/admin/components/scheduling/TravelDateBlocker.tsx` L42-82 — `Calendar mode="range"` + `DateRange` from `react-day-picker` pattern.
- `src/lib/context-utils.tsx:157` — `useDebouncedState` API.
- `src/lib/navigation-config.ts:44` — confirms Wardrobe is in studentNavigation only.
- `src/components/layout/AppLayout.tsx` — sticky header z-index, max-width container, role prop shape.
- `src/app/(protected)/student/layout.tsx` — `<AppLayout role="student">` wrapper template for the new `(protected)/wardrobe/layout.tsx`.
- `src/features/student/api/queries/bookingQueries.ts:49-53` — caller-is-student lookup pattern.
- `src/components/ui/{switch,tooltip,calendar,popover,select}.tsx` — existing primitive wrappers.
- `docs/plans/2026-05-28-ym-wardrobe-mvp-design.md` L347-394 — fit scoring + filter spec (verbatim algorithm).
- `.planning/phases/14-admin-inventory-crud/14-05-SUMMARY.md` — documents the URL-state pattern decisions.
- `.planning/phases/14-admin-inventory-crud/14-07-PLAN.md` — confirms `(protected)/layout.tsx` does NOT exist, so route wrapping is per-section.
- `.planning/phases/14-admin-inventory-crud/14-VERIFICATION.md` — confirms 14 shipped; the surface Phase 15 builds on is verified.

### Secondary (MEDIUM-HIGH confidence)
- Radix UI Slider docs (radix-ui.com) — confirmed `<Slider.Root value={[a, b]}>` is the two-thumb API; `onValueCommit` fires on pointer release; `minStepsBetweenThumbs` prevents overlap.
- `react-day-picker` v9 docs — confirmed `mode="range"` with `selected: DateRange` and `onSelect: (range) => void` props.

### Tertiary (LOW confidence — flagged for plan-author verification)
- Prisma `String[]` filter options. Confidence MEDIUM that `contains` is unsupported in scalar-list filters; HIGH that `has`/`hasSome`/`hasEvery` are the supported predicates. The raw-SQL fallback for substring search should be smoke-tested before being committed in PLAN.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified against package.json; Radix slider gap confirmed by directory listing of `node_modules/@radix-ui/`.
- Architecture: HIGH — direct extrapolation from Phase 14 patterns in-tree.
- Fit scoring algorithm: HIGH — verbatim from design doc with edge cases identified.
- Pitfalls: HIGH — most derive from observed file conventions (URL state, internalNotes hiding, image rendering); themeTags substring caveat is MEDIUM until smoke-tested.
- Open questions: items are scoped decisions, not knowledge gaps; plan author should resolve.

**Research date:** 2026-05-29
**Valid until:** 2026-06-28 (stable surface — Prisma + Radix + Next.js Router patterns won't shift inside the month)
