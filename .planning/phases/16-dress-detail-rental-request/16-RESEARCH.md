# Phase 16: Dress Detail & Rental Request - Research

**Researched:** 2026-05-29
**Domain:** TRPC rental-request lifecycle, RHF/Zod dialog form with debounced server check, in-house image carousel, fit-check visualization, in-app notification creation
**Confidence:** HIGH

## Summary

Phase 16 turns the catalog browse into an end-to-end rental flow. Three surfaces ship:

1. `/wardrobe/[id]` — image carousel, three pricing tiers, structured size summary, fit-check card (uses Phase 15-02 `fitScore` module), and "Request to Rent" CTA.
2. A `RequestRentalDialog` modal — rental type / date range / optional competition info / required message, with a debounced availability check that produces an inline conflict warning.
3. `/wardrobe/my-rentals` — tabs over the caller's own requests + active/past rentals, with cancel on PENDING requests.

The data plumbing is small and clean: **one new TRPC sub-router** (`wardrobe.requests`) housing five procedures (`checkAvailability`, `create`, `mine`, `cancel`, `myRentals`). Schema is already locked from Phase 13 — `RentalRequest` and `Rental` models exist with every column we need. The notification stub (REQUEST-03) plugs straight into the existing `createNotification` helper at `src/features/notifications/utils/notificationHelpers.ts`; Phase 20 layers email on top later.

Every UI primitive needed is already installed:

- `Dialog` (Radix) — modal
- `Calendar` (react-day-picker, `mode="range"`) — date picker; used identically in `WardrobeFilterBar`
- `Popover` — wraps calendar trigger
- `Tabs` — `/my-rentals` sections
- `framer-motion` — carousel slide animation (optional polish; not required)

**No new dependencies**. The image carousel is a small in-house component (~40 LOC) keyed off `dress.Images[].sortOrder` — Embla / Swiper would be over-spec for an 8-image gallery. The pattern follows DressImageGallery's existing index-based navigation idiom.

**Critical reuse — `wardrobe.byId` is sufficient as-is**: it already returns `Images` sorted by `sortOrder asc`, `Owner: { id, name }` (which drives the notification target), and every pricing/sizing column the detail page needs. **Do not add fit-comparison output to `byId`** — compute fit client-side using `fitScore.ts` + the caller's measurements from `wardrobe.measurements.get`. This keeps Phase 15-01's CAT-08 server contract immutable.

**Primary recommendation:** Mount a new `wardrobe.requests.*` sub-router (parallel to `wardrobe.measurements.*` and `wardrobe.images.*`) at `src/features/wardrobe/api/queries/requestQueries.ts`. Keep all five procedures together — they share the same `RentalRequest` + `Rental` Prisma surface, the same caller-owns-the-request guard pattern, and the same lock semantics (availability anti-join). Splitting `requestQueries.ts` vs `rentalQueries.ts` is premature; `myRentals` is one short procedure that belongs with `mine` for navigation symmetry.

## Standard Stack

