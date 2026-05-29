"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { WardrobeSettingsForm } from "@/features/wardrobe/components/admin/WardrobeSettingsForm";

export default function WardrobeSettingsPage() {
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
        <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">Wardrobe Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Default commission, rental request expiry, and return reminder lead time.
        </p>
      </div>
      <WardrobeSettingsForm />
    </div>
  );
}
