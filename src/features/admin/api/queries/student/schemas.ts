import { Level } from "@prisma/client";
// src/features/admin/api/queries/student/schemas.ts
import { z } from "zod";

// Student form schema - used for creating and updating students
export const studentFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  level: z.nativeEnum(Level),
  maxLessonsPerWeek: z.number().min(1, "Minimum 1 lesson per week"),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    })
    .optional(),
  notes: z.string().optional(),
  dateOfBirth: z.string().optional(),
  active: z.boolean().optional(),
});

// Pricing schemas
export const defaultPricingSchema = z.object({
  privateLessonPrice: z.number().min(0),
  groupLessonPrice: z.number().min(0),
  choreographyPrice: z.number().min(0),
  competitionPrice: z.number().min(0),
});

export const studentPricingSchema = z.object({
  studentId: z.string(),
  customPricingEnabled: z.boolean(),
  privateLessonPrice: z.number().nullable(),
  groupLessonPrice: z.number().nullable(),
  choreographyPrice: z.number().nullable(),
  competitionPrepPrice: z.number().nullable(),
});

// Type for student response that includes invitation flag
export interface StudentWithInviteStatus {
  id: string;
  userId: string;
  inviteSent?: boolean;
  user: {
    name: string | null;
    email: string;
  };
  [key: string]: unknown;
}