The locked stack for this phase. All of these are already installed; **zero new dependencies**.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@trpc/server` + `@trpc/react-query` | v11 | Sub-router + typed client hooks | Phase 14/15 established (`api.wardrobe.list.useQuery`, mutations via `useMutation` with `onSuccess: utils.X.invalidate()`) |
| Prisma | 6.19 | RentalRequest/Rental CRUD; overlap anti-join (same pattern as catalogQueries.ts:131-158) | Phase 13 schema, Phase 15 query patterns |
| `react-day-picker` | ^9.11.3 | `<Calendar mode="range" />` for the date-range field | Already wraps as `src/components/ui/calendar.tsx`; `WardrobeFilterBar` uses identical pattern |
| `@radix-ui/react-dialog` | ^1.1.15 | Modal | Wrapped as `src/components/ui/dialog.tsx` |
| `@radix-ui/react-popover` | ^1.1.15 | Wraps the date-range trigger inside the modal | Already installed |
| `@radix-ui/react-tabs` | ^1.1.13 | `/my-rentals` section tabs (Pending / Approved / Active / Past) | Wrapped as `src/components/ui/tabs.tsx` |
| `react-hook-form` + `@hookform/resolvers/zod` | ^7.68 / ^5.2 | Modal form validation | Project standard (MeasurementForm, DressForm pattern) |
| `zod` | ^3.25 | Shared schema between TRPC input and form resolver | Same single-source pattern as 15-04 (`measurementUpdateSchema` import) |
| `date-fns` | 4.1.0 | Date comparison + formatting for inline warning + UI | Project standard |
| `sonner` (`toast`) | ^2.0.7 | Success/error feedback on submit + cancel | Project standard |
| `lucide-react` | ^0.522 | Icons (`Calendar`, `ChevronLeft/Right`, `X`, `AlertTriangle`, `CheckCircle2`, `XCircle`, `Clock`) | Project standard |

### Supporting (already present)
| Library | Purpose | Where |
|---------|---------|-------|
| `useDebouncedState` from `src/lib/context-utils.tsx:157` | Debounce date-range changes before pinging `checkAvailability` (avoid hammering server while user picks) | Reuse — same hook 15-06 used for theme search |
| `createNotification` from `src/features/notifications/utils/notificationHelpers.ts` | Create in-app Notification row for the dress owner | Existing helper, returns the row |
| `formatCurrencyFromCents` from `src/lib/utils.ts:24` | Render three pricing tiers consistently with DressCard | Project standard |
| `framer-motion` | OPTIONAL slide-in transitions on carousel + dialog reveal | Already installed; use sparingly |

### New install (ZERO)
Nothing. The full toolbox is already in `package.json`.

### Alternatives Considered
| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| In-house carousel (state + arrow buttons) | `embla-carousel-react` or `swiper` | Adds a dependency for an 8-image max gallery. Keyboard nav + index dots + arrow buttons is ~40 LOC of state. Defer Embla to a future polish pass if galleries grow. |
| Separate `requestQueries.ts` + `rentalQueries.ts` | Single `requestQueries.ts` housing both | Both touch the same overlap-window predicate against the same two tables. Five procedures fit in one file (cf. catalogQueries.ts which holds three). Splitting hurts cohesion. |
| Server-computed fit comparison in `byId` | Client-side fit math using `fitScore.ts` + `wardrobe.measurements.get` | Changing `byId`'s output would break Phase 15-07's CatalogGrid contract (CAT-08 immutable). Two parallel queries (`byId` + `measurements.get`) compose cheaply at the page level and keep `byId` strictly catalog-shaped. |
| Sign-in redirect for unauthenticated CTA | Skip — `/wardrobe` lives under `(protected)` | Route group already gates auth. The "Sign in" prompt from REQUEST-03 is moot for the in-app flow; document the unreachable branch as a no-op so future public-marketing pages can adopt. |

## Architecture Patterns

### Recommended Structure (greenfield + additive)

```
src/features/wardrobe/
├── api/queries/
│   ├── index.ts                  # MODIFIED: mount requestsRouter as wardrobe.requests
│   ├── catalogQueries.ts         # untouched (15-01)
│   ├── measurementQueries.ts     # untouched (15-01)
│   ├── imageQueries.ts           # untouched (13-03)
│   └── requestQueries.ts         # NEW: checkAvailability, create, mine, cancel, myRentals
├── lib/
│   ├── fitScore.ts               # REUSED (15-02): scoreDress, passesFitsMeFilter
│   ├── fitCheckBars.ts           # NEW: pure helper producing per-dimension { state, position }
│   │                             #      from dress + caller measurements (green/amber/red)
│   ├── catalogFilters.ts         # untouched
│   └── compressImage.ts          # untouched
└── components/
    ├── DressCard.tsx             # untouched (15-05) — reuse on /my-rentals row cards
    ├── BestFitBadge.tsx          # untouched (15-05) — reuse near detail header
    ├── CategoryBadge.tsx         # untouched
    ├── DressStatusBadge.tsx      # untouched
    ├── detail/                   # NEW subfolder for dress-detail UI
    │   ├── DressDetailHero.tsx       # carousel + title + category + status + best-fit pill
    │   ├── DressImageCarousel.tsx    # in-house arrow + dot navigation, 8-image cap
    │   ├── PricingTiers.tsx          # 3-card grid; greyed tier disabled (purchase null)
    │   ├── StructuredSizeSummary.tsx # chest/waist/hips/torso ranges, length, alterable flags
    │   ├── FitCheckCard.tsx          # 3 horizontal bars; uses fitCheckBars helper
    │   └── DressDescription.tsx      # prose block
    ├── request/                  # NEW subfolder for request dialog + my-rentals
    │   ├── RequestRentalDialog.tsx   # the modal; RHF + zodResolver + debounced checkAvailability
    │   ├── MyRentalsView.tsx         # tab container for /my-rentals
    │   ├── PendingRequestsList.tsx   # tab body — Cancel buttons
    │   ├── ApprovedRequestsList.tsx  # tab body — payment-pending state
    │   ├── ActiveRentalsList.tsx     # tab body — return date + condition
    │   ├── PastRentalsList.tsx       # tab body — history
    │   └── RentalStatusBadge.tsx     # status pill (PENDING/APPROVED/DECLINED/CANCELED/CONVERTED)
```

```
src/app/(protected)/wardrobe/
├── layout.tsx                    # untouched (15-04) — AppLayout role=student
├── page.tsx                      # untouched (15-07) — catalog grid
├── measurements/page.tsx         # untouched (15-04)
├── [id]/page.tsx                 # NEW: thin client shell rendering DressDetail composition
└── my-rentals/page.tsx           # NEW: thin client shell rendering <MyRentalsView />
```

### Pattern 1: Sub-router mount

Mirror how `measurements` was added in 15-01. Add one line to `index.ts`:

```typescript
// src/features/wardrobe/api/queries/index.ts (MODIFIED)
import { requestsRouter } from "./requestQueries";

export const wardrobeRouter = createTRPCRouter({
  list: catalogRouter.list,
  byId: catalogRouter.byId,
  facets: catalogRouter.facets,
  images: imageRouter,
  measurements: measurementRouter,
  requests: requestsRouter,  // NEW
});
```

Client access: `api.wardrobe.requests.create.useMutation()`, `api.wardrobe.requests.mine.useQuery()`, etc.

### Pattern 2: Overlap anti-join (already proven in catalogQueries.ts:131-158)

`checkAvailability` runs the exact same anti-join the catalog list uses, but inverted — instead of filtering out conflicting dresses, it answers "does THIS dress conflict?":

```typescript
// src/features/wardrobe/api/queries/requestQueries.ts (NEW)
checkAvailability: protectedProcedure
  .input(z.object({
    dressId: z.string().cuid(),
    startDate: z.date(),
    endDate: z.date(),
  }))
  .query(async ({ ctx, input }) => {
    // Defensive: reject inverted ranges before hitting DB
    if (input.endDate <= input.startDate) {
      return {
        available: false,
        reason: "End date must be after start date" as const,
      };
    }

    const [conflictingRental, conflictingRequest] = await Promise.all([
      ctx.prisma.rental.findFirst({
        where: {
          dressId: input.dressId,
          paymentStatus: { in: ["AWAITING_PAYMENT", "PAID"] },
          startDate: { lte: input.endDate },
          endDate: { gte: input.startDate },
        },
        select: { id: true, startDate: true, endDate: true },
      }),
      ctx.prisma.rentalRequest.findFirst({
        where: {
          dressId: input.dressId,
          status: "APPROVED",
          startDate: { lte: input.endDate },
          endDate: { gte: input.startDate },
        },
        select: { id: true, startDate: true, endDate: true },
      }),
    ]);

    if (conflictingRental || conflictingRequest) {
      const conflict = conflictingRental ?? conflictingRequest!;
      return {
        available: false,
        reason: "Already booked" as const,
        conflictStart: conflict.startDate,
        conflictEnd: conflict.endDate,
      };
    }
    return { available: true, reason: null as const };
  }),
