import { LessonType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOURLY_PRICES,
  calculateLessonPrice,
  calculateProratedPrice,
  getHourlyRateForLessonType,
} from "../pricing";

// ── Test Factories ──────────────────────────────────────────────────────

const baseStudent = { customPricingEnabled: false };

const customStudent = (overrides = {}) => ({
  customPricingEnabled: true,
  privateLessonPrice: null as number | null,
  groupLessonPrice: null as number | null,
  choreographyPrice: null as number | null,
  competitionPrepPrice: null as number | null,
  offIceDancePrice: null as number | null,
  ...overrides,
});

const fullDefaultPricing = {
  privateLessonPrice: 75,
  groupLessonPrice: 45,
  choreographyPrice: 90,
  competitionPrice: 95,
  offIceDancePrice: 75,
};

const coachWith = (overrides = {}) => ({
  privateLessonPrice: null as number | null,
  groupLessonPrice: null as number | null,
  choreographyPrice: null as number | null,
  competitionPrepPrice: null as number | null,
  offIceDancePrice: null as number | null,
  ...overrides,
});

// ── DEFAULT_HOURLY_PRICES ───────────────────────────────────────────────

describe("DEFAULT_HOURLY_PRICES", () => {
  it("has correct PRIVATE rate", () => {
    expect(DEFAULT_HOURLY_PRICES[LessonType.PRIVATE]).toBe(120);
  });

  it("has correct CHOREOGRAPHY rate", () => {
    expect(DEFAULT_HOURLY_PRICES[LessonType.CHOREOGRAPHY]).toBe(150);
  });

  it("has correct GROUP rate", () => {
    expect(DEFAULT_HOURLY_PRICES[LessonType.GROUP]).toBe(80);
  });

  it("has correct COMPETITION_PREP rate", () => {
    expect(DEFAULT_HOURLY_PRICES[LessonType.COMPETITION_PREP]).toBe(180);
  });

  it("has correct OFF_ICE_DANCE rate", () => {
    expect(DEFAULT_HOURLY_PRICES[LessonType.OFF_ICE_DANCE]).toBe(100);
  });
});

// ── calculateProratedPrice ──────────────────────────────────────────────

describe("calculateProratedPrice", () => {
  it("returns full rate for 60-minute lesson", () => {
    expect(calculateProratedPrice(120, 60)).toBe(120);
  });

  it("prorates 45-minute lesson correctly", () => {
    expect(calculateProratedPrice(120, 45)).toBe(90);
  });

  it("prorates 30-minute lesson correctly", () => {
    expect(calculateProratedPrice(120, 30)).toBe(60);
  });

  it("prorates 15-minute lesson correctly", () => {
    expect(calculateProratedPrice(120, 15)).toBe(30);
  });

  it("floors 0 duration to 1 minute", () => {
    expect(calculateProratedPrice(120, 0)).toBe(2);
  });

  it("floors negative duration to 1 minute", () => {
    expect(calculateProratedPrice(120, -10)).toBe(2);
  });

  it("rounds to 2 decimal places", () => {
    // 100/60 * 7 = 11.6666... → 11.67
    expect(calculateProratedPrice(100, 7)).toBe(11.67);
  });

  it("returns 0 for $0 rate", () => {
    expect(calculateProratedPrice(0, 60)).toBe(0);
  });
});

// ── getHourlyRateForLessonType ──────────────────────────────────────────

