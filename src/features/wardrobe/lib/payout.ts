// src/features/wardrobe/lib/payout.ts
//
// Pure, side-effect-free consignment payout helper. Extracted from
// src/features/admin/api/queries/wardrobeRequestQueries.ts so Plan 21-02
// unit tests can import it without dragging in the entire TRPC router.
//
// Algorithm spec: docs/plans/2026-05-28-ym-wardrobe-mvp-design.md (RENTAL-03).
// NO React, NO Prisma, NO ctx, NO async. Pure functions only.

/**
 * RENTAL-03 (LOCKED): consignmentCommissionPct === 0 means Yura/platform-owned
 * → payout null. consignmentCommissionPct > 0 means consigned → payout populated.
 *
 * Math.round used (matches JS half-up convention); document any audit deltas
 * against banker's rounding. Formula: payout = rentalFee - round(rentalFee * pct / 100).
 *
 * Both inputs are integer cents. Return is integer cents OR null.
 */
export function computeConsignmentPayout(
  dress: { consignmentCommissionPct: number },
  rentalFee: number,
): number | null {
  if (dress.consignmentCommissionPct === 0) {
    return null;
  }
  return rentalFee - Math.round((rentalFee * dress.consignmentCommissionPct) / 100);
}
