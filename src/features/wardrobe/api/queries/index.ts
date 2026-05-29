// src/features/wardrobe/api/queries/index.ts
//
// Wardrobe feature router. Mounts:
//   - wardrobe.list           (flat — public catalog list)
//   - wardrobe.byId           (flat — single dress detail)
//   - wardrobe.facets         (flat — distinct colors/sizeLabels)
//   - wardrobe.images.*       (Phase 13 — attachImage, reorder, setPrimary, deleteImage)
//   - wardrobe.measurements.* (Phase 15 — get, update — caller-scoped student profile)
//   - wardrobe.requests.*     (Phase 16 — checkAvailability, create, cancel, mine, myRentals)
//
// list/byId/facets are flat on the root to match the design-doc spec; images,
// measurements, and requests stay nested as sub-routers for namespace clarity.

import { createTRPCRouter } from "@/lib/trpc";
import { catalogRouter } from "./catalogQueries";
import { imageRouter } from "./imageQueries";
import { measurementRouter } from "./measurementQueries";
import { requestsRouter } from "./requestQueries";

export const wardrobeRouter = createTRPCRouter({
  list: catalogRouter.list,
  byId: catalogRouter.byId,
  facets: catalogRouter.facets,
  images: imageRouter,
  measurements: measurementRouter,
  requests: requestsRouter,
});
