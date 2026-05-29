// src/features/wardrobe/api/queries/catalogQueries.ts
//
// Public-ish wardrobe catalog procedures. CAT-08 is enforced at the SQL select
// level via PUBLIC_DRESS_SELECT — never include internalNotes or
// consignmentCommissionPct in any response from this file.
//
// Procedures:
//   - list   : filtered/sorted/paginated catalog (AVAILABLE+PENDING only)
//   - byId   : single dress lookup (browse-only; ARCHIVED/REJECTED 404)
//   - facets : distinct colors/sizeLabels for filter UI hydration
//
// Authorization: protectedProcedure (matches research recommendation — no
// studentProcedure exists). Coaches and admins viewing /wardrobe see the same
// catalog (intentional per research Open Question 4).

import { type DressStatus, type Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { catalogFilterSchema } from "@/features/wardrobe/lib/catalogFilters";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

/**
 * Public-safe Prisma select for Dress rows. Used by every procedure in this
 * file. Lists EVERY column a student is allowed to see; DELIBERATELY OMITS
 * internalNotes, consignmentCommissionPct, archivedAt, and ownerId.
 *
 * Anchored as a `Prisma.DressSelect` via `satisfies` so adding a sensitive
 * column to the Dress model without updating this select would NOT auto-leak
 * (the satisfies check prevents widening). New safe columns must be added
 * here explicitly.
 */
export const PUBLIC_DRESS_SELECT = {
  id: true,
  title: true,
  description: true,
  category: true,
  themeTags: true,
  color: true,
  secondaryColors: true,
  condition: true,
  yearMade: true,
  sizeLabel: true,
  chestMinCm: true,
  chestMaxCm: true,
  waistMinCm: true,
  waistMaxCm: true,
  hipsMinCm: true,
  hipsMaxCm: true,
  torsoMinCm: true,
  torsoMaxCm: true,
  lengthCm: true,
  alterableSmaller: true,
  alterableLarger: true,
  competitionPrice: true,
  seasonalPrice: true,
  purchasePrice: true,
  securityDeposit: true,
  cleaningFee: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  Owner: { select: { id: true, name: true } },
  Images: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, url: true, isPrimary: true, sortOrder: true },
  },
  // CAT-08: internalNotes NEVER. consignmentCommissionPct NEVER.
} satisfies Prisma.DressSelect;

/** Statuses exposed to the public catalog (CAT-01). */
const PUBLIC_STATUSES: DressStatus[] = ["AVAILABLE", "PENDING"];

