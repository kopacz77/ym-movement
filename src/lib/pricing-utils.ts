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
}

/**
 * Get the HOURLY rate for a specific lesson type
 * Considers student custom pricing if available, otherwise uses defaults
 *
 * @param type - The lesson type
 * @param studentPricing - Optional student-specific pricing configuration
 * @returns The hourly rate for the lesson type
 */
export function getHourlyRate(type: LessonType, studentPricing?: StudentPricing): number {
  // If student has custom pricing enabled, use their custom rates
  if (studentPricing?.customPricingEnabled) {
    switch (type) {
      case "PRIVATE":
        return studentPricing.privateLessonPrice ?? DEFAULT_LESSON_PRICES.PRIVATE;
      case "CHOREOGRAPHY":
        return studentPricing.choreographyPrice ?? DEFAULT_LESSON_PRICES.CHOREOGRAPHY;
      case "GROUP":
        return studentPricing.groupLessonPrice ?? DEFAULT_LESSON_PRICES.GROUP;
      case "COMPETITION_PREP":
        return studentPricing.competitionPrepPrice ?? DEFAULT_LESSON_PRICES.COMPETITION_PREP;
      default:
        return DEFAULT_LESSON_PRICES.PRIVATE;
    }
  }

  // Use default pricing
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
): number {
  const hourlyRate = getHourlyRate(type, studentPricing);
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
  };

  return labels[type] ?? "Unknown";
}
