// src/features/wardrobe/api/queries/index.ts
//
// Wardrobe feature router. Phase 13 exposes only the image sub-router;
// later phases will add catalog (browse/filter), measurements (fit-match),
// rentals (request/approve), and shipping sub-routers.

import { createTRPCRouter } from "@/lib/trpc";
import { imageRouter } from "./imageQueries";

export const wardrobeRouter = createTRPCRouter({
  images: imageRouter,
});
