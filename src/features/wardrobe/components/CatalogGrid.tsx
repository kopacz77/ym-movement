// src/features/wardrobe/components/CatalogGrid.tsx
//
// URL-state-driven catalog grid (Plan 15-07). Mirrors the Plan 14-05
// DressInventoryGrid pattern wholesale per research Pattern 7.
//
// This component owns:
//   - URL query params for categories, colors, sizes, themeQuery (q),
//     lengthCmMin/Max, priceMinCents/Max, availableFrom/To, fitsMe, sort, page
//   - Default-value elision: empty arrays / default sort / page=1 ⇒ delete the
//     param so the canonical first-load URL is `/wardrobe`
//   - All filter changes reset page=1 (sort + pagination do NOT — matches
//     Plan 14-05 ADR for the admin grid)
//   - router.replace + scroll:false on every update (no history churn, no
//     scroll jump)
//
// Reads via api.wardrobe.list.useQuery(parsedFilters) and composes:
//   - WardrobeFilterBar (Plan 15-06) — fully controlled, this grid drives it
//   - DressCard (Plan 15-05) — one per result item
//   - BestFitBadge — rendered inside DressCard via fitScorePercent
//
// Replaces the Phase 14-07 Coming Soon stub at /wardrobe/page.tsx.

"use client";

import { DressCategory } from "@prisma/client";
import { Shirt } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DressCard } from "@/features/wardrobe/components/DressCard";
import { WardrobeFilterBar } from "@/features/wardrobe/components/WardrobeFilterBar";
import { type SortOption, sortOptionSchema } from "@/features/wardrobe/lib/catalogFilters";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 24;
const ALL_CATEGORIES: DressCategory[] = Object.values(DressCategory) as DressCategory[];

// ---------------------------------------------------------------------------
// URL param parsing helpers (mirror 14-05 DressInventoryGrid conventions —
// total-defensive: garbage input always degrades to a sensible default rather
// than throwing or producing invalid enum values).
// ---------------------------------------------------------------------------

function parseEnumArrayParam<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) { return []; }
  const allowedSet = new Set<string>(allowed);
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => allowedSet.has(s)) as T[];
}

function parseStringArrayParam(raw: string | null): string[] {
  if (!raw) { return []; }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseIntParam(raw: string | null): number | undefined {
  if (!raw) { return undefined; }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) { return undefined; }
  return n;
}

function parseDateParam(raw: string | null): Date | undefined {
  if (!raw) { return undefined; }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) { return undefined; }
  return d;
}

function parseBoolParam(raw: string | null): boolean {
  return raw === "1";
}

function parseSortParam(raw: string | null): SortOption {
  // sortOptionSchema.catch falls back to "newest" on any invalid value so a
  // malformed `?sort=garbage` link cannot wedge the page.
  return sortOptionSchema.catch("newest").parse(raw ?? "newest");
}

