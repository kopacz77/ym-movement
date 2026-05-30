// src/features/admin/api/queries/wardrobeSettingsQueries.ts

import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/lib/trpc";

export const WARDROBE_SETTINGS_KEY = "wardrobe" as const;

export const wardrobeSettingsSchema = z.object({
  defaultConsignmentCommissionPct: z.number().int().min(0).max(100).default(15),
  wardrobeRentalRequestExpiryDays: z.number().int().positive().default(7),
  wardrobeReturnReminderDays: z.number().int().positive().default(1),
});

export type WardrobeSettings = z.infer<typeof wardrobeSettingsSchema>;

const DEFAULTS: WardrobeSettings = wardrobeSettingsSchema.parse({});

// Mirror the typing pattern used in settingsQueries.ts -- prisma.settings has narrow
// upsert/findUnique signatures that benefit from an explicit cast.
type PrismaWithSettings = PrismaClient & {
  settings: {
    upsert: (args: {
      where: { key: string };
      update: { value: string; updatedAt?: Date };
      create: { id?: string; key: string; value: string; updatedAt?: Date };
    }) => Promise<{ id: string; key: string; value: string; createdAt: Date; updatedAt: Date }>;
    findUnique: (args: { where: { key: string } }) => Promise<{
      id: string;
      key: string;
      value: string;
      createdAt: Date;
      updatedAt: Date;
    } | null>;
  };
};

export async function getWardrobeSettings(prisma: PrismaClient): Promise<WardrobeSettings> {
  const row = await (prisma as PrismaWithSettings).settings.findUnique({
    where: { key: WARDROBE_SETTINGS_KEY },
  });
  if (!row) {
    return DEFAULTS;
  }
  try {
    return wardrobeSettingsSchema.parse(JSON.parse(row.value));
  } catch {
    // Corrupt JSON or schema-incompatible value -- fall back to defaults rather than crash.
    return DEFAULTS;
  }
}

export async function updateWardrobeSettings(
  prisma: PrismaClient,
  patch: Partial<WardrobeSettings>,
): Promise<WardrobeSettings> {
  const current = await getWardrobeSettings(prisma);
  const next = wardrobeSettingsSchema.parse({ ...current, ...patch });
  await (prisma as PrismaWithSettings).settings.upsert({
    where: { key: WARDROBE_SETTINGS_KEY },
    update: { value: JSON.stringify(next), updatedAt: new Date() },
    create: {
      id: randomUUID(),
      key: WARDROBE_SETTINGS_KEY,
      value: JSON.stringify(next),
      updatedAt: new Date(),
    },
  });
  return next;
}

export const wardrobeSettingsRouter = createTRPCRouter({
  get: adminProcedure.query(async ({ ctx }) => {
    try {
      return await getWardrobeSettings(ctx.prisma);
    } catch (error) {
      console.error("Error fetching wardrobe settings:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch wardrobe settings",
        cause: error,
      });
    }
  }),

  update: adminProcedure
    .input(wardrobeSettingsSchema.partial())
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateWardrobeSettings(ctx.prisma, input);
      } catch (error) {
        console.error("Error updating wardrobe settings:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update wardrobe settings",
          cause: error,
        });
      }
    }),
});
