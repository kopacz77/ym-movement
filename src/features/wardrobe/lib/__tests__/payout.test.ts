// src/features/wardrobe/lib/__tests__/payout.test.ts
//
// TEST-05 (payout half): unit coverage for the pure consignment payout
// algorithm extracted to src/features/wardrobe/lib/payout.ts in Plan 21-01.
//
// Algorithm: payout = rentalFee - Math.round((rentalFee * pct) / 100)
//   when pct === 0 → null (signal: Yura/platform-owned, no payout)
//   when pct > 0  → integer cents (consigner's share, after Math.round half-up commission)
//
// All values are integer cents (Int @db.Integer). No floats. No async. No DB.

import { describe, expect, it } from "vitest";
import { computeConsignmentPayout } from "../payout";

// ── pct === 0 (Yura-owned signal) ─────────────────────────────────────────

describe("computeConsignmentPayout — Yura-owned (pct === 0)", () => {
  it("returns null when pct is 0 and fee is non-zero", () => {
    expect(computeConsignmentPayout({ consignmentCommissionPct: 0 }, 5000)).toBeNull();
  });

  it("returns null when pct is 0 even with zero fee", () => {
    expect(computeConsignmentPayout({ consignmentCommissionPct: 0 }, 0)).toBeNull();
  });

  it("returns null when pct is 0 and fee is very large", () => {
    expect(computeConsignmentPayout({ consignmentCommissionPct: 0 }, 1_000_000)).toBeNull();
  });
});

// ── pct > 0 (consigned — standard cases) ───────────────────────────────────

describe("computeConsignmentPayout — consigned (pct > 0)", () => {
  it("computes 15% commission on 5000c fee: payout = 4250c (5000 - 750)", () => {
    expect(computeConsignmentPayout({ consignmentCommissionPct: 15 }, 5000)).toBe(4250);
  });

  it("computes 10% commission on 10000c fee: payout = 9000c", () => {
    expect(computeConsignmentPayout({ consignmentCommissionPct: 10 }, 10000)).toBe(9000);
  });

  it("computes 20% commission on 7500c fee: payout = 6000c (7500 - 1500)", () => {
    expect(computeConsignmentPayout({ consignmentCommissionPct: 20 }, 7500)).toBe(6000);
  });
});

// ── rounding behavior (Math.round half-up) ─────────────────────────────────

describe("computeConsignmentPayout — rounding (Math.round half-up)", () => {
  it("rounds half-up at .5: 5375c × 15% = 806.25c → round 806c → payout 4569c", () => {
    // 5375 * 15 / 100 = 806.25. Math.round(806.25) === 806 (banker's would also pick 806,
    // but JS Math.round picks half-up which for .5 rounds toward +∞; 806.25 is unambiguous).
    expect(computeConsignmentPayout({ consignmentCommissionPct: 15 }, 5375)).toBe(4569);
  });

  it("rounds non-half decimals correctly: 10000c × 33% = 3300c (exact) → payout 6700c", () => {
    expect(computeConsignmentPayout({ consignmentCommissionPct: 33 }, 10000)).toBe(6700);
  });

  it("handles fee that produces exact half: 1c × 50% = 0.5c → round 1c → payout 0c", () => {
    // 1 * 50 / 100 = 0.5. Math.round(0.5) === 1 (half-up toward +∞ for positives in JS).
    expect(computeConsignmentPayout({ consignmentCommissionPct: 50 }, 1)).toBe(0);
  });
});

// ── edge cases ─────────────────────────────────────────────────────────────

describe("computeConsignmentPayout — edges", () => {
  it("returns 0 when pct is 100 (theoretical edge — all goes to commission)", () => {
    expect(computeConsignmentPayout({ consignmentCommissionPct: 100 }, 5000)).toBe(0);
  });

  it("returns 0 when fee is 0 and pct is non-zero (no charge → no payout)", () => {
    expect(computeConsignmentPayout({ consignmentCommissionPct: 15 }, 0)).toBe(0);
  });

  it("preserves integer cents throughout (return value is never a float)", () => {
    const result = computeConsignmentPayout({ consignmentCommissionPct: 17 }, 5000);
    expect(result).not.toBeNull();
    expect(Number.isInteger(result as number)).toBe(true);
  });
});