// ---------------------------------------------------------------------------
// Loading skeleton: matches the DressCard outer shape so the grid does not
// reflow when the data resolves.
// ---------------------------------------------------------------------------

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]"
        >
          <div className="aspect-square w-full animate-pulse bg-slate-100" />
          <div className="flex flex-col gap-2 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-6 w-1/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CatalogGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // -- URL-derived filter state --------------------------------------------
  // Parsed once per searchParams change. Every render reads the URL as the
  // source of truth; React state holds NO mirror of these values.
  const filters = useMemo(
    () => ({
      categories: parseEnumArrayParam<DressCategory>(
        searchParams.get("categories"),
        ALL_CATEGORIES,
      ),
      colors: parseStringArrayParam(searchParams.get("colors")),
      sizeLabels: parseStringArrayParam(searchParams.get("sizes")),
      themeQuery: searchParams.get("q") ?? "",
      lengthCmMin: parseIntParam(searchParams.get("lengthMin")),
      lengthCmMax: parseIntParam(searchParams.get("lengthMax")),
      priceMinCents: parseIntParam(searchParams.get("priceMin")),
      priceMaxCents: parseIntParam(searchParams.get("priceMax")),
      availableFrom: parseDateParam(searchParams.get("from")),
      availableTo: parseDateParam(searchParams.get("to")),
      fitsMe: parseBoolParam(searchParams.get("fitsMe")),
      sort: parseSortParam(searchParams.get("sort")),
      page: parseIntParam(searchParams.get("page")) ?? 1,
    }),
    [searchParams],
  );

  // -- Data fetch -----------------------------------------------------------
  // Shape matches catalogFilterSchema; TRPC infers from there.
  const { data, isLoading, error } = api.wardrobe.list.useQuery({
    categories: filters.categories.length ? filters.categories : undefined,
    colors: filters.colors.length ? filters.colors : undefined,
    sizeLabels: filters.sizeLabels.length ? filters.sizeLabels : undefined,
    themeQuery: filters.themeQuery || undefined,
    lengthCmMin: filters.lengthCmMin,
    lengthCmMax: filters.lengthCmMax,
    priceMinCents: filters.priceMinCents,
    priceMaxCents: filters.priceMaxCents,
    availableFrom: filters.availableFrom,
    availableTo: filters.availableTo,
    fitsMe: filters.fitsMe,
    sort: filters.sort,
    page: filters.page,
    limit: PAGE_SIZE,
  });

  // -- URL update helper ----------------------------------------------------
  // Centralized so the resetPage policy can't drift between callers. The
  // only caller that does NOT reset page is sort (Pattern 7: ranking change
  // within the same result set preserves the user's pagination context) and
  // pagination itself.
  const updateParams = (patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    }
    if (resetPage) {
      next.delete("page");
    }
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  // -- Filter change callbacks ---------------------------------------------
  // Every callback follows the elision rule: when the value equals its
  // default (empty array / falsy / canonical edge), delete the param rather
  // than serializing the default. Canonical first-load URL stays `/wardrobe`.
  const onCategoriesChange = (nextCats: DressCategory[]) => {
    updateParams({ categories: nextCats.length ? nextCats.join(",") : null });
  };

  const onColorsChange = (nextColors: string[]) => {
    updateParams({ colors: nextColors.length ? nextColors.join(",") : null });
  };

  const onSizeLabelsChange = (nextSizes: string[]) => {
    updateParams({ sizes: nextSizes.length ? nextSizes.join(",") : null });
  };

  const onThemeQueryChange = (nextQ: string) => {
    const trimmed = nextQ.trim();
    updateParams({ q: trimmed ? trimmed : null });
  };

  const onLengthCmChange = (min: number | null, max: number | null) => {
    updateParams({
      lengthMin: min == null ? null : String(min),
      lengthMax: max == null ? null : String(max),
    });
  };

  const onPriceCentsChange = (min: number | null, max: number | null) => {
    updateParams({
      priceMin: min == null ? null : String(min),
      priceMax: max == null ? null : String(max),
    });
  };

  const onAvailabilityChange = (from: Date | null, to: Date | null) => {
    // YYYY-MM-DD for human-readable URLs that round-trip through Date parsing
    // without timezone drift on the client.
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    updateParams({
      from: from ? fmt(from) : null,
      to: to ? fmt(to) : null,
    });
  };

  const onFitsMeChange = (next: boolean) => {
    updateParams({ fitsMe: next ? "1" : null });
  };

  // Sort changes do NOT reset page (Pattern 7 / 14-05 ADR). Default "newest"
  // is elided.
  const onSortChange = (next: SortOption) => {
    updateParams({ sort: next === "newest" ? null : next }, /* resetPage */ false);
  };

  const onClearAll = () => {
    router.replace("?", { scroll: false });
  };

  // Pagination preserves the current filter context (page param is the only
  // one we touch). page=1 is elided.
  const onPageChange = (nextPage: number) => {
    updateParams({ page: nextPage <= 1 ? null : String(nextPage) }, /* resetPage */ false);
  };

  // -- Render ---------------------------------------------------------------

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const callerHasMeasurements = data?.callerHasMeasurements ?? false;

  // BAD_REQUEST defense-in-depth: 15-02 throws if sort=bestFit or fitsMe=true
  // without measurements. The bar should already gate these, but a stale URL
  // (e.g. user added measurements then cleared them) can land us here. Render
  // a CTA pointing to /wardrobe/measurements.
  const isBadRequestGate = error?.data?.code === "BAD_REQUEST";

  return (
    <div className="space-y-6">
      {/* Editorial header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">Wardrobe</h1>
        <p className="text-sm text-slate-500">
          {isLoading
            ? "Loading catalog..."
            : data
              ? `${total} ${total === 1 ? "dress" : "dresses"} available`
              : "Browse and rent competition dresses."}
        </p>
      </div>

      {/* Filter bar — fully controlled */}
      <WardrobeFilterBar
        categories={filters.categories}
        colors={filters.colors}
        sizeLabels={filters.sizeLabels}
        themeQuery={filters.themeQuery}
        lengthCmMin={filters.lengthCmMin ?? null}
        lengthCmMax={filters.lengthCmMax ?? null}
        priceMinCents={filters.priceMinCents ?? null}
        priceMaxCents={filters.priceMaxCents ?? null}
        availableFrom={filters.availableFrom ?? null}
        availableTo={filters.availableTo ?? null}
        fitsMe={filters.fitsMe}
        sort={filters.sort}
        callerHasMeasurements={callerHasMeasurements}
        onCategoriesChange={onCategoriesChange}
        onColorsChange={onColorsChange}
        onSizeLabelsChange={onSizeLabelsChange}
        onThemeQueryChange={onThemeQueryChange}
        onLengthCmChange={onLengthCmChange}
        onPriceCentsChange={onPriceCentsChange}
        onAvailabilityChange={onAvailabilityChange}
        onFitsMeChange={onFitsMeChange}
        onSortChange={onSortChange}
        onClearAll={onClearAll}
      />

      {/* Body: loading | error | empty | grid */}
      {isLoading ? (
        <GridSkeleton />
      ) : isBadRequestGate ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-12 text-center">
          <Shirt className="h-12 w-12 text-amber-400" />
          <h3 className="text-lg font-semibold text-[#1a3a5c]">Set your measurements first</h3>
          <p className="max-w-md text-sm text-slate-600">
            Best Fit and Fits Me need your chest, waist, or hips to rank dresses for you.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              router.replace("/wardrobe/measurements", { scroll: false });
            }}
            className="mt-2"
          >
            Add measurements
          </Button>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-rose-300 bg-rose-50 p-12 text-center">
          <Shirt className="h-12 w-12 text-rose-400" />
          <h3 className="text-lg font-semibold text-[#1a3a5c]">Couldn't load catalog</h3>
          <p className="max-w-md text-sm text-slate-600">{error.message}</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
            Retry
          </Button>
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <Shirt className="h-12 w-12 text-slate-300" />
          <h3 className="text-lg font-semibold text-[#1a3a5c]">No dresses match your filters</h3>
          <p className="max-w-md text-sm text-slate-500">
            Try clearing filters or expanding your length / price ranges.
          </p>
          <Button variant="outline" onClick={onClearAll} className="mt-2">
            Clear all filters
          </Button>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.items.map((d) => (
            <DressCard key={d.id} dress={d} fitScorePercent={d.fitScorePercent} />
          ))}
        </div>
      ) : null}

      {/* Pagination footer — only when there's something to paginate */}
      {data && totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500">
            Page {filters.page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page <= 1 || isLoading}
              onClick={() => onPageChange(filters.page - 1)}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page >= totalPages || isLoading}
              onClick={() => onPageChange(filters.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
