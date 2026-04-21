// src/lib/pricing-utils.ts

import type { LessonType } from "@prisma/client";

/**
 * Default HOURLY pricing for each lesson type
 * These are rates per 60 minutes - actual prices are pro-rated by duration
 */
export const DEFAULT_LESSON_PRICES = {
  PRIVATE: 75,
  GROUP: 45,
  CHOREOGRAPHY: 90,
  COMPETITION_PREP: 95,
  OFF_ICE_DANCE: 75,
} as const;

/**
 * Student pricing interface for custom pricing
 */
export interface StudentPricing {
  customPricingEnabled?: boolean;
  privateLessonPrice?: number | null;
  choreographyPrice?: number | null;
  groupLessonPrice?: number | null;
  competitionPrepPrice?: number | null;
  offIceDancePrice?: number | null;
}

/**
 * Coach pricing interface for coach-specific pricing
 */
export interface CoachPricing {
  privateLessonPrice?: number | null;
  groupLessonPrice?: number | null;
  choreographyPrice?: number | null;
  competitionPrepPrice?: number | null;
  offIceDancePrice?: number | null;
}

/**
 * Get the HOURLY rate for a specific lesson type
 *
 * Pricing waterfall:
 * 1. Coach pricing (highest priority - each coach sets their own rates)
 * 2. Student custom pricing (variable rates set by admin, used when no coach pricing)
 * 3. Default pricing (hardcoded fallbacks)
 *
 * @param type - The lesson type
 * @param studentPricing - Optional student-specific pricing configuration
 * @param coachPricing - Optional coach-specific pricing
 * @returns The hourly rate for the lesson type
 */
export function getHourlyRate(
  type: LessonType,
  studentPricing?: StudentPricing,
  coachPricing?: CoachPricing,
): number {
  // 1. Coach pricing takes priority — each coach sets their own rates
  if (coachPricing) {
    switch (type) {
      case "PRIVATE":
        if (coachPricing.privateLessonPrice != null) {
          return coachPricing.privateLessonPrice;
        }
        break;
      case "CHOREOGRAPHY":
        if (coachPricing.choreographyPrice != null) {
          return coachPricing.choreographyPrice;
        }
        break;
      case "GROUP":
        if (coachPricing.groupLessonPrice != null) {
          return coachPricing.groupLessonPrice;
        }
        break;
      case "COMPETITION_PREP":
        if (coachPricing.competitionPrepPrice != null) {
          return coachPricing.competitionPrepPrice;
        }
        break;
      case "OFF_ICE_DANCE":
        if (coachPricing.offIceDancePrice != null) {
          return coachPricing.offIceDancePrice;
        }
        break;
    }
  }

  // 2. Student custom pricing (variable rates set by admin, e.g. for Yura's students)
  if (studentPricing?.customPricingEnabled) {
    switch (type) {
      case "PRIVATE":
        if (studentPricing.privateLessonPrice != null) {
          return studentPricing.privateLessonPrice;
        }
        break;
      case "CHOREOGRAPHY":
        if (studentPricing.choreographyPrice != null) {
          return studentPricing.choreographyPrice;
        }
        break;
      case "GROUP":
        if (studentPricing.groupLessonPrice != null) {
          return studentPricing.groupLessonPrice;
        }
        break;
      case "COMPETITION_PREP":
        if (studentPricing.competitionPrepPrice != null) {
          return studentPricing.competitionPrepPrice;
        }
        break;
      case "OFF_ICE_DANCE":
        if (studentPricing.offIceDancePrice != null) {
          return studentPricing.offIceDancePrice;
        }
        break;
    }
  }

  // 3. Default pricing
  return DEFAULT_LESSON_PRICES[type] ?? DEFAULT_LESSON_PRICES.PRIVATE;
}

/**
 * Get the price for a specific lesson type, pro-rated by duration
 *
 * @param type - The lesson type
 * @param studentPricing - Optional student-specific pricing configuration
 * @param durationMinutes - Duration in minutes (defaults to 60 for backward compatibility)
 * @returns The calculated pro-rated price for the lesson
 *
 * @example
 * // 60-minute private lesson at default $75/hr = $75
 * getLessonTypePrice("PRIVATE") // Returns 75
 *
 * @example
 * // 30-minute private lesson with $50/hr custom rate = $25
 * getLessonTypePrice("PRIVATE", { customPricingEnabled: true, privateLessonPrice: 50 }, 30)
 * // Returns 25
 */
export function getLessonTypePrice(
  type: LessonType,
  studentPricing?: StudentPricing,
  durationMinutes = 60,
  coachPricing?: CoachPricing,
): number {
  const hourlyRate = getHourlyRate(type, studentPricing, coachPricing);
  const duration = Math.max(1, durationMinutes);
  const proratedPrice = (hourlyRate / 60) * duration;
  // Round to 2 decimal places
  return Math.round(proratedPrice * 100) / 100;
}

/**
 * Format price as currency string
 *
 * @param price - The price to format
 * @returns Formatted price string (e.g., "$75.00")
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

/**
 * Get human-readable lesson type label
 *
 * @param type - The lesson type
 * @returns Human-readable label
 */
export function getLessonTypeLabel(type: LessonType): string {
  const labels: Record<LessonType, string> = {
    PRIVATE: "Private Lesson",
    CHOREOGRAPHY: "Choreography",
    GROUP: "Group Lesson",
    COMPETITION_PREP: "Competition Prep",
    OFF_ICE_DANCE: "Off-Ice Dance",
  };

  return labels[type] ?? "Unknown";
}
