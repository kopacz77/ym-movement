// src/lib/pricing-utils.ts

import type { LessonType } from "@prisma/client";

/**
 * Default pricing for each lesson type
 * Single source of truth for lesson pricing across the application
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
 * Get the price for a specific lesson type
 * Considers student custom pricing if available, otherwise uses defaults
 *
 * @param type - The lesson type
 * @param studentPricing - Optional student-specific pricing configuration
 * @returns The calculated price for the lesson
 */
export function getLessonTypePrice(type: LessonType, studentPricing?: StudentPricing): number {
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