describe("getHourlyRateForLessonType", () => {
  // ── Tier 1: Student custom pricing ──

  describe("Tier 1: Student custom pricing", () => {
    it("uses student PRIVATE price when customPricingEnabled", () => {
      const student = customStudent({ privateLessonPrice: 100 });
      expect(getHourlyRateForLessonType(LessonType.PRIVATE, student)).toBe(100);
    });

    it("uses student GROUP price when customPricingEnabled", () => {
      const student = customStudent({ groupLessonPrice: 50 });
      expect(getHourlyRateForLessonType(LessonType.GROUP, student)).toBe(50);
    });

    it("uses student CHOREOGRAPHY price when customPricingEnabled", () => {
      const student = customStudent({ choreographyPrice: 130 });
      expect(getHourlyRateForLessonType(LessonType.CHOREOGRAPHY, student)).toBe(130);
    });

    it("uses student COMPETITION_PREP price when customPricingEnabled", () => {
      const student = customStudent({ competitionPrepPrice: 160 });
      expect(getHourlyRateForLessonType(LessonType.COMPETITION_PREP, student)).toBe(160);
    });

    it("uses student OFF_ICE_DANCE price when customPricingEnabled", () => {
      const student = customStudent({ offIceDancePrice: 85 });
      expect(getHourlyRateForLessonType(LessonType.OFF_ICE_DANCE, student)).toBe(85);
    });

    it("falls through when student price is null", () => {
      const student = customStudent({ privateLessonPrice: null });
      expect(getHourlyRateForLessonType(LessonType.PRIVATE, student, fullDefaultPricing)).toBe(75);
    });

    it("falls through when student price is undefined", () => {
      const student = { customPricingEnabled: true };
      expect(getHourlyRateForLessonType(LessonType.PRIVATE, student, fullDefaultPricing)).toBe(75);
    });

    it("skips tier entirely when customPricingEnabled is false", () => {
      const student = { customPricingEnabled: false, privateLessonPrice: 999 };
      const coach = coachWith({ privateLessonPrice: 110 });
      expect(getHourlyRateForLessonType(LessonType.PRIVATE, student, null, coach)).toBe(110);
    });
  });

  // ── Tier 2: Coach-specific pricing ──

  describe("Tier 2: Coach-specific pricing", () => {
    it("uses coach PRIVATE price", () => {
      const coach = coachWith({ privateLessonPrice: 110 });
      expect(getHourlyRateForLessonType(LessonType.PRIVATE, baseStudent, null, coach)).toBe(110);
    });

    it("uses coach GROUP price", () => {
      const coach = coachWith({ groupLessonPrice: 60 });
      expect(getHourlyRateForLessonType(LessonType.GROUP, baseStudent, null, coach)).toBe(60);
    });

    it("uses coach CHOREOGRAPHY price", () => {
      const coach = coachWith({ choreographyPrice: 140 });
      expect(getHourlyRateForLessonType(LessonType.CHOREOGRAPHY, baseStudent, null, coach)).toBe(
        140,
      );
    });

    it("uses coach COMPETITION_PREP price", () => {
      const coach = coachWith({ competitionPrepPrice: 200 });
      expect(
        getHourlyRateForLessonType(LessonType.COMPETITION_PREP, baseStudent, null, coach),
      ).toBe(200);
    });

    it("uses coach OFF_ICE_DANCE price", () => {
      const coach = coachWith({ offIceDancePrice: 90 });
      expect(getHourlyRateForLessonType(LessonType.OFF_ICE_DANCE, baseStudent, null, coach)).toBe(
        90,
      );
    });

    it("falls through when coach price is null", () => {
      const coach = coachWith({ privateLessonPrice: null });
      expect(
        getHourlyRateForLessonType(LessonType.PRIVATE, baseStudent, fullDefaultPricing, coach),
      ).toBe(75);
    });

    it("falls through when coach is null", () => {
      expect(
        getHourlyRateForLessonType(LessonType.PRIVATE, baseStudent, fullDefaultPricing, null),
      ).toBe(75);
    });

    it("falls through when coach is undefined", () => {
      expect(
        getHourlyRateForLessonType(LessonType.PRIVATE, baseStudent, fullDefaultPricing, undefined),
      ).toBe(75);
    });
  });

  // ── Tier 3: Default pricing from database ──

  describe("Tier 3: Default pricing from database", () => {
    it("uses default PRIVATE price", () => {
      expect(
        getHourlyRateForLessonType(LessonType.PRIVATE, baseStudent, fullDefaultPricing),
      ).toBe(75);
    });

    it("uses default GROUP price", () => {
      expect(getHourlyRateForLessonType(LessonType.GROUP, baseStudent, fullDefaultPricing)).toBe(
        45,
      );
    });

    it("uses default CHOREOGRAPHY price", () => {
      expect(
        getHourlyRateForLessonType(LessonType.CHOREOGRAPHY, baseStudent, fullDefaultPricing),
      ).toBe(90);
    });

    it("uses default COMPETITION_PREP price (competitionPrice field)", () => {
      expect(
        getHourlyRateForLessonType(LessonType.COMPETITION_PREP, baseStudent, fullDefaultPricing),
      ).toBe(95);
    });

    it("uses default OFF_ICE_DANCE price", () => {
      expect(
        getHourlyRateForLessonType(LessonType.OFF_ICE_DANCE, baseStudent, fullDefaultPricing),
      ).toBe(75);
    });
  });

  // ── Tier 4: Hardcoded fallback ──

  describe("Tier 4: Hardcoded fallback defaults", () => {
    it("falls back to hardcoded PRIVATE rate", () => {
      expect(getHourlyRateForLessonType(LessonType.PRIVATE, baseStudent)).toBe(120);
    });

    it("falls back to hardcoded GROUP rate", () => {
      expect(getHourlyRateForLessonType(LessonType.GROUP, baseStudent)).toBe(80);
    });

    it("falls back to hardcoded CHOREOGRAPHY rate", () => {
      expect(getHourlyRateForLessonType(LessonType.CHOREOGRAPHY, baseStudent)).toBe(150);
    });

    it("falls back to hardcoded COMPETITION_PREP rate", () => {
      expect(getHourlyRateForLessonType(LessonType.COMPETITION_PREP, baseStudent)).toBe(180);
    });

    it("falls back to hardcoded OFF_ICE_DANCE rate", () => {
      expect(getHourlyRateForLessonType(LessonType.OFF_ICE_DANCE, baseStudent)).toBe(100);
    });
  });

  // ── Waterfall priority ──

  describe("Waterfall priority", () => {
    it("coach price beats student custom price", () => {
      // Coach pricing is authoritative — each coach sets their own rates.
      // Student custom pricing only applies when no coach pricing is provided
      // (role-aware logic at the caller decides whether to pass coach pricing).
      const student = customStudent({ privateLessonPrice: 100 });
      const coach = coachWith({ privateLessonPrice: 110 });
      expect(
        getHourlyRateForLessonType(LessonType.PRIVATE, student, fullDefaultPricing, coach),
      ).toBe(110);
    });

    it("student custom price used when no coach pricing provided", () => {
      // When caller passes null for coach (e.g. admin-coach or no coach on slot),
      // student custom pricing takes effect
      const student = customStudent({ privateLessonPrice: 100 });
      expect(
        getHourlyRateForLessonType(LessonType.PRIVATE, student, fullDefaultPricing, null),
      ).toBe(100);
    });

    it("coach price beats default pricing", () => {
      const coach = coachWith({ privateLessonPrice: 110 });
      expect(
        getHourlyRateForLessonType(LessonType.PRIVATE, baseStudent, fullDefaultPricing, coach),
      ).toBe(110);
    });

    it("default pricing beats hardcoded fallback", () => {
      expect(
        getHourlyRateForLessonType(LessonType.PRIVATE, baseStudent, fullDefaultPricing),
      ).toBe(75);
    });

    it("student null falls to coach, not default", () => {
      const student = customStudent({ privateLessonPrice: null });
      const coach = coachWith({ privateLessonPrice: 110 });
      expect(
        getHourlyRateForLessonType(LessonType.PRIVATE, student, fullDefaultPricing, coach),
      ).toBe(110);
    });

    it("student null + coach null falls to default", () => {
      const student = customStudent({ privateLessonPrice: null });
      const coach = coachWith({ privateLessonPrice: null });
      expect(
        getHourlyRateForLessonType(LessonType.PRIVATE, student, fullDefaultPricing, coach),
      ).toBe(75);
    });
  });
});