```

**Server is the source of truth.** The client's debounced check is a UX nicety; `create` re-runs the same check inside a transaction so two clients racing on the same window can never both win.

### Pattern 3: Caller-owns guard (PERM-03)

Match the inline pattern from `bookingQueries.ts:49`. No `studentProcedure` middleware needed:

```typescript
// inside cancel + mine + myRentals
const student = await ctx.prisma.student.findUnique({
  where: { userId: ctx.session.user.id },
  select: { id: true },
});
if (!student) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Student profile required",
  });
}
// For cancel:
const request = await ctx.prisma.rentalRequest.findUnique({
  where: { id: input.requestId },
  select: { id: true, studentId: true, status: true, dressId: true },
});
if (!request) throw new TRPCError({ code: "NOT_FOUND" });
if (request.studentId !== student.id) {
  throw new TRPCError({ code: "FORBIDDEN" });
}
if (request.status !== "PENDING") {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Only pending requests can be canceled",
  });
}
```

### Pattern 4: Notification creation (existing helper)

REQUEST-03 says "fires notification to dress owner." Reuse the helper directly:

```typescript
// inside create, after RentalRequest insert succeeds
import { createNotification } from "@/features/notifications/utils/notificationHelpers";

// dress.ownerId already drives the target (see prisma.dress.findUnique select)
await createNotification({
  userId: dress.ownerId,
  title: "New rental request",
  message: `${callerName} requested ${dress.title} for ${formattedDateRange}`,
  type: "INFO",
  link: `/admin/wardrobe/requests`, // Phase 17 will land this route
});
```

Wrap in try/catch + `console.error` — match `bookingQueries.ts:400-403` (notification failure does NOT roll back the request).

**Phase 20 will add the email layer** alongside this — either by extending `createNotification` to also enqueue a `PendingEmailNotification`, or by adding a sibling call after. Phase 16 does NOT need a `PendingEmailNotification` row.

### Pattern 5: RHF + Zod modal form (mirror MeasurementForm 15-04)

```typescript
// src/features/wardrobe/components/request/RequestRentalDialog.tsx
"use client";

const requestRentalSchema = z.object({
  rentalType: z.nativeEnum(RentalType),
  startDate: z.date(),
  endDate: z.date(),
  competitionName: z.string().max(120).optional(),
  competitionDate: z.date().optional(),
  message: z.string().min(20, "Tell the owner why you're a great match (20+ chars)").max(1000),
}).refine(d => d.endDate > d.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
}).refine(d => !d.competitionDate || (d.competitionDate >= d.startDate && d.competitionDate <= d.endDate), {
  message: "Competition date must fall inside the rental window",
  path: ["competitionDate"],
});

// Export from requestQueries.ts (single-source the schema for the TRPC input + form)
```

The dialog is controlled (`open`, `onOpenChange`) by the parent detail page. Form layout:

- Rental type radio (3 options; **only show Purchase when `dress.purchasePrice != null`**)
- Date range picker (Popover + Calendar mode="range")
- Optional competition name input + date picker
- Required message textarea (charcount + min-length validation)
- Inline yellow warning panel when debounced `checkAvailability` returns `available: false`
- Submit disabled while `checkAvailability` reports conflict OR form is invalid

### Pattern 6: In-house image carousel (no new deps)

```typescript
// src/features/wardrobe/components/detail/DressImageCarousel.tsx
"use client";

import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useCallback, useState } from "react";

export interface DressImageCarouselProps {
  images: Array<{ id: string; url: string; isPrimary: boolean; sortOrder: number }>;
  title: string;
}

