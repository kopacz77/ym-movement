"use client";

import { DressInventoryGrid } from "@/features/wardrobe/components/admin/DressInventoryGrid";

export default function AdminWardrobePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">Wardrobe</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage dress inventory. Filter by status, search, edit, or archive.
        </p>
      </div>
      <DressInventoryGrid />
    </div>
  );
}
