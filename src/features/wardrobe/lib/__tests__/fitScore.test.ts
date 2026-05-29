// src/features/wardrobe/lib/__tests__/fitScore.test.ts
//
// TEST-05 (fit scoring half): unit coverage for the pure fit-scoring module
// at src/features/wardrobe/lib/fitScore.ts (Phase 15-02).
//
// Exports covered:
//   - passesFitsMeFilter(dress, student) → boolean
//   - scoreDress(dress, student) → number (can be negative for null-heavy listings)
//   - scoreToPercent(score) → number in [0, 100]
//   - expectedDressLengthForHeight(heightCm) → number
//
// Algorithm spec: docs/plans/2026-05-28-ym-wardrobe-mvp-design.md L379-389.

import { describe, expect, it } from "vitest";
import {
  ALTERABLE_SLACK_CM,
  type DressFitFields,
  expectedDressLengthForHeight,
  passesFitsMeFilter,
  type StudentFitFields,
  scoreDress,
  scoreToPercent,
} from "../fitScore";

// ── Test factories ────────────────────────────────────────────────────────

const baseDress = (overrides: Partial<DressFitFields> = {}): DressFitFields => ({
  chestMinCm: 82,
  chestMaxCm: 88,
  waistMinCm: 64,
  waistMaxCm: 70,
  hipsMinCm: 88,
  hipsMaxCm: 94,
  lengthCm: 72,
  alterableSmaller: false,
  alterableLarger: false,
  ...overrides,
});

const baseStudent = (overrides: Partial<StudentFitFields> = {}): StudentFitFields => ({
  chestCm: 85,
  waistCm: 67,
  hipsCm: 91,
  heightCm: 160,
  ...overrides,
});

// ── ALTERABLE_SLACK_CM ─────────────────────────────────────────────────────

describe("ALTERABLE_SLACK_CM", () => {
  it("is 2cm (locked constant from design spec)", () => {
    expect(ALTERABLE_SLACK_CM).toBe(2);
  });
});

// ── passesFitsMeFilter ─────────────────────────────────────────────────────

describe("passesFitsMeFilter — happy path", () => {
  it("returns true when caller dims are inside dress bounds", () => {
    expect(passesFitsMeFilter(baseDress(), baseStudent())).toBe(true);
  });

  it("returns true at exact dress bounds (lower edge)", () => {
    expect(
      passesFitsMeFilter(baseDress(), baseStudent({ chestCm: 82, waistCm: 64, hipsCm: 88 })),
    ).toBe(true);
  });

  it("returns true at exact dress bounds (upper edge)", () => {
    expect(
      passesFitsMeFilter(baseDress(), baseStudent({ chestCm: 88, waistCm: 70, hipsCm: 94 })),
    ).toBe(true);
  });
});

describe("passesFitsMeFilter — out of bounds", () => {
  it("returns false when chest is below dress min and dress is NOT alterableSmaller", () => {
    expect(passesFitsMeFilter(baseDress(), baseStudent({ chestCm: 70 }))).toBe(false);
  });

  it("returns false when chest is above dress max and dress is NOT alterableLarger", () => {
    expect(passesFitsMeFilter(baseDress(), baseStudent({ chestCm: 100 }))).toBe(false);
  });
});

describe("passesFitsMeFilter — alterable slack", () => {
  it("alterableSmaller=true allows caller to be 2cm below dress min", () => {
    const dress = baseDress({ alterableSmaller: true });
    expect(passesFitsMeFilter(dress, baseStudent({ chestCm: 80 }))).toBe(true); // 82 - 2 = 80
    expect(passesFitsMeFilter(dress, baseStudent({ chestCm: 79 }))).toBe(false); // 82 - 2 = 80 — 79 < 80
  });

  it("alterableLarger=true allows caller to be 2cm above dress max", () => {
    const dress = baseDress({ alterableLarger: true });
    expect(passesFitsMeFilter(dress, baseStudent({ chestCm: 90 }))).toBe(true); // 88 + 2 = 90
    expect(passesFitsMeFilter(dress, baseStudent({ chestCm: 91 }))).toBe(false); // 88 + 2 = 90 — 91 > 90
  });
});

describe("passesFitsMeFilter — null short-circuits", () => {
  it("null caller chestCm passes through (don't penalize incomplete profile)", () => {
    expect(passesFitsMeFilter(baseDress(), baseStudent({ chestCm: null }))).toBe(true);
  });

  it("null dress chestMinCm passes through (don't penalize incomplete listing)", () => {
    expect(passesFitsMeFilter(baseDress({ chestMinCm: null }), baseStudent())).toBe(true);
  });

  it("null dress chestMaxCm passes through", () => {
    expect(passesFitsMeFilter(baseDress({ chestMaxCm: null }), baseStudent())).toBe(true);
  });
});

describe("passesFitsMeFilter — length tolerance (8cm via heightCm proxy)", () => {
  it("returns true when dress length is within 8cm of expected (height 160 → expected 72)", () => {
    // expectedDressLengthForHeight(160) === 72; |72-72| = 0 → within 8cm tolerance
    expect(passesFitsMeFilter(baseDress({ lengthCm: 72 }), baseStudent({ heightCm: 160 }))).toBe(
      true,
    );
    // |80 - 72| = 8 → exactly at boundary (passes)
    expect(passesFitsMeFilter(baseDress({ lengthCm: 80 }), baseStudent({ heightCm: 160 }))).toBe(
      true,
    );
  });

  it("returns false when dress length deviates more than 8cm from expected", () => {
    // |60 - 72| = 12 → exceeds tolerance
    expect(passesFitsMeFilter(baseDress({ lengthCm: 60 }), baseStudent({ heightCm: 160 }))).toBe(
      false,
    );
  });

  it("skips length check when caller heightCm is missing", () => {
    expect(passesFitsMeFilter(baseDress({ lengthCm: 60 }), baseStudent({ heightCm: null }))).toBe(
      true,
    );
  });

  it("skips length check when dress lengthCm is missing", () => {
    expect(passesFitsMeFilter(baseDress({ lengthCm: null }), baseStudent({ heightCm: 160 }))).toBe(
      true,
    );
  });
});

