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
import {
  type MeasurementUpdateInput,
  measurementUpdateSchema,
} from "@/features/wardrobe/lib/measurementSchema";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

// Canonical schema lives in the client-safe lib module so MeasurementForm can
// import it without pulling @trpc/server into the browser. Re-exported here so
// any existing server-side importers keep working unchanged.
export { measurementUpdateSchema };
export type { MeasurementUpdateInput };

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
  update: protectedProcedure.input(measurementUpdateSchema).mutation(async ({ ctx, input }) => {
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
