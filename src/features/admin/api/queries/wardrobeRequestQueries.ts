// src/features/admin/api/queries/wardrobeRequestQueries.ts
//
// Phase 17 backend keystone — admin-side rental approval + lifecycle state
// machine. Exposes TWO sub-routers (wardrobeRequestRouter + wardrobeRentalRouter)
// containing 7 admin procedures that encode the full state transitions from
// PENDING request → APPROVED → CONVERTED → Rental lifecycle → DEPOSIT_RELEASED.
//
// State machine (research Pitfall 8 — locked):
//   respondToRequest APPROVE:  RentalRequest PENDING→APPROVED,  Dress AVAILABLE→PENDING
//   respondToRequest DECLINE:  RentalRequest PENDING→DECLINED,  Dress PENDING→AVAILABLE
//                              (only if it was PENDING from THIS request)
//   markPaymentReceived:       RentalRequest APPROVED→CONVERTED, create Rental,
//                              Dress PENDING→RENTED
//   markReturned:              Rental PAID→RETURNED, set returnedAt + conditionOnReturn
//                              DOES NOT touch Dress.status (stays RENTED)
//   releaseDeposit:            Rental RETURNED→DEPOSIT_RELEASED, set depositReleasedAt,
//                              Dress RENTED→AVAILABLE
//   flagLateFee:               Rental.paymentStatus → LATE_FEE_OWED
//                              DOES NOT touch Dress.status
//
// Atomicity: All multi-row writes wrapped in interactive $transaction. Single-row
// writes (markReturned, flagLateFee) skip the transaction wrapper. Notifications
// fire AFTER tx commits, wrapped in try/catch (non-blocking).

import {
  PaymentMethod,
  type Prisma,
  RentalPaymentStatus,
  RentalRequestStatus,
  RentalType,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createNotification } from "@/features/notifications/utils/notificationHelpers";
import { computeConsignmentPayout } from "@/features/wardrobe/lib/payout";
import {
  sendConsignmentPayoutSentEmail,
  sendDepositReleasedEmail,
  sendRentalConfirmedEmail,
  sendRentalDecisionEmail,
} from "@/lib/email";
import { adminProcedure, createTRPCRouter } from "@/lib/trpc";

/**
 * Maps RentalType to the dress price column that should be snapshotted as
 * Rental.rentalFee. Throws BAD_REQUEST if the caller requested PURCHASE but
 * the dress has no purchase price.
 *
 * RENTAL-02: the snapshot here is what the student pays — admins changing the
 * dress price after a rental is created MUST NOT retroactively re-bill.
 */
function pickRentalFee(
  dress: { competitionPrice: number; seasonalPrice: number; purchasePrice: number | null },
  type: RentalType,
): number {
  switch (type) {
    case RentalType.COMPETITION:
      return dress.competitionPrice;
    case RentalType.SEASONAL:
      return dress.seasonalPrice;
    case RentalType.PURCHASE:
      if (dress.purchasePrice == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This dress is not offered for purchase",
        });
      }
      return dress.purchasePrice;
  }
}

// ---------------------------------------------------------------------------
// wardrobeRequestRouter — 3 procedures
// ---------------------------------------------------------------------------

