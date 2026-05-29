"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RequestQueueTable } from "@/features/wardrobe/components/admin/RequestQueueTable";

export default function AdminWardrobeRequestsPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/wardrobe"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0891b2] mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to inventory
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">Rental Requests</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review pending requests and convert approved ones into rentals once payment lands.
        </p>
      </div>

      <RequestQueueTable />
    </div>
  );
}