export const catalogRouter = createTRPCRouter({
  /**
   * Filtered/sorted/paginated marketplace list.
   *
   * Returns AVAILABLE+PENDING dresses only (CAT-01). Hides
   * PENDING_APPROVAL/REJECTED/ARCHIVED/RENTED/MAINTENANCE.
   *
   * Availability date range (CAT-03) excludes dresses with overlapping
   * Rentals (paymentStatus AWAITING_PAYMENT|PAID) OR RentalRequests
   * (status APPROVED) during the requested window.
   *
   * The response includes `callerHasMeasurements` so the client can gate the
   * Best Fit / Fits Me UI without a second round-trip.
   */
  list: protectedProcedure.input(catalogFilterSchema).query(async ({ ctx, input }) => {
    // 1. Build the WHERE clause.
    const where: Prisma.DressWhereInput = {
      status: { in: PUBLIC_STATUSES },
    };

    if (input.categories?.length) {
      where.category = { in: input.categories };
    }
    if (input.colors?.length) {
      where.color = { in: input.colors };
    }
    if (input.sizeLabels?.length) {
      where.sizeLabel = { in: input.sizeLabels };
    }
    if (input.themeQuery && input.themeQuery.length > 0) {
      // MVP: exact-tag match via hasSome (research Pattern 4 + Open Question 2).
      // Substring ILIKE via raw SQL is the documented fallback if users request it.
      where.themeTags = { hasSome: [input.themeQuery] };
    }

    if (input.lengthCmMin != null || input.lengthCmMax != null) {
      const lengthFilter: Prisma.IntNullableFilter = {};
      if (input.lengthCmMin != null) lengthFilter.gte = input.lengthCmMin;
      if (input.lengthCmMax != null) lengthFilter.lte = input.lengthCmMax;
      where.lengthCm = lengthFilter;
    }

    if (input.priceMinCents != null || input.priceMaxCents != null) {
      const priceFilter: Prisma.IntFilter = {};
      if (input.priceMinCents != null) priceFilter.gte = input.priceMinCents;
      if (input.priceMaxCents != null) priceFilter.lte = input.priceMaxCents;
      where.competitionPrice = priceFilter;
    }

    // CAT-03: anti-join — exclude dresses booked or pending-approved during
    // the requested window. Both clauses are combined via AND so neither
    // constraint is dropped.
    if (input.availableFrom && input.availableTo) {
      const start = input.availableFrom;
      const end = input.availableTo;
      where.AND = [
        {
          Rentals: {
            none: {
              AND: [
                { paymentStatus: { in: ["AWAITING_PAYMENT", "PAID"] } },
                { startDate: { lte: end } },
                { endDate: { gte: start } },
              ],
            },
          },
        },
        {
          Requests: {
            none: {
              AND: [
                { status: "APPROVED" },
                { startDate: { lte: end } },
                { endDate: { gte: start } },
              ],
            },
          },
        },
      ];
    }

    // 2. Look up caller measurements (null if no Student row).
    const callerMeasurements = await ctx.prisma.student.findUnique({
      where: { userId: ctx.session.user.id },
      select: {
        chestCm: true,
        waistCm: true,
        hipsCm: true,
        heightCm: true,
      },
    });

    const callerHasMeasurements =
      callerMeasurements != null &&
      (callerMeasurements.chestCm != null ||
        callerMeasurements.waistCm != null ||
        callerMeasurements.hipsCm != null);

    // CAT-05 defense-in-depth: gate Best Fit / Fits Me on the server too.
    if (input.sort === "bestFit" && !callerHasMeasurements) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Set chest, waist, or hips before sorting by best fit",
      });
    }
    if (input.fitsMe === true && !callerHasMeasurements) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Set chest, waist, or hips before filtering to Fits Me",
      });
    }

    // 3. Fetch the full filtered set; in-memory sort+paginate after.
    // Result set is bounded by PUBLIC_STATUSES + the where clauses above.
    const dresses = await ctx.prisma.dress.findMany({
      where,
      select: PUBLIC_DRESS_SELECT,
      orderBy: { createdAt: "desc" },
    });

    // 4. Apply sort. Best Fit + Fits Me are stubbed for Wave 1 — Plan 15-02
    // ships fitScore.ts which provides scoreDress() and passesFitsMeFilter().
    let result = dresses;
    if (input.sort === "priceAsc") {
      result = [...dresses].sort((a, b) => a.competitionPrice - b.competitionPrice);
    } else if (input.sort === "priceDesc") {
      result = [...dresses].sort((a, b) => b.competitionPrice - a.competitionPrice);
    } else if (input.sort === "bestFit") {
      // TODO(15-02): once fitScore.ts exists, sort using scoreDress(d, callerMeasurements).
      // For Wave 1 ship, fall back to newest ordering (default findMany order).
      result = dresses;
    }
    // "newest" — already covered by the orderBy: { createdAt: "desc" } above.

    // TODO(15-02): once passesFitsMeFilter exists, when fitsMe=true filter
    // `result = result.filter((d) => passesFitsMeFilter(d, callerMeasurements!))`.
    // For Wave 1 ship, fitsMe is a no-op pass-through (gate above already
    // rejected callers without measurements via BAD_REQUEST).

    const total = result.length;
    const items = result.slice((input.page - 1) * input.limit, input.page * input.limit);

    return {
      items,
      total,
      page: input.page,
      limit: input.limit,
      callerHasMeasurements,
    };
  }),

  /**
   * Fetch a single dress by id. Browse-only — returns NOT_FOUND for any
   * status outside AVAILABLE/PENDING so we don't leak the existence of
   * ARCHIVED/REJECTED/PENDING_APPROVAL dresses to public callers.
   */
  byId: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const dress = await ctx.prisma.dress.findUnique({
        where: { id: input.id },
        select: PUBLIC_DRESS_SELECT,
      });

      if (!dress) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dress not found" });
      }

      if (!PUBLIC_STATUSES.includes(dress.status)) {
        // Do NOT leak existence — same 404 as truly missing rows.
        throw new TRPCError({ code: "NOT_FOUND", message: "Dress not found" });
      }

      return dress;
    }),

  /**
   * Filter UI facet hydration: returns distinct `color` and `sizeLabel`
   * values across the current public catalog (AVAILABLE+PENDING).
   *
   * Two cheap Prisma queries; result drives the ColorFilterChips and
   * SizeLabelFilterChips multi-selects without hardcoding taxonomies.
   */
  facets: protectedProcedure.query(async ({ ctx }) => {
    const [colors, sizeLabels] = await Promise.all([
      ctx.prisma.dress.findMany({
        where: { status: { in: PUBLIC_STATUSES } },
        distinct: ["color"],
        select: { color: true },
        orderBy: { color: "asc" },
      }),
      ctx.prisma.dress.findMany({
        where: { status: { in: PUBLIC_STATUSES } },
        distinct: ["sizeLabel"],
        select: { sizeLabel: true },
        orderBy: { sizeLabel: "asc" },
      }),
    ]);

    return {
      colors: colors.map((c) => c.color),
      sizeLabels: sizeLabels.map((s) => s.sizeLabel),
    };
  }),
});
