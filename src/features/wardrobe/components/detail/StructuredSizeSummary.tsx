"use client";

export interface StructuredSizeSummaryProps {
  dress: {
    sizeLabel: string;
    chestMinCm: number | null;
    chestMaxCm: number | null;
    waistMinCm: number | null;
    waistMaxCm: number | null;
    hipsMinCm: number | null;
    hipsMaxCm: number | null;
    torsoMinCm: number | null;
    torsoMaxCm: number | null;
    lengthCm: number | null;
    alterableSmaller: boolean;
    alterableLarger: boolean;
  };
}

/**
 * Format a min/max range for display. Null-safe across all four permutations:
 *   - both null      → "—"
 *   - min null only  → "≤ {max} cm"
 *   - max null only  → "≥ {min} cm"
 *   - min === max    → "{n} cm"
 *   - normal range   → "{min}–{max} cm"
 */
function range(min: number | null, max: number | null): string {
  if (min == null && max == null) {
    return "—";
  }
  if (min == null) {
    return `≤ ${max} cm`;
  }
  if (max == null) {
    return `≥ ${min} cm`;
  }
  if (min === max) {
    return `${min} cm`;
  }
  return `${min}–${max} cm`;
}

export function StructuredSizeSummary({ dress }: StructuredSizeSummaryProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]">
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">
        Size — {dress.sizeLabel}
      </h3>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-slate-500">Chest</dt>
          <dd className="font-medium text-slate-900">
            {range(dress.chestMinCm, dress.chestMaxCm)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Waist</dt>
          <dd className="font-medium text-slate-900">
            {range(dress.waistMinCm, dress.waistMaxCm)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Hips</dt>
          <dd className="font-medium text-slate-900">{range(dress.hipsMinCm, dress.hipsMaxCm)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Torso</dt>
          <dd className="font-medium text-slate-900">
            {range(dress.torsoMinCm, dress.torsoMaxCm)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Length</dt>
          <dd className="font-medium text-slate-900">
            {dress.lengthCm != null ? `${dress.lengthCm} cm` : "—"}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        {dress.alterableSmaller && (
          <span className="inline-flex items-center rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-700">
            Can be taken in
          </span>
        )}
        {dress.alterableLarger && (
          <span className="inline-flex items-center rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-700">
            Can be let out
          </span>
        )}
        {!dress.alterableSmaller && !dress.alterableLarger && (
          <span className="text-xs text-slate-500">No alterations possible</span>
        )}
      </div>
    </div>
  );
}
