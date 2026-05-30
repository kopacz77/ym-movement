// src/features/wardrobe/components/WardrobeFilterBar.tsx
//
// Sticky catalog filter bar (Plan 15-06).
//
// Fully controlled by props from the parent DressCatalogGrid (Plan 15-07) so
// URL-state management is single-sourced. This component owns NO router state
// and does NOT call useSearchParams -- it is a dumb composite of filter
// primitives whose `onChange` callbacks the parent maps into router.replace().
//
// Renders 9 filter controls + sort + Clear All:
//   - 3 chip groups: category (Prisma enum), color, size
//       (color/size hydrated from `wardrobe.facets`; the bar hides those
//        groups until the facets query resolves so users never see an empty
//        chip cluster - research Pitfall 7)
//   - 1 text input: themeQuery (flushed to parent on blur or Enter)
//   - 2 two-thumb sliders: lengthCm (40-160) and price (cents 0..100000 = $0..$1000)
//       Both sliders use the Plan 15-03 Slider primitive and ONLY commit to the
//       parent on `onValueCommit` (release), never on `onValueChange` (drag).
//       Edge-of-range thumbs (min == 40 / max == 160 / 0 / 100000) commit as
//       `null` so the URL stays clean when the user resets a bound.
//   - 1 date range picker: availability window via react-day-picker Calendar
//       wrapped in a Popover.
//   - 1 Switch: 'Fits Me' (CAT-04). When `callerHasMeasurements=false` the
//       switch is replaced by a tooltip-firing span wrapping a disabled switch,
//       per research Pitfall 9 (Radix Tooltip needs a focusable trigger and
//       does not fire on natively `disabled` elements).
//   - 1 Select: sort (Newest, Price Asc, Price Desc, Best Fit). Best Fit is
//       disabled in parallel with the Fits Me toggle when no measurements.
//   - 1 ghost button: Clear All -> parent resets every URL param.
//
// Sticky positioning: `top-24 z-0` -- AppLayout header is sticky top-0 z-10
// h-24, so this bar sits directly below it without overlap.
//
// Brand:
//   - Selected chip: solid cyan #0891b2 / white text (matches admin
//     StatusFilterChips convention from Plan 14-02).
//   - Section labels: editorial uppercase + tracking-[0.15em] navy-ish slate,
//     per 2026-04-26 brand sweep.

"use client";

import { DressCategory } from "@prisma/client";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SortOption } from "@/features/wardrobe/lib/catalogFilters";
import { api } from "@/lib/api";
import { formatCurrencyFromCents } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

export interface WardrobeFilterBarProps {
  // Current filter state (controlled from parent)
  categories: DressCategory[];
  colors: string[];
  sizeLabels: string[];
  themeQuery: string;
  lengthCmMin: number | null;
  lengthCmMax: number | null;
  priceMinCents: number | null;
  priceMaxCents: number | null;
  availableFrom: Date | null;
  availableTo: Date | null;
  fitsMe: boolean;
  sort: SortOption;

  // Capability flag - controls Fits Me / Best Fit enabled state
  callerHasMeasurements: boolean;

  // Change callbacks
  onCategoriesChange: (next: DressCategory[]) => void;
  onColorsChange: (next: string[]) => void;
  onSizeLabelsChange: (next: string[]) => void;
  onThemeQueryChange: (next: string) => void;
  onLengthCmChange: (min: number | null, max: number | null) => void;
  onPriceCentsChange: (min: number | null, max: number | null) => void;
  onAvailabilityChange: (from: Date | null, to: Date | null) => void;
  onFitsMeChange: (next: boolean) => void;
  onSortChange: (next: SortOption) => void;

  // Clear All
  onClearAll: () => void;
}

// ---------------------------------------------------------------------------
// Slider bounds (module-private constants so the elision math has names)
// ---------------------------------------------------------------------------

const LENGTH_MIN_CM = 40;
const LENGTH_MAX_CM = 160;
const LENGTH_STEP_CM = 1;

const PRICE_MIN_CENTS = 0;
const PRICE_MAX_CENTS = 100_000; // $1000
const PRICE_STEP_CENTS = 500; // $5

const CATEGORY_OPTIONS: DressCategory[] = Object.values(DressCategory) as DressCategory[];

// ---------------------------------------------------------------------------
// ChipGroup helper (scoped to this plan; kept inline rather than a sibling
// module because no other surface needs it yet -- admins use StatusFilterChips
// which is enum-aware).
// ---------------------------------------------------------------------------

