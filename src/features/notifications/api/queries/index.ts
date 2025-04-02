// src/features/notifications/api/queries/index.ts
import { createTRPCRouter } from "@/lib/trpc";
// Use explicit ./ path and .ts extension
import { notificationsRouter as notificationsQueries } from "./notificationsQueries";

export const notificationsRouter = createTRPCRouter({
  notifications: notificationsQueries,
});