// ── scoreDress ─────────────────────────────────────────────────────────────

describe("scoreDress — happy path", () => {
  it("a perfect-center caller scores higher than an edge caller", () => {
    // Dress: chest [82-88]. Center is 85. Caller 85 (center) vs caller 82 (edge).
    const dress = baseDress();
    const center = scoreDress(dress, baseStudent({ chestCm: 85, waistCm: 67, hipsCm: 91 }));
    const edge = scoreDress(dress, baseStudent({ chestCm: 82, waistCm: 64, hipsCm: 88 }));
    expect(center).toBeGreaterThan(edge);
  });

  it("a center-matching caller scores close to the max of 3 (one per dimension, no penalty)", () => {
    const score = scoreDress(baseDress(), baseStudent({ chestCm: 85, waistCm: 67, hipsCm: 91 }));
    expect(score).toBeGreaterThan(2.8); // perfect-center, no nulls → ~3.0 (slight float drift OK)
  });
});

describe("scoreDress — null penalties", () => {
  it("a single null caller dim subtracts 0.1 from the per-dimension contribution", () => {
    const dressBase = baseDress();
    const full = scoreDress(dressBase, baseStudent());
    const oneNull = scoreDress(dressBase, baseStudent({ chestCm: null }));
    // full ≈ 3 (perfect center on 3 dims).  oneNull ≈ 2 (perfect center on 2 dims) - 0.1 ≈ 1.9.
    // We just want to verify: oneNull is at LEAST 1.0 less than full (one less dim contributes ~1)
    // AND oneNull is LESS than (full - 1) by 0.1 (the null penalty).
    expect(oneNull).toBeLessThan(full - 1);
    expect(oneNull).toBeCloseTo(full - 1 - 0.1, 5);
  });

  it("all-null dress bounds returns exactly -0.3 (3 dimensions × -0.1 each)", () => {
    const dress = baseDress({
      chestMinCm: null,
      chestMaxCm: null,
      waistMinCm: null,
      waistMaxCm: null,
      hipsMinCm: null,
      hipsMaxCm: null,
    });
    expect(scoreDress(dress, baseStudent())).toBeCloseTo(-0.3, 5);
  });
});

describe("scoreDress — alterable slack widens the scoring window", () => {
  it("alterableLarger=true gives a higher score when caller is above max on all dims", () => {
    // All three dims are 1cm above the dress max (chest 89>88, waist 71>70, hips 95>94).
    // Without slack: each dim is at the |s-center|=halfRange clamp boundary → contribution 0.
    // With alterableLarger=true: bounds widen by 2cm, caller is now well inside the new window
    // → each dim contributes ~0.4 (net positive even after the slack also widens halfRange).
    const baseFit = baseDress({ alterableSmaller: false, alterableLarger: false });
    const alterable = baseDress({ alterableSmaller: false, alterableLarger: true });
    const student = baseStudent({ chestCm: 89, waistCm: 71, hipsCm: 95 });
    const noSlack = scoreDress(baseFit, student);
    const withSlack = scoreDress(alterable, student);
    expect(withSlack).toBeGreaterThan(noSlack);
  });
});

// ── scoreToPercent ─────────────────────────────────────────────────────────

describe("scoreToPercent", () => {
  it("returns 0 for score of 0", () => {
    expect(scoreToPercent(0)).toBe(0);
  });

  it("returns 100 for score of 3 (max)", () => {
    expect(scoreToPercent(3)).toBe(100);
  });

  it("returns 50 for score of 1.5 (midpoint)", () => {
    expect(scoreToPercent(1.5)).toBe(50);
  });

  it("clamps negative scores to 0", () => {
    expect(scoreToPercent(-0.3)).toBe(0);
    expect(scoreToPercent(-5)).toBe(0);
  });

  it("clamps super-max scores to 100", () => {
    expect(scoreToPercent(5)).toBe(100);
  });
});

// ── expectedDressLengthForHeight ──────────────────────────────────────────

describe("expectedDressLengthForHeight", () => {
  it("returns 72 for height 160 (round(160 * 0.45) = round(72) = 72)", () => {
    expect(expectedDressLengthForHeight(160)).toBe(72);
  });

  it("returns 81 for height 180 (round(180 * 0.45) = round(81) = 81)", () => {
    expect(expectedDressLengthForHeight(180)).toBe(81);
  });

  it("returns 77 for height 170 (round(170 * 0.45) = round(76.5) = 77 half-up)", () => {
    expect(expectedDressLengthForHeight(170)).toBe(77);
  });

  it("returns 45 for height 100 (boundary check)", () => {
    expect(expectedDressLengthForHeight(100)).toBe(45);
  });

  it("returns 0 for height 0 (mathematical edge — never used in production)", () => {
    expect(expectedDressLengthForHeight(0)).toBe(0);
  });
});
