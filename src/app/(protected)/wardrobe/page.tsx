// src/app/(protected)/wardrobe/page.tsx
//
// /wardrobe — public catalog browse surface. Phase 15-07 keystone: replaces
// the Phase 14-07 Coming Soon stub with the real grid.
//
// Thin client shell per the 14-06 ADR: the page is just routing + chrome
// composition. All header copy, filter bar, grid, pagination, and URL-state
// management live inside CatalogGrid. AppLayout (from /wardrobe/layout.tsx)
// wraps with `role="student"` sidebar + header.

"use client";

import { Suspense } from "react";
import { CatalogGrid } from "@/features/wardrobe/components/CatalogGrid";

export default function WardrobePage() {
  return (
    <Suspense fallback={null}>
      <CatalogGrid />
    </Suspense>
  );
}
