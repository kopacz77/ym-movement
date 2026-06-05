// src/features/wardrobe/lib/wardrobeSettingsSchema.ts
//
// Client-safe Zod schema + type for wardrobe global settings. Lives in a pure
// lib module (no @/lib/trpc, no node:crypto, no @trpc/server) so it can be
// imported by BOTH the server router (wardrobeSettingsQueries.ts) and client
// components (WardrobeSettingsForm.tsx) WITHOUT dragging the server TRPC stack
// into the browser bundle.
//
// History: WardrobeSettingsForm previously imported this schema directly from
// the server router file, which pulled `initTRPC.create()` into the client
// bundle and crashed any page sharing that chunk with
// "You're trying to use @trpc/server in a non-server environment."

import { z } from "zod";

export const WARDROBE_SETTINGS_KEY = "wardrobe" as const;

export const wardrobeSettingsSchema = z.object({
  defaultConsignmentCommissionPct: z.number().int().min(0).max(100).default(15),
  wardrobeRentalRequestExpiryDays: z.number().int().positive().default(7),
  wardrobeReturnReminderDays: z.number().int().positive().default(1),
});

export type WardrobeSettings = z.infer<typeof wardrobeSettingsSchema>;

/** Parsed defaults — safe to use on client and server. */
export const WARDROBE_SETTINGS_DEFAULTS: WardrobeSettings = wardrobeSettingsSchema.parse({});