export function DressImageCarousel({ images, title }: DressImageCarouselProps) {
  // images arrive sorted by sortOrder asc from wardrobe.byId
  const [index, setIndex] = useState(0);
  const total = images.length;

  const goPrev = useCallback(() => setIndex(i => (i - 1 + total) % total), [total]);
  const goNext = useCallback(() => setIndex(i => (i + 1) % total), [total]);

  if (total === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-slate-50 text-slate-300">
        <ImageIcon className="h-16 w-16" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-50">
        {/* biome-ignore lint/performance/noImgElement: Vercel Blob not in next.config remotePatterns (deferred per 14-05 SUMMARY) */}
        <img
          src={images[index].url}
          alt={`${title} (image ${index + 1} of ${total})`}
          className="h-full w-full object-cover"
        />
        {total > 1 && (
          <>
            <button
              onClick={goPrev}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goNext}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setIndex(i)}
              aria-label={`Go to image ${i + 1}`}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i === index ? "bg-[#0891b2]" : "bg-slate-200 hover:bg-slate-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

Keyboard support: wrap the container with `onKeyDown` handling ArrowLeft/ArrowRight for a11y polish.

### Pattern 7: FitCheckCard visualization (DETAIL-02)

Pure helper computes per-dimension visualization state:

```typescript
// src/features/wardrobe/lib/fitCheckBars.ts (NEW — pure)
import { ALTERABLE_SLACK_CM } from "./fitScore";

export type FitBarState = "green" | "amber" | "red" | "unknown";

export interface FitBar {
  dimension: "chest" | "waist" | "hips";
  state: FitBarState;
  studentValue: number | null;
  dressMin: number | null;
  dressMax: number | null;
  /** 0..1 normalized position of the student marker along the dress range */
  markerPositionPct: number | null;
}

export function computeFitBar(args: {
  dimension: "chest" | "waist" | "hips";
  studentValue: number | null | undefined;
  dressMin: number | null;
  dressMax: number | null;
  alterableSmaller: boolean;
  alterableLarger: boolean;
}): FitBar {
  const { dimension, studentValue, dressMin, dressMax, alterableSmaller, alterableLarger } = args;
  if (studentValue == null || dressMin == null || dressMax == null) {
    return { dimension, state: "unknown", studentValue: studentValue ?? null,
             dressMin, dressMax, markerPositionPct: null };
  }
  const slackLo = alterableSmaller ? ALTERABLE_SLACK_CM : 0;
  const slackHi = alterableLarger ? ALTERABLE_SLACK_CM : 0;
  let state: FitBarState = "green";
  if (studentValue < dressMin || studentValue > dressMax) state = "amber";
  if (studentValue < dressMin - slackLo || studentValue > dressMax + slackHi) state = "red";
  const range = dressMax - dressMin || 1;
  const markerPositionPct = Math.max(0, Math.min(1, (studentValue - dressMin) / range));
  return { dimension, state, studentValue, dressMin, dressMax, markerPositionPct };
}
```

Render: horizontal track (slate-200) with a tinted band marking the dress range, a marker dot at `markerPositionPct`, and bar color `emerald-500` / `amber-500` / `rose-500` per state. Use the project brand palette — never `green/orange/red` (per the 2026-04-26 brand sweep: emerald/amber/rose).

State `unknown` → render the dimension row in muted slate with a "—" instead of a value.

When **none** of chest/waist/hips are set on the caller, render an entire "Set your measurements to see fit" CTA card instead, with a button linking to `/wardrobe/measurements`.

### Pattern 8: /my-rentals page composition

```tsx
// src/app/(protected)/wardrobe/my-rentals/page.tsx
"use client";
import { MyRentalsView } from "@/features/wardrobe/components/request/MyRentalsView";

export default function MyRentalsPage() {
  return <MyRentalsView />;
}
```

```tsx
// MyRentalsView.tsx — Tabs(defaultValue="pending") around four lists
// Each list calls api.wardrobe.requests.mine.useQuery() and filters by status
// (single round trip, client-side bucket)
// activeRentals + pastRentals from api.wardrobe.requests.myRentals.useQuery()
```

URL state: a `?tab=pending` param via `useSearchParams` so a notification link can deep-link the right tab. Lightweight — no need for the full URL-state choreography of the catalog grid.

### Anti-Patterns to Avoid

- **Anti-Pattern A: Extending `wardrobe.byId` to include fit comparison.** Breaks CAT-08 immutability and forces a server round-trip on every measurement change. Compose `byId` + `measurements.get` at the page; pass both to `<FitCheckCard />`.
- **Anti-Pattern B: Embedding rental routes inside `/student/`.** /my-rentals belongs under `/wardrobe/my-rentals` per design doc L272 — same `(protected)/wardrobe/layout.tsx` chrome, same sidebar entry, same role wrap. Two-step navigation (Wardrobe → My Rentals) is intentional.
- **Anti-Pattern C: Storing the dialog form state in URL params.** The dialog is transient; don't pollute the URL with `?rentalType=COMPETITION&startDate=...`. Use plain local RHF state, dismiss on close.
- **Anti-Pattern D: Optimistic UI on cancel.** The cancel mutation must succeed before the row visually changes. PERM-03 makes this server-authoritative — an optimistic toggle followed by a permission failure produces a confusing flicker. Invalidate + show toast on success.
- **Anti-Pattern E: Releasing dress to AVAILABLE inside `cancel` if the dress is PENDING.** Phase 13 schema lets Dress.status sit at PENDING when there's an APPROVED request. PENDING requests do NOT block availability (catalogQueries.ts L131-158 only filters APPROVED requests + active Rentals). Therefore: **a PENDING request being canceled does not require a Dress.status update.** Only flip dress status if/when admin response logic (Phase 17) earlier moved the dress to PENDING. For Phase 16, set `RentalRequest.status = CANCELED` and stop — do not touch Dress.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date range picker | A pair of `<input type="date">` | `<Calendar mode="range">` inside Popover (15-06 pattern) | Already wraps react-day-picker; matches catalog filter idiom |
| Modal | A custom div + overlay + escape handler | `Dialog` from `src/components/ui/dialog.tsx` | Radix gives focus trap, ESC, scroll lock, a11y for free |
| Form validation | Manual onChange + useState | RHF + `zodResolver(requestRentalSchema)` | 15-04 / 14-04 pattern; single-source schema with the TRPC input |
| Debouncing the availability ping | Manual setTimeout / clearTimeout | `useDebouncedState` from `src/lib/context-utils.tsx:157` | Existing helper, used by WardrobeFilterBar's theme search |
| In-app notification creation | `prisma.notification.create` inline | `createNotification` helper | Honors the helper's shape contract; future extensions are centralized |
| Status badge for requests/rentals | New component from scratch | Pattern after `DressStatusBadge` (color-by-enum) | Same brand palette, same convention |
| Tab state | Custom radio with manual onClick | `<Tabs>` from `src/components/ui/tabs.tsx` | Radix gives keyboard nav, ARIA roles |
| Image carousel for ≤8 images | Embla / Swiper / Slick | In-house ~40 LOC component (see Pattern 6) | Adds a dependency for a tiny gallery. Embla is appropriate when galleries get virtualized — not here. |

**Key insight:** Phase 16 is almost entirely composition of existing primitives. Resist the urge to abstract — write the procedures inline, write the components against concrete prop shapes, defer extraction to Phase 22's audit.

## Common Pitfalls

### Pitfall 1: Race condition on simultaneous booking attempts
**What goes wrong:** Two students hit Submit within milliseconds; both `checkAvailability` calls return `available: true`; both `create` calls succeed → two PENDING requests for the same window.
**Why it happens:** PENDING requests do NOT participate in the overlap filter (only APPROVED). The race surfaces only after Phase 17 admin tries to approve — they have to manually pick one, the other becomes stale.
**How to avoid:** This is **expected behavior**, not a bug. The design treats PENDING as "asking for a slot," not "holding a slot." Document it explicitly in `create`'s docstring — admin queue in Phase 17 must show all PENDING for the same window so admin can choose. Do NOT add a unique-constraint on `(dressId, startDate, endDate, status=PENDING)`.
**Warning signs:** Admin queue showing two pendings for identical windows — that's working as designed.

### Pitfall 2: Inverted date ranges crashing checkAvailability
**What goes wrong:** User picks `endDate` before `startDate`; `startDate: { lte: endDate }` becomes a vacuous filter; query returns "available" for a 0-day window.
**Why it happens:** react-day-picker's `mode="range"` lets the user click "end" first; the `DateRange.to` is well-defined but `from > to` is possible in some interaction patterns.
**How to avoid:** Server validates `endDate > startDate` and returns `available: false, reason: "Invalid date range"`. Client form validation also rejects via Zod `.refine`. Two layers, never trust either alone.
**Warning signs:** "Available" badge showing for impossible windows during user testing.

### Pitfall 3: PENDING request cancel touching Dress.status
**What goes wrong:** Cancel handler defensively sets `dress.status = AVAILABLE`; but the dress was never moved to PENDING (only APPROVED requests do that, in Phase 17). Result: a dress that was correctly RENTED gets flipped back to AVAILABLE because a PENDING request elsewhere was canceled.
**Why it happens:** Misreading the design doc workflow — only `respondToRequest(APPROVE)` sets dress.status = PENDING; PENDING requests live independently of dress.status.
**How to avoid:** **`cancel` only touches `RentalRequest.status`.** Do not look at, read, or write Dress.status inside cancel. Phase 17 owns Dress.status transitions.
**Warning signs:** Dresses that were RENTED suddenly appearing in the catalog as AVAILABLE; test by canceling a PENDING request for a dress that someone else has an APPROVED request on.

### Pitfall 4: Server-side calendar conflict math drifting from client UI
**What goes wrong:** Client debounces, shows "available", user submits → server says conflict (because user kept dragging during the debounce window).
**Why it happens:** Debounce is intentional UX latency. Always treat the client's "available" badge as provisional.
**How to avoid:** Submit is gated by the SERVER response — re-run `checkAvailability` server-side inside `create` and throw `BAD_REQUEST: "Window no longer available"` if conflict surfaced. Client handles this by re-running the ping and surfacing the same yellow warning. Do NOT remove the server-side check on the assumption that the client's gating is sufficient.
**Warning signs:** Race-condition test scripts producing two CONVERTED rentals for the same window.

### Pitfall 5: Notification target = `dress.ownerId` (User row), NOT the student
**What goes wrong:** Confusion between "dress owner" (User who consigned/owns it — often Yura) and "student" (the requester). Wrong notification target means the requester gets their own request as a notification.
**Why it happens:** Both are User rows; `Owner: { id, name }` and `ctx.session.user.id` are both string IDs.
**How to avoid:** Fetch `dress.ownerId` via `prisma.dress.findUnique` inside `create` BEFORE the createNotification call. **Do not** trust the client to pass the ownerId — derive it server-side every time. Add a clear comment: `// notification target is dress owner (Yura or consigner), NOT the requester`.
**Warning signs:** Student getting "New rental request" notifications about their own requests.

### Pitfall 6: Carousel rendering wrong primary image
**What goes wrong:** Carousel starts at `images[0]` but the primary image is `images.find(i => i.isPrimary)` which might be index 3.
**Why it happens:** `byId` returns images sorted by `sortOrder asc`. `isPrimary` is independent of `sortOrder` — admin can mark image #4 (by sortOrder) as the primary. Catalog cards use `find(isPrimary)` for the thumbnail; carousels are typically expected to start on the primary.
**How to avoid:** Compute `const startIdx = images.findIndex(i => i.isPrimary)` and seed `useState(Math.max(0, startIdx))`. If no isPrimary (shouldn't happen — admin pipeline guarantees one), fall back to 0.
**Warning signs:** Detail-page initial image doesn't match the catalog card thumbnail.

### Pitfall 7: `next/image` vs `<img>` for Vercel Blob URLs
**What goes wrong:** Using `<Image>` from next/image throws because the Vercel Blob domain isn't in `next.config.ts` remotePatterns (deferred per 14-05 SUMMARY).
**Why it happens:** Project policy from Phase 14 — use raw `<img>` with `// biome-ignore lint/performance/noImgElement` comment.
**How to avoid:** Match DressCard's pattern at `src/features/wardrobe/components/DressCard.tsx:39-45` exactly. Add the biome-ignore comment.
**Warning signs:** Build errors about untrusted hostname, or runtime errors complaining about missing `placeholder` etc.

### Pitfall 8: Forgetting to clear/reset RHF form on dialog close
**What goes wrong:** User opens dialog → fills in date → cancels → re-opens → old date still there.
**Why it happens:** RHF persists field state across mounts when the component tree doesn't unmount. Dialog's `open=false` typically hides but doesn't unmount in Radix's default.
**How to avoid:** Either (a) `key={dressId + (open ? "open" : "closed")}` to force remount, OR (b) call `form.reset()` in a `useEffect(() => { if (!open) form.reset(); }, [open])` cleanup. Pattern (b) is cleaner and matches 14-04's WardrobeSettingsForm dirty-state handling.
**Warning signs:** User re-opens dialog and sees stale dates; submit button stays enabled when it shouldn't.

### Pitfall 9: Owner notification when student is also the dress owner (consigner self-request)
**What goes wrong:** A consigner (also a Student) requests their own dress → notification fires back to themselves.
**Why it happens:** Phase 18 (not 16) lets users consign their own dresses, but the data model already allows `dress.ownerId === student.userId`.
**How to avoid:** Inside `create`, check `if (dress.ownerId === ctx.session.user.id)` — either skip the notification or throw BAD_REQUEST. Recommended: **throw BAD_REQUEST "You cannot request your own dress."** This is a clean policy and matches what a marketplace would do. Document it; revisit only if Phase 18 explicitly enables self-rental.
**Warning signs:** Consigner inbox flooded with self-notifications during Phase 18 testing.

### Pitfall 10: `expiresAt` not computed from Settings.wardrobeRentalRequestExpiryDays
**What goes wrong:** Hardcode 7 days, then admin changes the setting and old requests still expire at the wrong cadence.
**Why it happens:** Easy to type `expiresAt: addDays(new Date(), 7)` and move on.
**How to avoid:** Inside `create`, call `await getWardrobeSettings(ctx.prisma)` (helper at `src/features/admin/api/queries/wardrobeSettingsQueries.ts:36`) and use `settings.wardrobeRentalRequestExpiryDays`. Default falls back to 7 inside the helper, so this is safe even pre-config.
**Warning signs:** Requests expiring on a different cadence than the admin settings claim.

## Code Examples

Verified patterns from existing repo files plus the canonical shapes for new procedures.

### Example 1: `requestQueries.ts` — `create` procedure (full skeleton)

```typescript
// src/features/wardrobe/api/queries/requestQueries.ts
import { RentalType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { addDays } from "date-fns";
import { z } from "zod";
import { getWardrobeSettings } from "@/features/admin/api/queries/wardrobeSettingsQueries";
import { createNotification } from "@/features/notifications/utils/notificationHelpers";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

export const createRequestSchema = z.object({
  dressId: z.string().cuid(),
  rentalType: z.nativeEnum(RentalType),
  startDate: z.date(),
  endDate: z.date(),
  competitionName: z.string().max(120).optional(),
  competitionDate: z.date().optional(),
  message: z.string().min(20).max(1000),
}).refine(d => d.endDate > d.startDate, {
  message: "End date must be after start date", path: ["endDate"],
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const requestsRouter = createTRPCRouter({
  checkAvailability: protectedProcedure
    .input(z.object({
      dressId: z.string().cuid(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      if (input.endDate <= input.startDate) {
        return { available: false, reason: "Invalid date range" as const };
      }
      const [rental, request] = await Promise.all([
        ctx.prisma.rental.findFirst({
          where: {
            dressId: input.dressId,
            paymentStatus: { in: ["AWAITING_PAYMENT", "PAID"] },
            startDate: { lte: input.endDate },
            endDate: { gte: input.startDate },
          },
          select: { id: true, startDate: true, endDate: true },
        }),
        ctx.prisma.rentalRequest.findFirst({
          where: {
            dressId: input.dressId,
            status: "APPROVED",
            startDate: { lte: input.endDate },
            endDate: { gte: input.startDate },
          },
          select: { id: true, startDate: true, endDate: true },
        }),
      ]);
      const conflict = rental ?? request;
      if (conflict) {
        return {
          available: false,
          reason: "Already booked" as const,
          conflictStart: conflict.startDate,
          conflictEnd: conflict.endDate,
        };
      }
      return { available: true, reason: null as const };
    }),

  create: protectedProcedure
    .input(createRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Resolve caller's Student row
      const student = await ctx.prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true, User: { select: { name: true } } },
      });
      if (!student) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only students can request a rental",
        });
      }

      // 2. Resolve the dress and verify it's request-able
      const dress = await ctx.prisma.dress.findUnique({
        where: { id: input.dressId },
        select: { id: true, ownerId: true, title: true, status: true },
      });
      if (!dress) throw new TRPCError({ code: "NOT_FOUND" });
      if (!["AVAILABLE", "PENDING"].includes(dress.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This dress is not available for new requests",
        });
      }
      // Pitfall 9: prevent self-requests
      if (dress.ownerId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot request your own dress",
        });
      }

      // 3. Server-side overlap re-check (defense in depth — Pitfall 4)
      const conflict = await ctx.prisma.rentalRequest.findFirst({
        where: {
          dressId: input.dressId,
          status: "APPROVED",
          startDate: { lte: input.endDate },
          endDate: { gte: input.startDate },
        },
        select: { id: true },
      });
      const rentalConflict = await ctx.prisma.rental.findFirst({
        where: {
          dressId: input.dressId,
          paymentStatus: { in: ["AWAITING_PAYMENT", "PAID"] },
          startDate: { lte: input.endDate },
          endDate: { gte: input.startDate },
        },
        select: { id: true },
      });
      if (conflict || rentalConflict) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Window no longer available",
        });
      }

      // 4. Compute expiresAt from admin settings (Pitfall 10)
      const settings = await getWardrobeSettings(ctx.prisma);
      const expiresAt = addDays(new Date(), settings.wardrobeRentalRequestExpiryDays);

      // 5. Insert RentalRequest
      const created = await ctx.prisma.rentalRequest.create({
        data: {
          dressId: input.dressId,
          studentId: student.id,
          rentalType: input.rentalType,
          startDate: input.startDate,
          endDate: input.endDate,
          competitionName: input.competitionName,
          competitionDate: input.competitionDate,
          message: input.message,
          status: "PENDING",
          expiresAt,
        },
        select: { id: true, dressId: true, status: true },
      });

      // 6. Fire in-app notification to dress owner (REQUEST-03)
      // Try/catch — never block the request on notification failure
      try {
        await createNotification({
          userId: dress.ownerId,
          title: "New rental request",
          message: `${student.User.name ?? "A student"} requested ${dress.title}`,
          type: "INFO",
          link: "/admin/wardrobe/requests", // Phase 17 lands this route
        });
      } catch (err) {
        console.error("[WARDROBE] Failed to notify dress owner:", err);
      }

      return created;
    }),

  cancel: protectedProcedure
    .input(z.object({ requestId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true },
      });
      if (!student) throw new TRPCError({ code: "FORBIDDEN" });

      const request = await ctx.prisma.rentalRequest.findUnique({
        where: { id: input.requestId },
        select: { id: true, studentId: true, status: true },
      });
      if (!request) throw new TRPCError({ code: "NOT_FOUND" });
      if (request.studentId !== student.id) {
        throw new TRPCError({ code: "FORBIDDEN" }); // PERM-03
      }
      if (request.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending requests can be canceled",
        });
      }

      // Pitfall 3: do NOT touch Dress.status here
      return ctx.prisma.rentalRequest.update({
        where: { id: request.id },
        data: { status: "CANCELED" },
        select: { id: true, status: true },
      });
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const student = await ctx.prisma.student.findUnique({
      where: { userId: ctx.session.user.id },
      select: { id: true },
    });
    if (!student) return [];
    return ctx.prisma.rentalRequest.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rentalType: true,
        startDate: true,
        endDate: true,
        competitionName: true,
        competitionDate: true,
        message: true,
        status: true,
        ownerResponse: true,
        createdAt: true,
        respondedAt: true,
        expiresAt: true,
        Dress: {
          select: {
            id: true,
            title: true,
            sizeLabel: true,
            color: true,
            competitionPrice: true,
            seasonalPrice: true,
            purchasePrice: true,
            Images: {
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: { url: true, isPrimary: true, sortOrder: true },
            },
          },
        },
      },
    });
  }),

  myRentals: protectedProcedure.query(async ({ ctx }) => {
    const student = await ctx.prisma.student.findUnique({
      where: { userId: ctx.session.user.id },
      select: { id: true },
    });
    if (!student) return [];
    return ctx.prisma.rental.findMany({
      where: { studentId: student.id },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        rentalType: true,
        startDate: true,
        endDate: true,
        rentalFee: true,
        cleaningFee: true,
        securityDeposit: true,
        totalCharged: true,
        paymentStatus: true,
        returnedAt: true,
        Dress: {
          select: {
            id: true,
            title: true,
            sizeLabel: true,
            color: true,
            Images: {
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: { url: true, isPrimary: true, sortOrder: true },
            },
          },
        },
      },
    });
  }),
});
```

### Example 2: Detail page composition

```tsx
// src/app/(protected)/wardrobe/[id]/page.tsx
"use client";

import { use } from "react";
import { DressDetailView } from "@/features/wardrobe/components/detail/DressDetailView";

export default function DressDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DressDetailView dressId={id} />;
}
```

(`params` is a Promise in Next 16; unwrap with `use()` per project standard.)

### Example 3: Detail view — composition of two queries

```tsx
// src/features/wardrobe/components/detail/DressDetailView.tsx
"use client";

import { api } from "@/lib/api";
import { DressDetailHero } from "./DressDetailHero";
import { PricingTiers } from "./PricingTiers";
import { StructuredSizeSummary } from "./StructuredSizeSummary";
import { FitCheckCard } from "./FitCheckCard";
import { DressDescription } from "./DressDescription";
import { RequestRentalDialog } from "../request/RequestRentalDialog";
import { useState } from "react";

export function DressDetailView({ dressId }: { dressId: string }) {
  const { data: dress, isLoading } = api.wardrobe.byId.useQuery({ id: dressId });
  // measurements.get returns NOT_FOUND if no Student row — handle gracefully
  const { data: measurements } = api.wardrobe.measurements.get.useQuery(undefined, {
    retry: false, // suppress retry-on-404 spinner
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) return <DressDetailSkeleton />;
  if (!dress) return <NotFoundState />;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <DressDetailHero dress={dress} onRequestClick={() => setDialogOpen(true)} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DressDescription description={dress.description} />
          <StructuredSizeSummary dress={dress} />
        </div>
        <div className="space-y-6">
          <PricingTiers
            competitionPrice={dress.competitionPrice}
            seasonalPrice={dress.seasonalPrice}
            purchasePrice={dress.purchasePrice}
            securityDeposit={dress.securityDeposit}
            cleaningFee={dress.cleaningFee}
          />
          <FitCheckCard dress={dress} measurements={measurements ?? null} />
        </div>
      </div>
      <RequestRentalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        dress={dress}
      />
    </div>
  );
}
```

### Example 4: Mounting the new router (one-line edit)

```typescript
// src/features/wardrobe/api/queries/index.ts (MODIFIED)
import { createTRPCRouter } from "@/lib/trpc";
import { catalogRouter } from "./catalogQueries";
import { imageRouter } from "./imageQueries";
import { measurementRouter } from "./measurementQueries";
import { requestsRouter } from "./requestQueries"; // NEW

export const wardrobeRouter = createTRPCRouter({
  list: catalogRouter.list,
  byId: catalogRouter.byId,
  facets: catalogRouter.facets,
  images: imageRouter,
  measurements: measurementRouter,
  requests: requestsRouter, // NEW
});
```

### Example 5: Notification helper signature (no extension needed)

```typescript
// from src/features/notifications/utils/notificationHelpers.ts (existing)
createNotification({
  userId: dress.ownerId,    // dress owner (Yura or consigner)
  title: "New rental request",
  message: `${callerName} requested ${dress.title}`,
  type: "INFO",             // 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  link: "/admin/wardrobe/requests",
});
// → prisma.notification.create({ data: { userId, title, message, type, link } })
```

### Example 6: Overlap predicate (canonical form proven in catalogQueries.ts:131-158)

The "overlap" check is the standard interval intersection: **two intervals `[a, b]` and `[c, d]` overlap iff `a ≤ d AND b ≥ c`**. In Prisma:

```typescript
{
  startDate: { lte: input.endDate },  // a ≤ d
  endDate:   { gte: input.startDate }, // b ≥ c
}
```

Confirmed against Phase 15-01's catalog availability filter at `catalogQueries.ts:135-139` — same shape, identical semantics.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| (none — greenfield) | This phase establishes the rental-request lifecycle | Phase 16 | Sets the contract Phase 17 (admin queue) consumes |
| Phase 15-01 catalog reads via `protectedProcedure` (no `studentProcedure` exists) | Phase 16 reuses `protectedProcedure` + inline Student-row guard | Phase 15 | Pattern locked: never add a `studentProcedure` middleware for individual feature procedures unless 3+ files need it. |
| Phase 14 admin-only notifications via `createNotification` | Phase 16 extends to consumer-facing in-app notifications targeting dress owners | Phase 16 | Same helper, same shape. Phase 20 adds the email layer separately. |
| Phase 15 fit math returned via `wardrobe.list` per-item | Phase 16 computes fit client-side from two parallel queries | Phase 16 | Keeps `wardrobe.byId` strictly catalog-shaped (CAT-08 immutable); avoids server-side recomputation on measurement updates. |

**Deprecated / outdated:**
- Nothing for Phase 16. All Phase 13/14/15 deliverables remain authoritative and untouched.

## Open Questions

Things that couldn't be fully resolved by code-base inspection alone:

1. **Should the modal's date-range field default to a useful window?**
   - What we know: react-day-picker supports `defaultMonth` and uncontrolled `defaultValue`.
   - What's unclear: UX preference — empty start vs. defaulting to "next weekend" vs. defaulting to the upcoming competition date if the student has one.
   - Recommendation: Leave empty (require explicit pick). Defaulting to a window risks accidental submits with wrong dates. Add `<CalendarIcon />` + helper text "Pick rental window".

2. **Notification to admins (not just dress owner) on PENDING request?**
   - What we know: BookingQueries fans out to admin users on every new lesson booking (bookingQueries.ts:405-440).
   - What's unclear: Does design doc imply admins also get notified on every PENDING request, or only the dress owner? For Yura-owned dresses these are the same person; for consigner dresses they diverge.
   - Recommendation: Phase 16 notifies **dress owner only** (matches design doc L404 verbatim). Phase 17's admin queue surfaces all PENDING regardless. If product wants admin fan-out later, it's a one-line addition.

3. **Best-fit pill rendering on the detail page**
   - What we know: BestFitBadge already exists from Phase 15-05.
   - What's unclear: Whether to surface it next to the title (like in the catalog card) or only inside the FitCheckCard.
   - Recommendation: Both. Header pill for instant signal; FitCheckCard for per-dimension drill-down. Same rendering rule as Phase 15: only show when `callerHasMeasurements` is true.

4. **"Sign in" prompt (DETAIL-03) reachability**
   - What we know: `/wardrobe` is under `(protected)`; unauthenticated users redirect to login before hitting the detail page.
   - What's unclear: Whether DETAIL-03 anticipates a future public marketing page that would render the detail view unauthenticated.
   - Recommendation: Treat as future-proofing. Component should accept an optional `isAuthenticated` prop (default `true`) that swaps the CTA between "Request to Rent" → opens modal and "Sign in to request" → href="/auth/signin?redirect=/wardrobe/[id]". Phase 16 only exercises the authenticated branch.

5. **Carousel behavior on swipe (mobile)**
   - What we know: framer-motion is available; raw `<img>` won't get React.swipe gestures.
   - What's unclear: Is touch-swipe expected? Image carousels on mobile generally expect swipe-to-advance.
   - Recommendation: Phase 16 ships arrows + dots only; document touch-swipe as a Phase 22 polish item. Avoid framer-motion's drag gestures here — they complicate the simple state model.

## Sources

### Primary (HIGH confidence — codebase + Phase 13/14/15 deliverables)
- `prisma/schema.prisma` L498-595 — RentalRequest + Rental + Dress + Notification models, RentalRequestStatus enum, all locked
- `src/features/wardrobe/api/queries/catalogQueries.ts` L131-158 — overlap anti-join pattern reused by checkAvailability
- `src/features/wardrobe/api/queries/measurementQueries.ts` L56-107 — Student-row guard + caller-scoped pattern reused by create/cancel/mine
- `src/features/wardrobe/api/queries/index.ts` L18-24 — sub-router mount pattern
- `src/features/wardrobe/lib/fitScore.ts` — pure scoring functions (FitCheckCard reuses ALTERABLE_SLACK_CM and helper math)
- `src/features/notifications/utils/notificationHelpers.ts` L14-30 — createNotification signature (exact reuse, no extension)
- `src/features/student/api/queries/bookingQueries.ts` L388-466 — notification creation pattern from lesson booking (try/catch + console.error + non-blocking)
- `src/features/admin/api/queries/wardrobeSettingsQueries.ts` L36-47 — `getWardrobeSettings(prisma)` helper for expiresAt
- `src/features/wardrobe/components/WardrobeFilterBar.tsx` L41-65 — Calendar mode="range" inside Popover, used identically by the dialog
- `src/features/wardrobe/components/MeasurementForm.tsx` L68-107 — RHF + zodResolver + form.reset() pattern for the dialog
- `src/features/wardrobe/components/admin/DressImageGallery.tsx` — image list shape (id, url, sortOrder, isPrimary)
- `src/components/ui/dialog.tsx`, `src/components/ui/tabs.tsx`, `src/components/ui/calendar.tsx`, `src/components/ui/popover.tsx` — primitives in place
- `package.json` — confirms ZERO new deps needed; all of @radix-ui dialog/popover/tabs/select, react-day-picker, react-hook-form, zod, sonner, lucide-react, framer-motion, date-fns are installed
- `docs/plans/2026-05-28-ym-wardrobe-mvp-design.md` L260-405 — design doc workflows A (rental request), TRPC API surface, fit logic, notifications spec
- `.planning/phases/15-catalog-browse-measurements/15-RESEARCH.md` + `15-04-SUMMARY.md` — recently-validated patterns; same conventions apply

### Secondary (MEDIUM confidence)
- Phase 13 schema decisions (RentalRequest.expiresAt, status enum membership) — confirmed via direct schema read

### Tertiary (LOW confidence)
- None — every claim above is grounded in repo files or the design doc.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library is already installed; no version research needed.
- Architecture: HIGH — sub-router mount and overlap predicate patterns proven in Phase 13/14/15.
- Pitfalls: HIGH — pitfalls 1, 3, 4, 5, 9, 10 are derived from concrete schema + design-doc constraints, not speculation.
- API surface: HIGH — schema fields drive 1:1 input/output shapes; nothing speculative.
- UI composition: HIGH — every primitive identified in `src/components/ui/`.
- Open Questions: MEDIUM — five intentional product-UX deferrals; recommendations are conservative defaults.

**Research date:** 2026-05-29
**Valid until:** 2026-06-29 (30 days — schema is locked, no fast-moving libraries involved)