const listRequestsInputSchema = z.object({
  status: z.nativeEnum(RentalRequestStatus).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

const respondToRequestInputSchema = z.object({
  requestId: z.string().cuid(),
  decision: z.enum(["APPROVE", "DECLINE"]),
  responseMessage: z.string().min(1).max(1000),
});

const markPaymentReceivedInputSchema = z.object({
  requestId: z.string().cuid(),
  paymentMethod: z.nativeEnum(PaymentMethod),
});

export const wardrobeRequestRouter = createTRPCRouter({
  /**
   * ADMIN-04: list rental requests for the admin queue. Defaults to PENDING.
   * Sorted by competitionDate ASC NULLS LAST, then createdAt ASC — urgent
   * competition deadlines surface first; ties broken by request age.
   */
  listRequests: adminProcedure.input(listRequestsInputSchema).query(async ({ ctx, input }) => {
    try {
      const where: Prisma.RentalRequestWhereInput = {
        status: input.status ?? "PENDING",
      };

      const [requests, total] = await Promise.all([
        ctx.prisma.rentalRequest.findMany({
          where,
          include: {
            Dress: {
              select: {
                id: true,
                title: true,
                sizeLabel: true,
                color: true,
                competitionPrice: true,
                seasonalPrice: true,
                purchasePrice: true,
                cleaningFee: true,
                securityDeposit: true,
                consignmentCommissionPct: true,
                status: true,
                Images: {
                  where: { isPrimary: true },
                  select: { url: true },
                  take: 1,
                },
              },
            },
            Student: {
              select: {
                id: true,
                User: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: [{ competitionDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.prisma.rentalRequest.count({ where }),
      ]);

      return { requests, total, page: input.page, limit: input.limit };
    } catch (error) {
      console.error("Error listing rental requests:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list rental requests",
        cause: error,
      });
    }
  }),

  /**
   * ADMIN-05 / ADMIN-06: approve or decline a PENDING rental request.
   *
   * APPROVE: request PENDING→APPROVED, dress AVAILABLE→PENDING (atomic).
   *          BAD_REQUEST if dress.status !== AVAILABLE (already held by
   *          another approved request — research Open Question 1 LOCKED).
   *
   * DECLINE: request PENDING→DECLINED, dress returned to AVAILABLE only if
   *          it was PENDING from THIS request (defensive — a PENDING dress
   *          held by a different APPROVED request must not be flipped).
   *
   * Notification: fired AFTER tx commit, try/catch wrapped, non-blocking.
   */
  respondToRequest: adminProcedure
    .input(respondToRequestInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.$transaction(async (tx) => {
        const request = await tx.rentalRequest.findUnique({
          where: { id: input.requestId },
          select: {
            id: true,
            status: true,
            expiresAt: true,
            dressId: true,
            studentId: true,
            rentalType: true, // NEW — needed for NOTIFY-05 APPROVED totalDueCents
            Dress: {
              select: {
                title: true,
                status: true,
                ownerId: true,
                competitionPrice: true,
                seasonalPrice: true,
                purchasePrice: true,
                cleaningFee: true,
                securityDeposit: true,
              },
            },
            Student: { select: { User: { select: { id: true, name: true, email: true } } } },
          },
        });

        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Rental request not found" });
        }

        if (request.status !== "PENDING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only PENDING requests can be responded to",
          });
        }

        if (request.expiresAt && request.expiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Request has expired" });
        }

        if (input.decision === "APPROVE" && request.Dress.status !== "AVAILABLE") {
          // LOCKED per research Open Question 1 — strict gate at approval time.
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Dress is already held by another approved request",
          });
        }

        const newRequestStatus = input.decision === "APPROVE" ? "APPROVED" : "DECLINED";

        await tx.rentalRequest.update({
          where: { id: request.id },
          data: {
            status: newRequestStatus,
            ownerResponse: input.responseMessage,
            respondedAt: new Date(),
          },
        });

        if (input.decision === "APPROVE") {
          // Approve flips dress AVAILABLE→PENDING (already gated above).
          await tx.dress.update({
            where: { id: request.dressId },
            data: { status: "PENDING" },
          });
        } else if (request.Dress.status === "PENDING") {
          // Decline returns dress to AVAILABLE ONLY if it was PENDING from
          // this request (defensive — never flip a dress held by an
          // unrelated APPROVED request).
          await tx.dress.update({
            where: { id: request.dressId },
            data: { status: "AVAILABLE" },
          });
        }

        return { request, decision: input.decision };
      });

      // Post-commit notification (non-blocking).
      try {
        const isApprove = result.decision === "APPROVE";
        await createNotification({
          userId: result.request.Student.User.id,
          title: isApprove ? "Rental request approved" : "Rental request declined",
          message: isApprove
            ? `Your request for ${result.request.Dress.title} was approved. Please proceed with payment.`
            : `Your request for ${result.request.Dress.title} was declined. ${input.responseMessage}`,
          type: isApprove ? "SUCCESS" : "WARNING",
          link: "/wardrobe/my-rentals",
        });
      } catch (err) {
        console.error("[WARDROBE] Failed to notify student:", err);
      }

      // NOTIFY-05 (Phase 20): email the student of the decision. Discriminated
      // union on data.decision lets one helper render APPROVED + DECLINED with
      // shared chrome. APPROVED branch computes totalDueCents by snapshotting
      // fees from request.Dress (mirrors RENTAL-02 in markPaymentReceived).
      try {
        if (result.decision === "APPROVE") {
          const rentalFee = pickRentalFee(result.request.Dress, result.request.rentalType);
          const totalDueCents =
            rentalFee + result.request.Dress.cleaningFee + result.request.Dress.securityDeposit;
          await sendRentalDecisionEmail(
            result.request.Student.User.email,
            result.request.Student.User.name ?? "Student",
            {
              decision: "APPROVED",
              dressTitle: result.request.Dress.title,
              responseMessage: input.responseMessage,
              totalDueCents,
            },
          );
        } else {
          await sendRentalDecisionEmail(
            result.request.Student.User.email,
            result.request.Student.User.name ?? "Student",
            {
              decision: "DECLINED",
              dressTitle: result.request.Dress.title,
              responseMessage: input.responseMessage,
            },
          );
        }
      } catch (err) {
        console.error("[WARDROBE] Failed to email student of decision:", err);
      }

      return { id: result.request.id, decision: result.decision };
    }),

  /**
   * RENTAL-01 + RENTAL-02 + RENTAL-03: convert an APPROVED request into a
   * PAID Rental row. Snapshots rentalFee / cleaningFee / securityDeposit
   * from the dress at conversion time. Computes consignmentPayoutAmount
   * per RENTAL-03 (LOCKED): 0% commission ⇒ null payout (platform-owned).
   *
   * Atomic: request APPROVED→CONVERTED, Rental created (PAID), dress
   * PENDING→RENTED.
   */
  markPaymentReceived: adminProcedure
    .input(markPaymentReceivedInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.$transaction(async (tx) => {
        const request = await tx.rentalRequest.findUnique({
          where: { id: input.requestId },
          select: {
            id: true,
            status: true,
            dressId: true,
            studentId: true,
            rentalType: true,
            startDate: true,
            endDate: true,
            Dress: {
              select: {
                id: true,
                title: true,
                status: true,
                competitionPrice: true,
                seasonalPrice: true,
                purchasePrice: true,
                cleaningFee: true,
                securityDeposit: true,
                consignmentCommissionPct: true,
              },
            },
            Student: { select: { User: { select: { id: true, name: true, email: true } } } },
          },
        });

        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Rental request not found" });
        }

        if (request.status !== "APPROVED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only APPROVED requests can be converted",
          });
        }

        if (request.Dress.status !== "PENDING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Dress is not in PENDING state",
          });
        }

        // RENTAL-02: snapshot fees from the dress AT THIS MOMENT.
        const rentalFee = pickRentalFee(request.Dress, request.rentalType);
        const consignmentPayoutAmount = computeConsignmentPayout(request.Dress, rentalFee);
        const totalCharged = rentalFee + request.Dress.cleaningFee + request.Dress.securityDeposit;

        await tx.rentalRequest.update({
          where: { id: request.id },
          data: { status: "CONVERTED" },
        });

        const created = await tx.rental.create({
          data: {
            dressId: request.dressId,
            studentId: request.studentId,
            requestId: request.id,
            rentalType: request.rentalType,
            startDate: request.startDate,
            endDate: request.endDate,
            rentalFee,
            cleaningFee: request.Dress.cleaningFee,
            securityDeposit: request.Dress.securityDeposit,
            totalCharged,
            paymentMethod: input.paymentMethod,
            paymentStatus: "PAID",
            depositCollectedAt: new Date(),
            consignmentPayoutAmount,
          },
        });

        await tx.dress.update({
          where: { id: request.dressId },
          data: { status: "RENTED" },
        });

        return { created, request };
      });

      // Post-commit notification (non-blocking).
      try {
        await createNotification({
          userId: result.request.Student.User.id,
          title: "Payment confirmed",
          message: `Your rental of ${result.request.Dress.title} is confirmed. See you on the ice!`,
          type: "SUCCESS",
          link: "/wardrobe/my-rentals",
        });
      } catch (err) {
        console.error("[WARDROBE] Failed to notify student:", err);
      }

      // NOTIFY-06 (Phase 20): email the student that their rental is confirmed.
      try {
        await sendRentalConfirmedEmail(
          result.request.Student.User.email,
          result.request.Student.User.name ?? "Student",
          {
            dressTitle: result.request.Dress.title,
            rentalType: result.request.rentalType,
            startDate: result.request.startDate,
            endDate: result.request.endDate,
            totalChargedCents: result.created.totalCharged,
            paymentMethod: input.paymentMethod,
          },
        );
      } catch (err) {
        console.error("[WARDROBE] Failed to email student of rental confirmation:", err);
      }

      return { id: result.created.id };
    }),
});

