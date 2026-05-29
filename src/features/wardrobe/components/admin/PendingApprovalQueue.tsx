// src/features/wardrobe/components/admin/PendingApprovalQueue.tsx
//
// STUB — placeholder until Plan 18-04 ships the real implementation.
// Plan 18-07 needs this import to resolve so the /admin/wardrobe/pending-approval
// route shell can be built and validated. When Plan 18-04 lands, this file is
// overwritten with the real PendingApprovalQueue (admin moderation surface for
// PENDING_APPROVAL dresses — listPending query, approve/reject mutations, etc.).
//
// Do NOT add features here. Replace wholesale in 18-04.

"use client";

export function PendingApprovalQueue() {
  return (
    <div className="rounded-2xl border border-border/30 bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]">
      <p className="text-sm text-slate-500">
        Pending approval queue is wiring up. Check back once Plan 18-04 ships.
      </p>
    </div>
  );
}
