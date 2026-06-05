// src/app/(protected)/admin/wardrobe/pending-approval/page.tsx
//
// Admin pending-approval route. Thin client shell composing the Wave-2
// PendingApprovalQueue (Plan 18-04). Editorial header + back link to
// /admin/wardrobe inventory. Auth + role enforcement is inherited from
// AdminLayout (AppLayout role="admin") at the route-group level.

"use client";

import { PendingApprovalQueue } from "@/features/wardrobe/components/admin/PendingApprovalQueue";
import { WardrobeAdminNav } from "@/features/wardrobe/components/admin/WardrobeAdminNav";

export default function AdminPendingApprovalPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
          Pending review
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#1a3a5c]">Pending Approval</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review consigner-submitted dresses awaiting publication. Approve to list on the public
          catalog, or reject with a reason. Image-less submissions are hidden until the consigner
          uploads.
        </p>
      </div>
      <WardrobeAdminNav />
      <PendingApprovalQueue />
    </div>
  );
}
