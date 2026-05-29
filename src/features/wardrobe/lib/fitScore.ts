// src/features/wardrobe/lib/fitScore.ts
//
// Pure, side-effect-free fit-scoring helpers shared by:
// - catalogQueries.list (server) for sort=bestFit ordering and fitsMe filtering
// - BestFitBadge (client, Plan 15-05) for per-card score display
// - Phase 16 FitCheckCard (future) for per-dimension red/amber/green bars
//
// Algorithm spec: docs/plans/2026-05-28-ym-wardrobe-mvp-design.md L379-389.
// NO React, NO Prisma, NO ctx, NO async. Pure functions only.

export const ALTERABLE_SLACK_CM = 2;
const EXPECTED_LENGTH_TOLERANCE_CM = 8;

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

/**
 * Returns true if every stored caller measurement satisfies the
 * `dress.dimMin - slack ≤ caller.dim ≤ dress.dimMax + slack` predicate.
 *
 * Null caller dims short-circuit to MATCH (don't penalize incomplete profiles).
 * Null dress dims short-circuit to MATCH (don't penalize incomplete listings).
 *
 * Length check (uses heightCm proxy) fails the filter when the dress length
 * deviates from the expected length-for-height by more than
 * EXPECTED_LENGTH_TOLERANCE_CM (8 cm).
 */
export function passesFitsMeFilter(
  dress: DressFitFields,
  student: StudentFitFields,
): boolean {
  const slackLo = dress.alterableSmaller ? ALTERABLE_SLACK_CM : 0;
  const slackHi = dress.alterableLarger ? ALTERABLE_SLACK_CM : 0;

  const dims: Array<[number | null | undefined, number | null, number | null]> = [
    [student.chestCm, dress.chestMinCm, dress.chestMaxCm],
    [student.waistCm, dress.waistMinCm, dress.waistMaxCm],
    [student.hipsCm, dress.hipsMinCm, dress.hipsMaxCm],
  ];
  for (const [s, dMin, dMax] of dims) {
    if (s == null || dMin == null || dMax == null) continue;
    if (s < dMin - slackLo) return false;
    if (s > dMax + slackHi) return false;
  }

  // Length check (uses heightCm proxy)
  if (dress.lengthCm != null && student.heightCm != null) {
    const expected = expectedDressLengthForHeight(student.heightCm);
    if (Math.abs(dress.lengthCm - expected) > EXPECTED_LENGTH_TOLERANCE_CM) {
      return false;
    }
  }

  return true;
}

/**
 * Score in [0, 3] minus null-field penalties. Higher is better.
 * Used by sort=bestFit and the per-card BestFitBadge.
 *
 * Per-dimension contribution is 1 - min(1, |s - center| / halfRange), where
 * center and halfRange are computed against the alterable-slack-extended
 * bounds. Each null structured dimension (either side of caller or dress)
 * applies a -0.1 penalty. The result CAN be negative for a dress with all
 * three dress bounds null (-0.3) — that is intentional and penalizes sparse
 * listings.
 */
export function scoreDress(dress: DressFitFields, student: StudentFitFields): number {
  const slackLo = dress.alterableSmaller ? ALTERABLE_SLACK_CM : 0;
  const slackHi = dress.alterableLarger ? ALTERABLE_SLACK_CM : 0;
  const dims: Array<[number | null | undefined, number | null, number | null]> = [
    [student.chestCm, dress.chestMinCm, dress.chestMaxCm],
    [student.waistCm, dress.waistMinCm, dress.waistMaxCm],
    [student.hipsCm, dress.hipsMinCm, dress.hipsMaxCm],
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
