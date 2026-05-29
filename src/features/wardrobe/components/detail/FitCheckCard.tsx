"use client";

import { Ruler } from "lucide-react";
import Link from "next/link";
import { computeFitBar, type FitBar } from "@/features/wardrobe/lib/fitCheckBars";

export interface FitCheckCardProps {
  dress: {
    chestMinCm: number | null;
    chestMaxCm: number | null;
    waistMinCm: number | null;
    waistMaxCm: number | null;
    hipsMinCm: number | null;
    hipsMaxCm: number | null;
    alterableSmaller: boolean;
    alterableLarger: boolean;
  };
  /** Caller's stored measurements; null when /wardrobe/measurements hasn't been filled. */
  measurements: {
    chestCm: number | null;
    waistCm: number | null;
    hipsCm: number | null;
  } | null;
}

export function FitCheckCard({ dress, measurements }: FitCheckCardProps) {
  // Determine if caller has ANY measurement set
  const hasAnyMeasurement =
    (measurements?.chestCm ?? null) != null ||
    (measurements?.waistCm ?? null) != null ||
    (measurements?.hipsCm ?? null) != null;

  // Fallback: no measurements set — show CTA
  if (!hasAnyMeasurement) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">
          Fit Check
        </h3>
        <div className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Ruler className="h-5 w-5 text-[#0891b2]" />
            <span className="text-sm">Set your measurements to see how this dress fits you.</span>
          </div>
          <Link
            href="/wardrobe/measurements"
            className="inline-flex items-center rounded-md bg-[#0891b2] px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700"
          >
            Set measurements
          </Link>
        </div>
      </div>
    );
  }

  const bars: FitBar[] = [
    computeFitBar({
      dimension: "chest",
      studentValue: measurements?.chestCm,
      dressMin: dress.chestMinCm,
      dressMax: dress.chestMaxCm,
      alterableSmaller: dress.alterableSmaller,
      alterableLarger: dress.alterableLarger,
    }),
    computeFitBar({
      dimension: "waist",
      studentValue: measurements?.waistCm,
      dressMin: dress.waistMinCm,
      dressMax: dress.waistMaxCm,
      alterableSmaller: dress.alterableSmaller,
      alterableLarger: dress.alterableLarger,
    }),
    computeFitBar({
      dimension: "hips",
      studentValue: measurements?.hipsCm,
      dressMin: dress.hipsMinCm,
      dressMax: dress.hipsMaxCm,
      alterableSmaller: dress.alterableSmaller,
      alterableLarger: dress.alterableLarger,
    }),
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]">
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">
        Fit Check
      </h3>
      <ul className="space-y-4">
        {bars.map((bar) => (
          <FitBarRow key={bar.dimension} bar={bar} />
        ))}
      </ul>
    </div>
  );
}

const DIMENSION_LABEL: Record<FitBar["dimension"], string> = {
  chest: "Chest",
  waist: "Waist",
  hips: "Hips",
};

const STATE_BAR_COLOR: Record<FitBar["state"], string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  unknown: "bg-slate-200",
};

const STATE_LABEL: Record<FitBar["state"], string> = {
  green: "Great fit",
  amber: "Tight fit",
  red: "Likely won't fit",
  unknown: "Not set",
};

const STATE_TEXT_COLOR: Record<FitBar["state"], string> = {
  green: "text-emerald-600",
  amber: "text-amber-600",
  red: "text-rose-600",
  unknown: "text-slate-400",
};

function FitBarRow({ bar }: { bar: FitBar }) {
  const isUnknown = bar.state === "unknown";

  return (
    <li className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-700">{DIMENSION_LABEL[bar.dimension]}</span>
        <span className={isUnknown ? "text-slate-400" : "text-slate-900 font-medium"}>
          {isUnknown ? "—" : `${bar.studentValue} cm vs ${bar.dressMin}–${bar.dressMax} cm`}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full ${STATE_BAR_COLOR[bar.state]}`}
          style={{
            width: "100%",
            opacity: isUnknown ? 0.4 : 1,
          }}
        />
        {!isUnknown && bar.markerPositionPct != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-white bg-slate-900 shadow"
            style={{ left: `${bar.markerPositionPct * 100}%` }}
          />
        )}
      </div>
      <div className={`text-xs ${STATE_TEXT_COLOR[bar.state]}`}>{STATE_LABEL[bar.state]}</div>
    </li>
  );
}
