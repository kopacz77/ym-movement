"use client";

import { RequestQueueTable } from "@/features/wardrobe/components/admin/RequestQueueTable";
import { WardrobeAdminNav } from "@/features/wardrobe/components/admin/WardrobeAdminNav";

export default function AdminWardrobeRequestsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">Rental Requests</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review pending requests and convert approved ones into rentals once payment lands.
        </p>
      </div>
      <WardrobeAdminNav />
      <RequestQueueTable />
    </div>
  );
}