// ---------------------------------------------------------------------------
// wardrobeRentalRouter — 4 procedures
// ---------------------------------------------------------------------------

const listRentalsInputSchema = z.object({
  paymentStatus: z.array(z.nativeEnum(RentalPaymentStatus)).optional(),
  outstandingPayoutsOnly: z.boolean().optional(), // RENTAL-08 — admin "Outstanding Payouts" tab filter
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

const markReturnedInputSchema = z.object({
  rentalId: z.string().cuid(),
  conditionOnReturn: z.string().min(1).max(2000),
});

const releaseDepositInputSchema = z.object({ rentalId: z.string().cuid() });

const flagLateFeeInputSchema = z.object({ rentalId: z.string().cuid() });

const markConsignmentPaidOutInputSchema = z.object({ rentalId: z.string().cuid() });

export const wardrobeRentalRouter = createTRPCRouter({
  /**
   * RENTAL-04: admin rentals list. Defaults to active rentals
   * (PAID + RETURNED). AWAITING_PAYMENT surfaces on the Requests page;
   * DEPOSIT_RELEASED is closed (filterable on demand); LATE_FEE_OWED is
   * surfaced via a separate UI filter.
   *
   * Sorted by endDate ASC (rentals nearest to return-due surface first),
   * then createdAt ASC.
   */
  listRentals: adminProcedure.input(listRentalsInputSchema).query(async ({ ctx, input }) => {
    try {
      // RENTAL-08: when outstandingPayoutsOnly is set, override the default
      // paymentStatus filter and constrain to consigned + not-yet-paid rentals.
      // Otherwise: default to active rentals (PAID + RETURNED) or whatever the
      // caller-supplied paymentStatus array contains.
      const where: Prisma.RentalWhereInput = input.outstandingPayoutsOnly
        ? {
            consignmentPayoutAmount: { not: null },
            consignmentPaidOut: false,
            ...(input.paymentStatus ? { paymentStatus: { in: input.paymentStatus } } : {}),
          }
        : {
            paymentStatus: {
              in: input.paymentStatus ?? ["PAID", "RETURNED"],
            },
          };

      const [rentals, total] = await Promise.all([
        ctx.prisma.rental.findMany({
          where,
          include: {
            Dress: {
              select: {
                id: true,
                title: true,
                sizeLabel: true,
                color: true,
                Images: {
                  where: { isPrimary: true },
                  select: { url: true },
                  take: 1,
                },
                Owner: { select: { id: true, name: true } }, // RENTAL-08 — confirm-toast in RentalsTable
              },
            },
            Student: {
              select: {
                id: true,
                User: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: [{ endDate: "asc" }, { createdAt: "asc" }],
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.prisma.rental.count({ where }),
      ]);

      return { rentals, total, page: input.page, limit: input.limit };
    } catch (error) {
      console.error("Error listing rentals:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list rentals",
        cause: error,
      });
    }
  }),

  /**
   * RENTAL-05: mark a PAID rental as returned. Sets returnedAt +
   * conditionOnReturn.
   *
   * CRITICAL (research Pitfall 8): does NOT touch Dress.status. The dress
   * stays RENTED through RETURNED until releaseDeposit completes the
   * lifecycle. This prevents a dress from being re-rented while the admin
   * is still inspecting the returned garment.
   *
   * No notification — release-deposit is the next user-facing milestone;
   * "returned" is an internal bookkeeping event.
   */
  markReturned: adminProcedure.input(markReturnedInputSchema).mutation(async ({ ctx, input }) => {
    const rental = await ctx.prisma.rental.findUnique({
      where: { id: input.rentalId },
      select: { id: true, paymentStatus: true },
    });

    if (!rental) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Rental not found" });
    }

    if (rental.paymentStatus !== "PAID") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only PAID rentals can be marked returned",
      });
    }

    return ctx.prisma.rental.update({
      where: { id: rental.id },
      data: {
        paymentStatus: "RETURNED",
        returnedAt: new Date(),
        conditionOnReturn: input.conditionOnReturn,
      },
    });
  }),

  /**
   * RENTAL-06: release the security deposit on a RETURNED rental. Flips
   * the rental to DEPOSIT_RELEASED and the dress back to AVAILABLE — the
   * lifecycle close. Atomic: rental + dress must flip together so the dress
   * never sits in an orphan RENTED state with no live Rental row.
   *
   * Notification: fired AFTER tx commit, try/catch wrapped, non-blocking.
   */
  releaseDeposit: adminProcedure
    .input(releaseDepositInputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.$transaction(async (tx) => {
        const rental = await tx.rental.findUnique({
          where: { id: input.rentalId },
          select: {
            id: true,
            dressId: true,
            paymentStatus: true,
            securityDeposit: true, // NEW — for NOTIFY-08 email body
            Student: { select: { User: { select: { id: true, name: true, email: true } } } },
            Dress: { select: { title: true } },
          },
        });

        if (!rental) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Rental not found" });
        }

        if (rental.paymentStatus !== "RETURNED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Rental must be RETURNED before deposit release",
          });
        }

        const updated = await tx.rental.update({
          where: { id: rental.id },
          data: {
            paymentStatus: "DEPOSIT_RELEASED",
            depositReleasedAt: new Date(),
          },
        });

        await tx.dress.update({
          where: { id: rental.dressId },
          data: { status: "AVAILABLE" },
        });

        return { updated, rental };
      });

      // Post-commit notification (non-blocking).
      try {
        await createNotification({
          userId: result.rental.Student.User.id,
          title: "Deposit released",
          message: `Your security deposit for ${result.rental.Dress.title} has been released. Thank you!`,
          type: "SUCCESS",
          link: "/wardrobe/my-rentals",
        });
      } catch (err) {
        console.error("[WARDROBE] Failed to notify student:", err);
      }

      // NOTIFY-08 (Phase 20): email the student that their deposit has been released.
      try {
        await sendDepositReleasedEmail(
          result.rental.Student.User.email,
          result.rental.Student.User.name ?? "Student",
          {
            dressTitle: result.rental.Dress.title,
            depositAmountCents: result.rental.securityDeposit,
          },
        );
      } catch (err) {
        console.error("[WARDROBE] Failed to email student of deposit release:", err);
      }

      return { id: result.updated.id };
    }),

  /**
   * RENTAL-07: flag a rental as late-fee owed. Does NOT touch Dress.status
   * (research Pitfall 8 — dress can remain RENTED or already be released;
   * late-fee is orthogonal to the dress lifecycle).
   *
   * BAD_REQUEST if the rental is already DEPOSIT_RELEASED (closed — no
   * remaining fee can be assessed via this flag; admins should pursue
   * out-of-band collection).
   *
   * No notification: Phase 20 owns the email layer for fee collection.
   */
  flagLateFee: adminProcedure.input(flagLateFeeInputSchema).mutation(async ({ ctx, input }) => {
    const rental = await ctx.prisma.rental.findUnique({
      where: { id: input.rentalId },
      select: { id: true, paymentStatus: true },
    });

    if (!rental) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Rental not found" });
    }

    if (rental.paymentStatus === "DEPOSIT_RELEASED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot flag a closed rental",
      });
    }

    return ctx.prisma.rental.update({
      where: { id: rental.id },
      data: { paymentStatus: "LATE_FEE_OWED" },
    });
  }),

  /**
   * RENTAL-08 / CONSIGN-10: Admin marks a rental's consignment payout as sent.
   *
   * Defense-in-depth (4 layers):
   *   1. NOT_FOUND — unknown rentalId.
   *   2. BAD_REQUEST — rental.consignmentPayoutAmount IS NULL (Yura-owned dress,
   *      no consigner to pay).
   *   3. BAD_REQUEST — rental.consignmentPaidOut === true (idempotency / double-
   *      toggle guard — matches Phase 17 markReturned/releaseDeposit strictness).
   *   4. UI-side: button hidden when not eligible (server is belt-and-suspenders).
   *
   * Notification: in-app createNotification ONLY (try/catch, non-blocking).
   * Phase 20 (NOTIFY-09) wires the Resend email side-by-side with this — do NOT
   * add email here.
   *
   * Closed state: once consignmentPaidOut === true, NO transition back. Same
   * convention as paymentStatus === DEPOSIT_RELEASED and Dress.status === ARCHIVED.
   */
  markConsignmentPaidOut: adminProcedure
    .input(markConsignmentPaidOutInputSchema)
    .mutation(async ({ ctx, input }) => {
      const rental = await ctx.prisma.rental.findUnique({
        where: { id: input.rentalId },
        select: {
          id: true,
          consignmentPayoutAmount: true,
          consignmentPaidOut: true,
          Dress: {
            select: {
              title: true,
              Owner: { select: { id: true, name: true, email: true } }, // email NEW for NOTIFY-09
            },
          },
        },
      });

      if (!rental) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Rental not found" });
      }
      if (rental.consignmentPayoutAmount == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This rental has no consignment payout (Yura-owned dress)",
        });
      }
      if (rental.consignmentPaidOut) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payout already marked as sent",
        });
      }

      const updated = await ctx.prisma.rental.update({
        where: { id: rental.id },
        data: {
          consignmentPaidOut: true,
          consignmentPaidOutAt: new Date(),
        },
      });

      // Post-commit in-app notification — non-blocking. Phase 20 adds the email
      // line beside this call (do NOT replace; both run together).
      try {
        await createNotification({
          userId: rental.Dress.Owner.id,
          title: "Consignment payout sent",
          message: `Your payout for "${rental.Dress.title}" has been sent.`,
          type: "SUCCESS",
          link: "/wardrobe/consigned?tab=earnings",
        });
      } catch (err) {
        console.error("[WARDROBE] Failed to notify consigner of payout:", err);
      }

      // NOTIFY-09 (Phase 20): email the consigner that their payout has been sent.
      // consignmentPayoutAmount is non-null here — the defensive check above throws
      // BAD_REQUEST when it's null, so the `?? 0` fallback is unreachable at
      // runtime (kept for TS narrowing cleanliness, avoids the `!` assertion).
      try {
        await sendConsignmentPayoutSentEmail(
          rental.Dress.Owner.email,
          rental.Dress.Owner.name ?? "Consigner",
          {
            dressTitle: rental.Dress.title,
            payoutAmountCents: rental.consignmentPayoutAmount ?? 0,
          },
        );
      } catch (err) {
        console.error("[WARDROBE] Failed to email consigner of payout:", err);
      }

      return { id: updated.id };
    }),
});
