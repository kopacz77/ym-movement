// src/features/wardrobe/lib/requestSchema.ts
//
// Client-safe Zod schema for the rental-request form. Pure zod — no @/lib/trpc,
// no @trpc/server — so RequestRentalDialog (a client component) can import it
// without dragging the server TRPC stack into the browser bundle. The server
// router (requestQueries.ts) re-exports from here so its .input() stays in sync.

import { RentalType } from "@prisma/client";
import { z } from "zod";

export const createRequestSchema = z
  .object({
    dressId: z.string().cuid(),
    rentalType: z.nativeEnum(RentalType),
    startDate: z.date(),
    endDate: z.date(),
    competitionName: z.string().max(120).optional(),
    competitionDate: z.date().optional(),
    message: z.string().min(20, "Tell the owner why you're a great match (20+ chars)").max(1000),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  })
  .refine(
    (d) =>
      !d.competitionDate || (d.competitionDate >= d.startDate && d.competitionDate <= d.endDate),
    {
      message: "Competition date must fall inside the rental window",
      path: ["competitionDate"],
    },
  );

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
