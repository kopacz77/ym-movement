// src/app/(protected)/wardrobe/consigned/page.tsx
//
// Consigner landing route. Renders MyConsignedDressesList (Plan 18-05) inside
// a thin editorial header. Empty state is handled inside the list component.

"use client";

import { MyConsignedDressesList } from "@/features/wardrobe/components/consigner/MyConsignedDressesList";

export default function ConsignerLandingPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">My listings</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#1a3a5c]">Consigned dresses</h1>
        <p className="mt-1 text-sm text-slate-500">
          List a dress on the YM Wardrobe marketplace. We'll review your submission and notify you
          when it goes live.
        </p>
      </div>
      <MyConsignedDressesList />
    </div>
  );
}
