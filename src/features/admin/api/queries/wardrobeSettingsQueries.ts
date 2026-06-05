// src/features/admin/api/queries/wardrobeSettingsQueries.ts

import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  WARDROBE_SETTINGS_DEFAULTS,
  WARDROBE_SETTINGS_KEY,
  type WardrobeSettings,
  wardrobeSettingsSchema,
} from "@/features/wardrobe/lib/wardrobeSettingsSchema";
import { adminProcedure, createTRPCRouter } from "@/lib/trpc";

// Re-export the client-safe schema/type/key so existing server-side importers
// (requestQueries, consignerQueries, wardrobe-return-reminder-sender) keep
// working unchanged. The canonical source is now the pure lib module so client
// components can import it without pulling in @trpc/server.
export { WARDROBE_SETTINGS_KEY, wardrobeSettingsSchema };
export type { WardrobeSettings };

const DEFAULTS: WardrobeSettings = WARDROBE_SETTINGS_DEFAULTS;

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
