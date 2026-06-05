// src/features/wardrobe/lib/measurementSchema.ts
//
// Client-safe Zod schema for the student measurement form. Pure zod — no
// @/lib/trpc, no @trpc/server — so MeasurementForm (a client component) can
// import it without pulling the server TRPC stack into the browser bundle.
// The server router (measurementQueries.ts) re-exports from here so its
// .input() stays in sync.
//
// Every field is `.nullable().optional()` so the form can either omit a field
// (undefined → untouched) or clear it (null → cleared). The form maps empty
// inputs to null (not 0). Server enforces sane upper bounds.

import { z } from "zod";

export const measurementUpdateSchema = z.object({
  heightCm: z.number().int().positive().max(250).nullable().optional(),
  chestCm: z.number().int().positive().max(200).nullable().optional(),
  waistCm: z.number().int().positive().max(200).nullable().optional(),
  hipsCm: z.number().int().positive().max(200).nullable().optional(),
  torsoCm: z.number().int().positive().max(200).nullable().optional(),
  inseamCm: z.number().int().positive().max(200).nullable().optional(),
  sleeveLengthCm: z.number().int().positive().max(200).nullable().optional(),
  preferredFitNotes: z.string().max(500).nullable().optional(),
});

export type MeasurementUpdateInput = z.infer<typeof measurementUpdateSchema>;
