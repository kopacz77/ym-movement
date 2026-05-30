// src/features/wardrobe/components/admin/PendingApprovalQueue.tsx
//
// CONSIGN-06 surface: admin's queue of consigner-submitted dresses awaiting
// approval. Filtered server-side to dresses WITH at least 1 image
// (defense-in-depth for CONSIGN-03 — image-less dresses live on the
// consigner's own /wardrobe/consigned page until they upload).
//
// Sorted createdAt ASC so the oldest pending submission is reviewed first.
//
// Dialog state is a discriminated union mirroring Phase 17's RequestQueueTable
// pattern (state.kind: 'none' | 'approve' | 'reject').
//
"use client";

import type { DressCategory } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryBadge } from "@/features/wardrobe/components/CategoryBadge";
import { api } from "@/lib/api";
import { ApproveDressDialog } from "./ApproveDressDialog";
import { RejectDressDialog } from "./RejectDressDialog";

// Row shape locally declared (mirrors the Plan 18-02 listPendingApproval include
// block); see Phase 17 RentalsTable for the same row-interface-adjacent-to-table
// convention. Sync this when 18-02 ships if the include block diverges.
type QueueRow = {
  id: string;
  title: string;
  category: DressCategory;
  consignmentCommissionPct: number;
  createdAt: Date | string;
  Owner: { id: string; name: string | null; email: string };
  Images: { url: string }[];
  _count: { Images: number };
};

type DialogState =
  | { kind: "none" }
  | { kind: "approve"; row: QueueRow }
  | { kind: "reject"; row: QueueRow };

export function PendingApprovalQueue() {
  // Stub-then-swap (Plan 18-02 sibling): listPendingApproval is an 18-02
  // deliverable; `as any` keeps this file type-correct until 18-02 lands.
  const { data, isLoading } = api.admin.wardrobe.listPendingApproval.useQuery({
    page: 1,
    limit: 50,
  });

  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] p-6">
        <div className="space-y-3">
          <div className="h-6 w-1/3 bg-slate-100 rounded animate-pulse" />
          <div className="h-12 bg-slate-100 rounded animate-pulse" />
          <div className="h-12 bg-slate-100 rounded animate-pulse" />
          <div className="h-12 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const rows = (data?.dresses ?? []) as QueueRow[];

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] p-12 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.15em] text-slate-500">
          All caught up
        </p>
        <p className="mt-3 text-lg text-[#1a3a5c]">No dresses pending approval.</p>
        <p className="mt-1 text-sm text-slate-500">
          Consigner submissions with at least one image will appear here, sorted oldest first.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Commission %</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const primaryUrl = row.Images[0]?.url;
              const createdAtDate = new Date(row.createdAt);
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    {primaryUrl ? (
                      // Plain <img> because blob.vercel-storage.com is not in next.config.js
                      // remotePatterns yet (matches Phase 14-05 admin precedent).
                      // biome-ignore lint/performance/noImgElement: see 14-05 SUMMARY — blob host not in next.config images config
                      <img
                        src={primaryUrl}
                        alt={row.title}
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-slate-100" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-[#1a3a5c]">{row.title}</TableCell>
                  <TableCell className="text-sm">
                    <div>{row.Owner.name ?? "—"}</div>
                    <div className="text-xs text-slate-500">{row.Owner.email}</div>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={row.category} />
                  </TableCell>
                  <TableCell
                    className="text-sm text-slate-600"
                    title={createdAtDate.toLocaleString()}
                  >
                    {formatDistanceToNow(createdAtDate, { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm">{row.consignmentCommissionPct}%</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-300 text-rose-700 hover:bg-rose-50"
                        onClick={() => setDialog({ kind: "reject", row })}
                      >
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#0891b2] hover:bg-[#06748f] text-white"
                        onClick={() => setDialog({ kind: "approve", row })}
                      >
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Discriminated dialog mount — only one open at a time by construction */}
      {dialog.kind === "approve" && (
        <ApproveDressDialog
          open
          onOpenChange={(open) => !open && setDialog({ kind: "none" })}
          dressId={dialog.row.id}
          dressTitle={dialog.row.title}
          currentCommissionPct={dialog.row.consignmentCommissionPct}
        />
      )}
      {dialog.kind === "reject" && (
        <RejectDressDialog
          open
          onOpenChange={(open) => !open && setDialog({ kind: "none" })}
          dressId={dialog.row.id}
          dressTitle={dialog.row.title}
        />
      )}
    </>
  );
}