interface ChipGroupProps<T extends string> {
  label: string;
  options: T[];
  value: T[];
  onChange: (next: T[]) => void;
}

function ChipGroup<T extends string>({ label, options, value, onChange }: ChipGroupProps<T>) {
  const toggle = (opt: T) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              aria-pressed={on}
              className={
                on
                  ? "rounded-full bg-[#0891b2] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#06748f]"
                  : "rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date range trigger label
// ---------------------------------------------------------------------------

function formatDateRangeLabel(from: Date | null, to: Date | null): string {
  if (!from && !to) {
    return "Any dates";
  }
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
  if (from && to) {
    return `${fmt(from)} – ${fmt(to)}`;
  }
  if (from) {
    return `From ${fmt(from)}`;
  }
  if (to) {
    return `Until ${fmt(to)}`;
  }
  return "Any dates";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WardrobeFilterBar(props: WardrobeFilterBarProps) {
  const {
    categories,
    colors,
    sizeLabels,
    themeQuery,
    lengthCmMin,
    lengthCmMax,
    priceMinCents,
    priceMaxCents,
    availableFrom,
    availableTo,
    fitsMe,
    sort,
    callerHasMeasurements,
    onCategoriesChange,
    onColorsChange,
    onSizeLabelsChange,
    onThemeQueryChange,
    onLengthCmChange,
    onPriceCentsChange,
    onAvailabilityChange,
    onFitsMeChange,
    onSortChange,
    onClearAll,
  } = props;

  // -- Facets hydration ------------------------------------------------------
  const { data: facets } = api.wardrobe.facets.useQuery();
  const colorOptions = facets?.colors;
  const sizeOptions = facets?.sizeLabels;

  // -- Theme query local input state ----------------------------------------
  // Local state so each keystroke does NOT trigger a router.replace upstream;
  // flushed to the parent on blur OR Enter. A useEffect syncs the prop back in
  // when the URL changes externally (browser back/forward, Clear All).
  const [themeDraft, setThemeDraft] = React.useState(themeQuery);
  React.useEffect(() => {
    setThemeDraft(themeQuery);
  }, [themeQuery]);

  const flushTheme = () => {
    if (themeDraft !== themeQuery) {
      onThemeQueryChange(themeDraft);
    }
  };

  // -- Slider drafts ---------------------------------------------------------
  // Slider draft state holds the in-progress drag values; only flushed to
  // parent on onValueCommit (pointer release / keyboard arrow rest).
  const [lengthDraft, setLengthDraft] = React.useState<[number, number]>([
    lengthCmMin ?? LENGTH_MIN_CM,
    lengthCmMax ?? LENGTH_MAX_CM,
  ]);
  React.useEffect(() => {
    setLengthDraft([lengthCmMin ?? LENGTH_MIN_CM, lengthCmMax ?? LENGTH_MAX_CM]);
  }, [lengthCmMin, lengthCmMax]);

  const [priceDraft, setPriceDraft] = React.useState<[number, number]>([
    priceMinCents ?? PRICE_MIN_CENTS,
    priceMaxCents ?? PRICE_MAX_CENTS,
  ]);
  React.useEffect(() => {
    setPriceDraft([priceMinCents ?? PRICE_MIN_CENTS, priceMaxCents ?? PRICE_MAX_CENTS]);
  }, [priceMinCents, priceMaxCents]);

  // -- Date range popover ---------------------------------------------------
  const dateSelected: DateRange | undefined =
    availableFrom || availableTo
      ? { from: availableFrom ?? undefined, to: availableTo ?? undefined }
      : undefined;

  // -- Sort change ----------------------------------------------------------
  const handleSortChange = (v: string) => {
    onSortChange(v as SortOption);
  };

  return (
    <div className="sticky top-24 z-0 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:-mx-6">
      {/* Row 1: chip groups + theme text */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-3">
          <ChipGroup
            label="Category"
            options={CATEGORY_OPTIONS}
            value={categories}
            onChange={onCategoriesChange}
          />
        </div>

        {colorOptions && colorOptions.length > 0 && (
          <div className="md:col-span-3">
            <ChipGroup
              label="Color"
              options={colorOptions}
              value={colors}
              onChange={onColorsChange}
            />
          </div>
        )}

        {sizeOptions && sizeOptions.length > 0 && (
          <div className="md:col-span-3">
            <ChipGroup
              label="Size"
              options={sizeOptions}
              value={sizeLabels}
              onChange={onSizeLabelsChange}
            />
          </div>
        )}

        <div className="md:col-span-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="theme-query"
              className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500"
            >
              Theme
            </label>
            <Input
              id="theme-query"
              type="search"
              placeholder="e.g. floral, lyrical"
              value={themeDraft}
              onChange={(e) => setThemeDraft(e.target.value)}
              onBlur={flushTheme}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  flushTheme();
                }
              }}
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Row 2: sliders + dates + sort + fits-me + clear-all */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
        {/* Length slider */}
        <div className="md:col-span-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Length
              </span>
              <span className="text-xs font-medium text-slate-700">
                {lengthDraft[0]} – {lengthDraft[1]} cm
              </span>
            </div>
            <Slider
              min={LENGTH_MIN_CM}
              max={LENGTH_MAX_CM}
              step={LENGTH_STEP_CM}
              value={lengthDraft}
              onValueChange={(v) => setLengthDraft([v[0], v[1]] as [number, number])}
              onValueCommit={(v) => {
                const nextMin = v[0] === LENGTH_MIN_CM ? null : v[0];
                const nextMax = v[1] === LENGTH_MAX_CM ? null : v[1];
                onLengthCmChange(nextMin, nextMax);
              }}
              aria-label="Length range in centimeters"
            />
          </div>
        </div>

        {/* Price slider */}
        <div className="md:col-span-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Price
              </span>
              <span className="text-xs font-medium text-slate-700">
                {formatCurrencyFromCents(priceDraft[0])} – {formatCurrencyFromCents(priceDraft[1])}
              </span>
            </div>
            <Slider
              min={PRICE_MIN_CENTS}
              max={PRICE_MAX_CENTS}
              step={PRICE_STEP_CENTS}
              value={priceDraft}
              onValueChange={(v) => setPriceDraft([v[0], v[1]] as [number, number])}
              onValueCommit={(v) => {
                const nextMin = v[0] === PRICE_MIN_CENTS ? null : v[0];
                const nextMax = v[1] === PRICE_MAX_CENTS ? null : v[1];
                onPriceCentsChange(nextMin, nextMax);
              }}
              aria-label="Price range in dollars"
            />
          </div>
        </div>

        {/* Availability date range */}
        <div className="md:col-span-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
              Availability
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full justify-start font-normal text-slate-700"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                  <span className="truncate">
                    {formatDateRangeLabel(availableFrom, availableTo)}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateSelected}
                  onSelect={(range) => onAvailabilityChange(range?.from ?? null, range?.to ?? null)}
                  numberOfMonths={1}
                  showOutsideDays={false}
                  disabled={{ before: new Date() }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Sort */}
        <div className="md:col-span-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="sort-select"
              className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500"
            >
              Sort
            </label>
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger id="sort-select" className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="priceAsc">Price: Low to High</SelectItem>
                <SelectItem value="priceDesc">Price: High to Low</SelectItem>
                <SelectItem value="bestFit" disabled={!callerHasMeasurements}>
                  Best Fit
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fits Me + Clear All */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-end gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Fits Me
              </span>
              {callerHasMeasurements ? (
                <Switch
                  checked={fitsMe}
                  onCheckedChange={onFitsMeChange}
                  aria-label="Filter to dresses that fit my measurements"
                />
              ) : (
                // Local TooltipProvider — the app has no global Provider mount
                // (verified via grep; each Tooltip consumer wraps its own,
                // matching CoachList.tsx). Without this Provider, Radix throws
                // "Tooltip must be used within TooltipProvider" at render time.
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        // biome-ignore lint/a11y/noNoninteractiveTabindex: Radix Tooltip needs a focusable trigger to fire on keyboard focus; natively disabled elements do not bubble events (15-RESEARCH Pitfall 9). The span owns focus + aria-disabled while wrapping the non-interactive Switch.
                        tabIndex={0}
                        aria-disabled="true"
                        className="inline-block cursor-not-allowed opacity-50"
                      >
                        <Switch
                          checked={false}
                          onCheckedChange={() => {
                            /* no-op */
                          }}
                          disabled
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Set chest, waist, or hips first</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-slate-600 hover:text-[#1a3a5c]"
            >
              Clear All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