// ── calculateLessonPrice (end-to-end) ───────────────────────────────────

describe("calculateLessonPrice", () => {
  it("uses student custom price and prorates for duration", () => {
    const student = customStudent({ privateLessonPrice: 100 });
    expect(calculateLessonPrice(LessonType.PRIVATE, 30, student)).toBe(50);
  });

  it("uses coach price when student has no custom pricing", () => {
    const coach = coachWith({ privateLessonPrice: 110 });
    expect(calculateLessonPrice(LessonType.PRIVATE, 60, baseStudent, null, coach)).toBe(110);
  });

  it("uses default pricing when no student or coach pricing", () => {
    expect(calculateLessonPrice(LessonType.PRIVATE, 60, baseStudent, fullDefaultPricing)).toBe(75);
  });

  it("uses hardcoded fallback when no pricing sources exist", () => {
    expect(calculateLessonPrice(LessonType.PRIVATE, 60, baseStudent)).toBe(120);
  });

  it("prorates coach pricing for non-60-minute lesson", () => {
    const coach = coachWith({ choreographyPrice: 150 });
    expect(calculateLessonPrice(LessonType.CHOREOGRAPHY, 45, baseStudent, null, coach)).toBe(
      112.5,
    );
  });

  it("handles all 5 lesson types with coach pricing", () => {
    const coach = coachWith({
      privateLessonPrice: 100,
      groupLessonPrice: 60,
      choreographyPrice: 140,
      competitionPrepPrice: 200,
      offIceDancePrice: 90,
    });

    expect(calculateLessonPrice(LessonType.PRIVATE, 60, baseStudent, null, coach)).toBe(100);
    expect(calculateLessonPrice(LessonType.GROUP, 60, baseStudent, null, coach)).toBe(60);
    expect(calculateLessonPrice(LessonType.CHOREOGRAPHY, 60, baseStudent, null, coach)).toBe(140);
    expect(calculateLessonPrice(LessonType.COMPETITION_PREP, 60, baseStudent, null, coach)).toBe(
      200,
    );
    expect(calculateLessonPrice(LessonType.OFF_ICE_DANCE, 60, baseStudent, null, coach)).toBe(90);
  });

  // ── BUG REGRESSION TEST ──
  // Previously, assignStudentToTimeSlot and updateLessonType didn't pass coach pricing
  // to calculateLessonPrice, causing prices to fall to defaults.
  // Coach rate $120, 45min → should be $90, NOT $56.25 (which is 75/60*45 from default)
  it("BUG REGRESSION: coach $120 rate, 45min → $90, not $56.25 from default fallthrough", () => {
    const coach = coachWith({ privateLessonPrice: 120 });
    const result = calculateLessonPrice(
      LessonType.PRIVATE,
      45,
      baseStudent,
      fullDefaultPricing,
      coach,
    );
    expect(result).toBe(90);
    expect(result).not.toBe(56.25); // This was the bug: 75/60*45 = 56.25
  });

  it("BUG REGRESSION: coach pricing respected over defaults for all types", () => {
    const coach = coachWith({
      privateLessonPrice: 120,
      groupLessonPrice: 80,
      choreographyPrice: 160,
      competitionPrepPrice: 200,
      offIceDancePrice: 110,
    });

    // All should use coach rate, not fall through to defaults
    expect(calculateLessonPrice(LessonType.PRIVATE, 45, baseStudent, fullDefaultPricing, coach))
      .toBe(90); // 120 * 45/60
    expect(calculateLessonPrice(LessonType.GROUP, 45, baseStudent, fullDefaultPricing, coach))
      .toBe(60); // 80 * 45/60
    expect(calculateLessonPrice(LessonType.CHOREOGRAPHY, 45, baseStudent, fullDefaultPricing, coach))
      .toBe(120); // 160 * 45/60
    expect(calculateLessonPrice(LessonType.COMPETITION_PREP, 45, baseStudent, fullDefaultPricing, coach))
      .toBe(150); // 200 * 45/60
    expect(calculateLessonPrice(LessonType.OFF_ICE_DANCE, 45, baseStudent, fullDefaultPricing, coach))
      .toBe(82.5); // 110 * 45/60
  });
});
