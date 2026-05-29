// src/features/wardrobe/lib/catalogFilters.ts
//
// Shared Zod schema describing the marketplace catalog filter input.
//
// SINGLE SOURCE OF TRUTH for both:
//   - the server-side `wardrobe.list` TRPC procedure input
//     (src/features/wardrobe/api/queries/catalogQueries.ts)
//   - the client-side URL-state parsers in the catalog grid
//     (Plan 15-07 / DressCatalogGrid)
//
// The schema MUST stay server-safe (no React, no client-only imports) because
// it is consumed by both the TRPC layer and the URL-parser layer.
//
// CAT-02 (filter parameter set) and CAT-06 (sort modes) are encoded here.

import { DressCategory } from "@prisma/client";
import { z } from "zod";

/**
 * Sort modes supported by the catalog `list` procedure.
 *
 * - `newest`    : default; orderBy createdAt desc
 * - `priceAsc`  : competitionPrice ascending
 * - `priceDesc` : competitionPrice descending
 * - `bestFit`   : fit-score sort (Plan 15-02); requires caller measurements
 */
export const sortOptionSchema = z.enum(["newest", "priceAsc", "priceDesc", "bestFit"]);

export type SortOption = z.infer<typeof sortOptionSchema>;

/**
 * Marketplace catalog filter input.
 *
 * Every field is optional with sensible defaults so the empty-filter call
 * `wardrobe.list.useQuery({})` returns the default catalog view.
 */
export const catalogFilterSchema = z.object({
  categories: z.array(z.nativeEnum(DressCategory)).optional(),
  colors: z.array(z.string()).optional(),
  sizeLabels: z.array(z.string()).optional(),
  themeQuery: z.string().trim().optional(),
  lengthCmMin: z.number().int().nonnegative().optional(),
  lengthCmMax: z.number().int().nonnegative().optional(),
  priceMinCents: z.number().int().nonnegative().optional(),
  priceMaxCents: z.number().int().nonnegative().optional(),
  availableFrom: z.coerce.date().optional(),
  availableTo: z.coerce.date().optional(),
  fitsMe: z.boolean().default(false),
  sort: sortOptionSchema.default("newest"),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(48).default(24),
});

export type CatalogFilterInput = z.infer<typeof catalogFilterSchema>;
