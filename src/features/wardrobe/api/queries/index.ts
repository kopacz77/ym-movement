// src/features/wardrobe/api/queries/index.ts
//
// Wardrobe feature router. Phase 15 mounts:
//   - wardrobe.list           (flat — public catalog list)
//   - wardrobe.byId           (flat — single dress detail)
//   - wardrobe.facets         (flat — distinct colors/sizeLabels)
//   - wardrobe.images.*       (Phase 13 — attachImage, reorder, setPrimary, deleteImage)
//   - wardrobe.measurements.* (get, update — Phase 15 caller-scoped student profile)
//
// list/byId/facets are flat on the root to match the design-doc spec; images
// and measurements stay nested as sub-routers for namespace clarity.

import { createTRPCRouter } from "@/lib/trpc";
import { catalogRouter } from "./catalogQueries";
import { imageRouter } from "./imageQueries";
import { measurementRouter } from "./measurementQueries";

export const wardrobeRouter = createTRPCRouter({
  list: catalogRouter.list,
  byId: catalogRouter.byId,
  facets: catalogRouter.facets,
  images: imageRouter,
  measurements: measurementRouter,
});
