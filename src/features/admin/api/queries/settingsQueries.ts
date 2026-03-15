// src/features/admin/api/queries/settingsQueries.ts

import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { Level, RinkArea } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/lib/trpc";

// Define zod schema for our settings
const operationalSettingsSchema = z.object({
  days: z.record(
    z.object({
      active: z.boolean(),
      startTime: z.string(),
      endTime: z.string(),
    }),
  ),
  defaultLessonDuration: z.string(),
  minBookingNotice: z.number(),
  cancellationDeadline: z.number(),
  allowOverlapping: z.boolean(),
  autoApproval: z.boolean(),
});

const paymentSettingsSchema = z.object({
  methods: z.object({
    venmo: z.object({ enabled: z.boolean(), username: z.string() }),
    zelle: z.object({ enabled: z.boolean(), phone: z.string().optional() }),
    cash: z.object({ enabled: z.boolean() }),
  }),
  defaultPricing: z.object({
    private: z.number(),
    group: z.number(),
    choreography: z.number(),
    competition: z.number(),
  }),
  levelBasedPricing: z.object({
    enabled: z.boolean(),
    adjustments: z.array(
      z.object({
        level: z.string(),
        amount: z.number(),
        type: z.enum(["percent", "fixed"]),
      }),
    ),
  }),
});

const rinkAreaSettingsSchema = z.array(
  z.object({
    name: z.string(),
    active: z.boolean(),
    default: z.boolean(),
  }),
);

// Define the settings input schema
const settingsInputSchema = z.object({
  operational: operationalSettingsSchema,
  payment: paymentSettingsSchema,
  rinkAreas: rinkAreaSettingsSchema,
});

// Define types for our settings models
interface SettingsModel {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

// Type for prisma with settings access
type PrismaWithSettings = PrismaClient & {
  settings: {
    upsert: (args: {
      where: { key: string };
      update: { value: string; updatedAt?: Date };
      create: { key: string; value: string };
    }) => Promise<SettingsModel>;
    findUnique: (args: { where: { key: string } }) => Promise<SettingsModel | null>;
    deleteMany: (args: { where: { key: { in: string[] } } }) => Promise<{ count: number }>;
  };
};

export const settingsRouter = createTRPCRouter({
  saveSettings: adminProcedure.input(settingsInputSchema).mutation(async ({ ctx, input }) => {
    try {
      // Using a transaction to ensure all settings are saved or none
      await ctx.prisma.$transaction(async (prisma) => {
        // Save operational settings
        await (prisma as PrismaWithSettings).settings.upsert({
          where: { key: "operational" },
          update: {
            value: JSON.stringify(input.operational),
            updatedAt: new Date(),
          },
          create: {
            id: randomUUID(),
            key: "operational",
            value: JSON.stringify(input.operational),
            updatedAt: new Date(),
          },
        });

        // Save payment settings
        await (prisma as PrismaWithSettings).settings.upsert({
          where: { key: "payment" },
          update: {
            value: JSON.stringify(input.payment),
            updatedAt: new Date(),
          },
          create: {
            id: randomUUID(),
            key: "payment",
            value: JSON.stringify(input.payment),
            updatedAt: new Date(),
          },
        });

        // Save rink areas settings
        await (prisma as PrismaWithSettings).settings.upsert({
          where: { key: "rinkAreas" },
          update: {
            value: JSON.stringify(input.rinkAreas),
            updatedAt: new Date(),
          },
          create: {
            id: randomUUID(),
            key: "rinkAreas",
            value: JSON.stringify(input.rinkAreas),
            updatedAt: new Date(),
          },
        });
      });

      // Return success response
      return { success: true };
    } catch (error) {
      console.error("Error saving settings:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to save settings",
        cause: error,
      });
    }
  }),

  getSettings: adminProcedure.query(async ({ ctx }) => {
    try {
      // Fetch settings from database
      const [operationalSettings, paymentSettings, rinkAreasSettings] = await Promise.all([
        (ctx.prisma as PrismaWithSettings).settings.findUnique({ where: { key: "operational" } }),
        (ctx.prisma as PrismaWithSettings).settings.findUnique({ where: { key: "payment" } }),
        (ctx.prisma as PrismaWithSettings).settings.findUnique({ where: { key: "rinkAreas" } }),
      ]);

      // Get available rink areas from the schema enum
      const availableRinkAreas = Object.values(RinkArea);

      // Default settings
      const defaultOperationalSettings = {
        days: {
          monday: { active: true, startTime: "09:00", endTime: "18:00" },
          tuesday: { active: true, startTime: "09:00", endTime: "18:00" },
          wednesday: { active: true, startTime: "09:00", endTime: "18:00" },
          thursday: { active: true, startTime: "09:00", endTime: "18:00" },
          friday: { active: true, startTime: "09:00", endTime: "18:00" },
          saturday: { active: true, startTime: "09:00", endTime: "18:00" },
          sunday: { active: false, startTime: "09:00", endTime: "18:00" },
        },
        defaultLessonDuration: "60",
        minBookingNotice: 24,
        cancellationDeadline: 48,
        allowOverlapping: false,
        autoApproval: true,
      };

      const defaultPaymentSettings = {
        methods: {
          venmo: { enabled: true, username: "@yura-min" },
          zelle: {
            enabled: true,
            phone: "+1 (714) 743-7071", // Added phone number for Zelle
          },
          cash: { enabled: false },
        },
        defaultPricing: {
          private: 75,
          group: 45,
          choreography: 90,
          competition: 95,
        },
        levelBasedPricing: {
          enabled: true,
          adjustments: Object.values(Level).map((level) => ({
            level,
            amount: level === "SENIOR" ? 15 : level === "JUNIOR" ? 10 : level === "NOVICE" ? 5 : 0,
            type: "percent" as const,
          })),
        },
      };

      const defaultRinkAreaSettings = availableRinkAreas.map((area, index) => ({
        name: area.replace("_", " "), // Format for display
        active: true,
        default: index === 0, // First area is default
      }));

      return {
        operational: operationalSettings
          ? JSON.parse(operationalSettings.value)
          : defaultOperationalSettings,
        payment: paymentSettings ? JSON.parse(paymentSettings.value) : defaultPaymentSettings,
        rinkAreas: rinkAreasSettings
          ? JSON.parse(rinkAreasSettings.value)
          : defaultRinkAreaSettings,
      };
    } catch (error) {
      console.error("Error fetching settings:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch settings",
        cause: error,
      });
    }
  }),

  // Reset settings to defaults
  resetSettings: adminProcedure.mutation(async ({ ctx }) => {
    try {
      // Delete all settings records
      await (ctx.prisma as PrismaWithSettings).settings.deleteMany({
        where: {
          key: {
            in: ["operational", "payment", "rinkAreas"],
          },
        },
      });
      return { success: true };
    } catch (error) {
      console.error("Error resetting settings:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to reset settings",
        cause: error,
      });
    }
  }),
});
