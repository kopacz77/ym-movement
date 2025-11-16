// src/lib/pricing.ts
import { LessonType } from "@prisma/client";

/**
 * Default pricing for a 1-hour lesson (60 minutes) for each lesson type
 * These are fallback values if no DefaultPricing record exists in the database
 */
export const DEFAULT_HOURLY_PRICES = {
  [LessonType.PRIVATE]: 120,
  [LessonType.CHOREOGRAPHY]: 150,
  [LessonType.GROUP]: 80,
  [LessonType.COMPETITION_PREP]: 180,
} as const;

/**
 * Calculate prorated price based on lesson duration
 *
 * @param hourlyRate - The hourly rate for the lesson type
 * @param durationMinutes - The actual lesson duration in minutes
 * @returns The prorated price for the lesson
 *
 * @example
 * // 60-minute private lesson at $120/hour
 * calculateProratedPrice(120, 60) // Returns 120
 *
 * @example
 * // 30-minute private lesson at $120/hour
 * calculateProratedPrice(120, 30) // Returns 60
 *
 * @example
 * // 45-minute choreography lesson at $150/hour
 * calculateProratedPrice(150, 45) // Returns 112.50
 */
export function calculateProratedPrice(hourlyRate: number, durationMinutes: number): number {
  // Ensure minimum 1 minute to avoid division issues
  const duration = Math.max(1, durationMinutes);

  // Calculate pro-rated price: (hourlyRate / 60) * durationMinutes
  const proratedPrice = (hourlyRate / 60) * duration;

  // Round to 2 decimal places
  return Math.round(proratedPrice * 100) / 100;
}

/**
 * Get the hourly rate for a lesson type, considering custom student pricing
 *
 * @param lessonType - The type of lesson
 * @param student - Student object with custom pricing information
 * @param defaultPricing - Default pricing from database settings
 * @returns The hourly rate for the lesson type
 */
export function getHourlyRateForLessonType(
  lessonType: LessonType,
  student: {
    customPricingEnabled: boolean;
    privateLessonPrice?: number | null;
    groupLessonPrice?: number | null;
    choreographyPrice?: number | null;
    competitionPrepPrice?: number | null;
  },
  defaultPricing?: {
    privateLessonPrice: number;
    groupLessonPrice: number;
    choreographyPrice: number;
    competitionPrice: number;
  } | null,
): number {
  // Check if student has custom pricing enabled and specific price set
  if (student.customPricingEnabled) {
    switch (lessonType) {
      case LessonType.PRIVATE:
        if (student.privateLessonPrice !== null && student.privateLessonPrice !== undefined) {
          return student.privateLessonPrice;
        }
        break;
      case LessonType.CHOREOGRAPHY:
        if (student.choreographyPrice !== null && student.choreographyPrice !== undefined) {
          return student.choreographyPrice;
        }
        break;
      case LessonType.GROUP:
        if (student.groupLessonPrice !== null && student.groupLessonPrice !== undefined) {
          return student.groupLessonPrice;
        }
        break;
      case LessonType.COMPETITION_PREP:
        if (student.competitionPrepPrice !== null && student.competitionPrepPrice !== undefined) {
          return student.competitionPrepPrice;
        }
        break;
    }
  }

  // Use default pricing from database if available
  if (defaultPricing) {
    switch (lessonType) {
      case LessonType.PRIVATE:
        return defaultPricing.privateLessonPrice;
      case LessonType.CHOREOGRAPHY:
        return defaultPricing.choreographyPrice;
      case LessonType.GROUP:
        return defaultPricing.groupLessonPrice;
      case LessonType.COMPETITION_PREP:
        return defaultPricing.competitionPrice;
    }
  }

  // Fallback to hardcoded defaults
  return DEFAULT_HOURLY_PRICES[lessonType];
}

/**
 * Calculate the final price for a lesson considering duration and pricing rules
 *
 * @param lessonType - The type of lesson
 * @param durationMinutes - The lesson duration in minutes
 * @param student - Student object with custom pricing information
 * @param defaultPricing - Default pricing from database settings
 * @returns The final calculated price for the lesson
 *
 * @example
 * // 30-minute private lesson for student with custom $100/hr rate
 * calculateLessonPrice(
 *   LessonType.PRIVATE,
 *   30,
 *   { customPricingEnabled: true, privateLessonPrice: 100 },
 *   null
 * ) // Returns 50
 */
export function calculateLessonPrice(
  lessonType: LessonType,
  durationMinutes: number,
  student: {
    customPricingEnabled: boolean;
    privateLessonPrice?: number | null;
    groupLessonPrice?: number | null;
    choreographyPrice?: number | null;
    competitionPrepPrice?: number | null;
  },
  defaultPricing?: {
    privateLessonPrice: number;
    groupLessonPrice: number;
    choreographyPrice: number;
    competitionPrice: number;
  } | null,
): number {
  const hourlyRate = getHourlyRateForLessonType(lessonType, student, defaultPricing);
  return calculateProratedPrice(hourlyRate, durationMinutes);
}
