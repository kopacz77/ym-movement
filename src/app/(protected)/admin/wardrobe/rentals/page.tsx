"use client";

import { RentalsTable } from "@/features/wardrobe/components/admin/RentalsTable";
import { WardrobeAdminNav } from "@/features/wardrobe/components/admin/WardrobeAdminNav";

export default function AdminWardrobeRentalsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">Active Rentals</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track in-progress rentals, mark returns, release deposits, and flag late fees.
        </p>
      </div>
      <WardrobeAdminNav />
      <RentalsTable />
    </div>
  );
}
