// src/features/wardrobe/api/queries/measurementQueries.ts
//
// Caller-scoped measurement procedures. Student id is ALWAYS derived from
// ctx.session.user.id — never accepted as input. measurementsUpdatedAt is
// ALWAYS stamped on update (MEASURE-03), even when the submitted values are
// unchanged from the previous save — the timestamp tracks "last reviewed",
// not just "last mutated".
//
// Procedures:
//   - get    : returns the caller's measurement columns
//   - update : persists submitted measurements + stamps measurementsUpdatedAt

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

/**
 * Measurement update input.
 *
 * Every field is `.nullable().optional()` so the form can either:
 *   - omit the field entirely (`undefined`) — value untouched
 *   - clear the field (`null`)              — cleared in DB
 *
 * The form layer is responsible for mapping empty-string inputs to `null`
 * (NOT `0`). Server enforces sane upper bounds to reject obviously bad data.
 */
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

/**
 * The shape returned by both `get` and `update` — the caller's measurement
 * columns plus the last-updated stamp.
 */
const MEASUREMENT_SELECT = {
  heightCm: true,
  chestCm: true,
  waistCm: true,
  hipsCm: true,
  torsoCm: true,
  inseamCm: true,
  sleeveLengthCm: true,
  preferredFitNotes: true,
  measurementsUpdatedAt: true,
} as const;

export const measurementRouter = createTRPCRouter({
  /**
   * Returns the caller's measurement row. NOT_FOUND when the caller has no
   * Student profile (admins/coaches viewing /wardrobe/measurements would get
   * this; the client should handle the empty case gracefully).
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const student = await ctx.prisma.student.findUnique({
      where: { userId: ctx.session.user.id },
      select: MEASUREMENT_SELECT,
    });

    if (!student) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Student profile required to view measurements",
      });
    }

    return student;
  }),

  /**
   * Persist the submitted measurement values and stamp measurementsUpdatedAt
   * to `new Date()` regardless of whether any field actually changed
   * (MEASURE-03 — stamp even on no-change saves).
   */
  update: protectedProcedure
    .input(measurementUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student profile required to update measurements",
        });
      }

      return ctx.prisma.student.update({
        where: { id: student.id },
        data: {
          ...input,
          measurementsUpdatedAt: new Date(),
        },
        select: MEASUREMENT_SELECT,
      });
    }),
});
