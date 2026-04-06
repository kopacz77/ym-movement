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
  [LessonType.OFF_ICE_DANCE]: 100,
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
 * Get the hourly rate for a lesson type
 *
 * Pricing waterfall:
 * 1. Coach pricing (highest priority - each coach sets their own rates)
 * 2. Student custom pricing (variable rates set by admin, used when no coach pricing)
 * 3. Default pricing from database
 * 4. Hardcoded fallback defaults
 *
 * @param lessonType - The type of lesson
 * @param student - Student object with custom pricing information
 * @param defaultPricing - Default pricing from database settings
 * @param coach - Coach-specific pricing
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
    offIceDancePrice?: number | null;
  },
  defaultPricing?: {
    privateLessonPrice: number;
    groupLessonPrice: number;
    choreographyPrice: number;
    competitionPrice: number;
    offIceDancePrice: number;
  } | null,
  coach?: {
    privateLessonPrice?: number | null;
    groupLessonPrice?: number | null;
    choreographyPrice?: number | null;
    competitionPrepPrice?: number | null;
    offIceDancePrice?: number | null;
  } | null,
): number {
  // 1. Coach pricing takes priority — each coach sets their own rates
  if (coach) {
    switch (lessonType) {
      case LessonType.PRIVATE:
        if (coach.privateLessonPrice !== null && coach.privateLessonPrice !== undefined) {
          return coach.privateLessonPrice;
        }
        break;
      case LessonType.CHOREOGRAPHY:
        if (coach.choreographyPrice !== null && coach.choreographyPrice !== undefined) {
          return coach.choreographyPrice;
        }
        break;
      case LessonType.GROUP:
        if (coach.groupLessonPrice !== null && coach.groupLessonPrice !== undefined) {
          return coach.groupLessonPrice;
        }
        break;
      case LessonType.COMPETITION_PREP:
        if (coach.competitionPrepPrice !== null && coach.competitionPrepPrice !== undefined) {
          return coach.competitionPrepPrice;
        }
        break;
      case LessonType.OFF_ICE_DANCE:
        if (coach.offIceDancePrice !== null && coach.offIceDancePrice !== undefined) {
          return coach.offIceDancePrice;
        }
        break;
    }
  }

  // 2. Student custom pricing (variable rates set by admin, e.g. for Yura's students)
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
      case LessonType.OFF_ICE_DANCE:
        if (student.offIceDancePrice !== null && student.offIceDancePrice !== undefined) {
          return student.offIceDancePrice;
        }
        break;
    }
  }

  // 3. Default pricing from database
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
      case LessonType.OFF_ICE_DANCE:
        return defaultPricing.offIceDancePrice;
    }
  }

  // 4. Hardcoded fallback defaults
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
    offIceDancePrice?: number | null;
  },
  defaultPricing?: {
    privateLessonPrice: number;
    groupLessonPrice: number;
    choreographyPrice: number;
    competitionPrice: number;
    offIceDancePrice: number;
  } | null,
  coach?: {
    privateLessonPrice?: number | null;
    groupLessonPrice?: number | null;
    choreographyPrice?: number | null;
    competitionPrepPrice?: number | null;
    offIceDancePrice?: number | null;
  } | null,
): number {
  const hourlyRate = getHourlyRateForLessonType(lessonType, student, defaultPricing, coach);
  return calculateProratedPrice(hourlyRate, durationMinutes);
}
