// src/features/wardrobe/api/queries/requestQueries.ts
//
// Student-side rental request procedures. Phase 16 keystone — every UI surface
// in Plans 16-02..16-07 (detail page CTA, RequestRentalDialog, my-rentals
// tabs, conflict warnings) is a client of these five procedures.
//
// Procedures (all protectedProcedure, NOT adminProcedure — caller is the
// requesting student; admins/coaches viewing the catalog see the same surface):
//   - checkAvailability : pre-flight overlap check, advisory (final check
//                         happens server-side inside create)
//   - create            : insert RentalRequest, fire in-app Notification to
//                         dress owner (Yura or consigner), set expiresAt
//   - cancel            : caller-owns-the-request guard (PERM-03); flips
//                         status to CANCELED; does NOT touch Dress.status
//   - mine              : caller's own RentalRequest history
//   - myRentals         : caller's own Rental history
//
// PERM-03: cancel + mine + myRentals all enforce caller-owns via inline Student
// row lookup + studentId equality. No new studentProcedure middleware
// (research Pattern 3).

import { RentalType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { addDays } from "date-fns";
import { z } from "zod";
import { getWardrobeSettings } from "@/features/admin/api/queries/wardrobeSettingsQueries";
import { createNotification } from "@/features/notifications/utils/notificationHelpers";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

/**
 * Shared input schema for `create`. Exported so the Wave 2
 * RequestRentalDialog (Plan 16-05) can validate against the EXACT shape the
 * server parses — zero schema duplication, drift structurally impossible.
 *
 * Refinements enforce calendar invariants the UI must respect:
 *  1. endDate > startDate
 *  2. competitionDate (if present) sits inside [startDate, endDate]
 */
export const createRequestSchema = z
  .object({
    dressId: z.string().cuid(),
    rentalType: z.nativeEnum(RentalType),
    startDate: z.date(),
    endDate: z.date(),
    competitionName: z.string().max(120).optional(),
    competitionDate: z.date().optional(),
    message: z
      .string()
      .min(20, "Tell the owner why you're a great match (20+ chars)")
      .max(1000),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  })
  .refine(
    (d) =>
      !d.competitionDate ||
      (d.competitionDate >= d.startDate && d.competitionDate <= d.endDate),
    {
      message: "Competition date must fall inside the rental window",
      path: ["competitionDate"],
    },
  );

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const requestsRouter = createTRPCRouter({
  /**
   * Advisory pre-flight check. The UI calls this on date-range change to
   * disable the "Request Rental" CTA and surface conflicting windows BEFORE
   * the user composes a message.
   *
   * Predicate mirrors catalogQueries.ts L131-158 exactly — anti-join against
   * Rental(AWAITING_PAYMENT|PAID) + RentalRequest(APPROVED). The canonical
   * authority is the create-time re-check (Pitfall 4: client-side throttle +
   * race conditions); this query is advisory only.
   */
  checkAvailability: protectedProcedure
    .input(
      z.object({
        dressId: z.string().cuid(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.endDate <= input.startDate) {
        return { available: false, reason: "Invalid date range" as const };
      }

      const [conflictingRental, conflictingApproved] = await Promise.all([
        ctx.prisma.rental.findFirst({
          where: {
            dressId: input.dressId,
            paymentStatus: { in: ["AWAITING_PAYMENT", "PAID"] },
            startDate: { lte: input.endDate },
            endDate: { gte: input.startDate },
          },
          select: { id: true, startDate: true, endDate: true },
        }),
        ctx.prisma.rentalRequest.findFirst({
          where: {
            dressId: input.dressId,
            status: "APPROVED",
            startDate: { lte: input.endDate },
            endDate: { gte: input.startDate },
          },
          select: { id: true, startDate: true, endDate: true },
        }),
      ]);

      const conflict = conflictingRental ?? conflictingApproved;
      if (conflict) {
        return {
          available: false,
          reason: "Already booked" as const,
          conflictStart: conflict.startDate,
          conflictEnd: conflict.endDate,
        };
      }

      return { available: true as const, reason: null };
    }),

  /**
   * Create a new PENDING RentalRequest.
   *
   * Steps:
   *   1. Resolve caller Student (FORBIDDEN if caller has no Student row).
   *   2. Resolve target Dress, gate on status + ownership (Pitfall 9 —
   *      self-request rejection).
   *   3. Re-run the overlap anti-join inside this procedure as defense in
   *      depth against debounced-client races (Pitfall 4). The check is
   *      byte-identical to checkAvailability above.
   *   4. Resolve wardrobeRentalRequestExpiryDays from Settings; compute
   *      expiresAt (Pitfall 10 — never hardcode the 7-day default).
   *   5. Insert RentalRequest with status=PENDING.
   *   6. Fire in-app Notification to the DRESS OWNER (Yura or consigner),
   *      NOT the requester. Wrapped in try/catch so notification infra
   *      failures cannot roll back a successful request (pattern from
   *      bookingQueries.ts L389-403).
   *
   * Email notification is intentionally NOT sent here — Phase 20 owns the
   * email layer; the in-app Notification row is sufficient for the inbox UI.
   */
  create: protectedProcedure
    .input(createRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // Step 1: caller Student row
      const student = await ctx.prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true, User: { select: { name: true } } },
      });
      if (!student) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only students can request a rental",
        });
      }

      // Step 2: dress + ownership/status gates
      const dress = await ctx.prisma.dress.findUnique({
        where: { id: input.dressId },
        select: { id: true, ownerId: true, title: true, status: true },
      });
      if (!dress) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dress not found" });
      }
      if (dress.status !== "AVAILABLE" && dress.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This dress is not available for new requests",
        });
      }
      if (dress.ownerId === ctx.session.user.id) {
        // Pitfall 9: prevent self-requests (admin/owner browsing their own listing)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot request your own dress",
        });
      }

      // Step 3: server-side overlap re-check (Pitfall 4 — defense in depth)
      const [conflictingRental, conflictingApproved] = await Promise.all([
        ctx.prisma.rental.findFirst({
          where: {
            dressId: input.dressId,
            paymentStatus: { in: ["AWAITING_PAYMENT", "PAID"] },
            startDate: { lte: input.endDate },
            endDate: { gte: input.startDate },
          },
          select: { id: true },
        }),
        ctx.prisma.rentalRequest.findFirst({
          where: {
            dressId: input.dressId,
            status: "APPROVED",
            startDate: { lte: input.endDate },
            endDate: { gte: input.startDate },
          },
          select: { id: true },
        }),
      ]);
      if (conflictingRental || conflictingApproved) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Window no longer available",
        });
      }

      // Step 4: expiresAt from Settings (Pitfall 10)
      const settings = await getWardrobeSettings(ctx.prisma);
      const expiresAt = addDays(new Date(), settings.wardrobeRentalRequestExpiryDays);

      // Step 5: insert
      const created = await ctx.prisma.rentalRequest.create({
        data: {
          dressId: input.dressId,
          studentId: student.id,
          rentalType: input.rentalType,
          startDate: input.startDate,
          endDate: input.endDate,
          competitionName: input.competitionName,
          competitionDate: input.competitionDate,
          message: input.message,
          status: "PENDING",
          expiresAt,
        },
        select: { id: true, dressId: true, status: true },
      });

      // Step 6: in-app notification to dress owner
      // notification target is dress owner (Yura or consigner), NOT the requester (Pitfall 5)
      try {
        await createNotification({
          userId: dress.ownerId,
          title: "New rental request",
          message: `${student.User.name ?? "A student"} requested ${dress.title}`,
          type: "INFO",
          link: "/admin/wardrobe/requests",
        });
      } catch (err) {
        console.error("[WARDROBE] Failed to notify dress owner:", err);
        // Non-blocking: the request itself succeeded.
      }

      return created;
    }),

  // ---------------------------------------------------------------------------
  // Task 2 stubs — flesh out cancel/mine/myRentals in the next task so this
  // file stays compilable in between.
  // ---------------------------------------------------------------------------

  cancel: protectedProcedure
    .input(z.object({ requestId: z.string().cuid() }))
    .mutation(async () => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "cancel not implemented yet",
      });
    }),

  mine: protectedProcedure.query(async () => {
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "mine not implemented yet",
    });
  }),

  myRentals: protectedProcedure.query(async () => {
    throw new TRPCError({
      code: "NOT_IMPLEMENTED",
      message: "myRentals not implemented yet",
    });
  }),
});
