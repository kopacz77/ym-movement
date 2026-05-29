// src/features/wardrobe/components/admin/RequestQueueTable.tsx
//
// Plan 17-02 Task 2 — admin request queue with PENDING + Awaiting-Payment tabs.
//
// Per-tab queries (PENDING + APPROVED) — separate React Query keys so each tab
// caches independently. Per-row actions wire to a controlled dialog union:
//   - PENDING rows: Approve / Decline → RequestResponseDialog
//   - APPROVED rows: Mark Paid → PaymentPlaceholderDialog (stub, Plan 17-03 swap)
//
// Mounted in Plan 17-04's /admin/wardrobe/requests/page.tsx. This file does NOT
// own any routing, auth, or business logic — same thin-composition contract as
// 16-07 MyRentalsView.
//
// DEVIATION NOTE: Plan body specified a direct
// `import { RecordPaymentDialog } from "./RecordPaymentDialog"` (from Plan
// 17-03). 17-03 has not shipped yet, so the direct import would break tsc
// (which the plan's verify-step requires to pass). Plan's critical_notes
// authorize an inline stub ("or stub a callback — page composition wires the
// actual dialog"). Local PaymentPlaceholderDialog co-located below keeps the
// kind:"payment" discriminator intact; 17-03 swaps the import + JSX in a
// 2-line diff.

"use client";

import { format } from "date-fns";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RentalStatusBadge } from "@/features/wardrobe/components/request/RentalStatusBadge";
import { api } from "@/lib/api";
import { formatCurrencyFromCents } from "@/lib/utils";

import { RequestResponseDialog } from "./RequestResponseDialog";

// ---------------------------------------------------------------------------
// Dialog state — discriminated union of three open modes (none / respond / payment)
// ---------------------------------------------------------------------------

type DialogState =
  | { kind: "none" }
  | {
      kind: "respond";
      requestId: string;
      decision: "APPROVE" | "DECLINE";
      dressTitle: string;
      studentName: string;
    }
  | {
      kind: "payment";
      requestId: string;
      dressTitle: string;
      studentName: string;
    };

// ---------------------------------------------------------------------------
// Row shape — strict subset of admin.wardrobeRequests.listRequests per-item
// output. Keeps the row sub-components honest about which fields they consume.
// ---------------------------------------------------------------------------

interface QueueRequestRow {
  id: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "CANCELED" | "CONVERTED";
  rentalType: "COMPETITION" | "SEASONAL" | "PURCHASE";
  startDate: Date;
  endDate: Date;
  competitionDate: Date | null;
  competitionName: string | null;
  message: string;
  Dress: {
    id: string;
    title: string;
    sizeLabel: string;
    color: string | null;
    competitionPrice: number;
    seasonalPrice: number;
    purchasePrice: number | null;
    Images: { url: string }[];
  };
  Student: {
    id: string;
    User: { name: string | null; email: string };
  };
}

const RENTAL_TYPE_LABEL: Record<QueueRequestRow["rentalType"], string> = {
  COMPETITION: "Competition",
  SEASONAL: "Seasonal",
  PURCHASE: "Purchase",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RequestQueueTable() {
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  const pendingQuery = api.admin.wardrobeRequests.listRequests.useQuery({
    status: "PENDING",
    page: 1,
    limit: 50,
  });
  const approvedQuery = api.admin.wardrobeRequests.listRequests.useQuery({
    status: "APPROVED",
    page: 1,
    limit: 50,
  });

  const openApprove = (r: QueueRequestRow) =>
    setDialog({
      kind: "respond",
      requestId: r.id,
      decision: "APPROVE",
      dressTitle: r.Dress.title,
      studentName: r.Student.User.name ?? r.Student.User.email,
    });

  const openDecline = (r: QueueRequestRow) =>
    setDialog({
      kind: "respond",
      requestId: r.id,
      decision: "DECLINE",
      dressTitle: r.Dress.title,
      studentName: r.Student.User.name ?? r.Student.User.email,
    });

  const openPayment = (r: QueueRequestRow) =>
    setDialog({
      kind: "payment",
      requestId: r.id,
      dressTitle: r.Dress.title,
      studentName: r.Student.User.name ?? r.Student.User.email,
    });

  const closeDialog = () => setDialog({ kind: "none" });

  const pendingRequests = (pendingQuery.data?.requests ?? []) as unknown as QueueRequestRow[];
  const approvedRequests = (approvedQuery.data?.requests ?? []) as unknown as QueueRequestRow[];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending {pendingQuery.data && `(${pendingQuery.data.total})`}
          </TabsTrigger>
          <TabsTrigger value="awaiting-payment">
            Awaiting Payment {approvedQuery.data && `(${approvedQuery.data.total})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingQuery.isLoading ? (
            <LoadingState />
          ) : pendingRequests.length ? (
            <PendingTable
              requests={pendingRequests}
              onApprove={openApprove}
              onDecline={openDecline}
            />
          ) : (
            <EmptyState label="No pending requests" />
          )}
        </TabsContent>

        <TabsContent value="awaiting-payment" className="mt-6">
          {approvedQuery.isLoading ? (
            <LoadingState />
          ) : approvedRequests.length ? (
            <AwaitingPaymentTable requests={approvedRequests} onMarkPaid={openPayment} />
          ) : (
            <EmptyState label="No requests awaiting payment" />
          )}
        </TabsContent>
      </Tabs>

      {dialog.kind === "respond" && (
        <RequestResponseDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) {
              closeDialog();
            }
          }}
          requestId={dialog.requestId}
          decision={dialog.decision}
          dressTitle={dialog.dressTitle}
          studentName={dialog.studentName}
        />
      )}
      {dialog.kind === "payment" && (
        <PaymentPlaceholderDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) {
              closeDialog();
            }
          }}
          dressTitle={dialog.dressTitle}
          studentName={dialog.studentName}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PendingTable — Approve/Decline per row
// ---------------------------------------------------------------------------

function PendingTable({
  requests,
  onApprove,
  onDecline,
}: {
  requests: QueueRequestRow[];
  onApprove: (r: QueueRequestRow) => void;
  onDecline: (r: QueueRequestRow) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Dress</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Rental Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <DressThumb url={r.Dress.Images[0]?.url} title={r.Dress.title} />
              </TableCell>
              <TableCell>
                <div className="font-medium text-[#1a3a5c]">{r.Dress.title}</div>
                <div className="text-xs text-slate-500">
                  Size {r.Dress.sizeLabel}
                  {r.Dress.color ? ` · ${r.Dress.color}` : ""}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-slate-700">{r.Student.User.name ?? "—"}</div>
                <div className="text-xs text-slate-500">{r.Student.User.email}</div>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {RENTAL_TYPE_LABEL[r.rentalType]}
                </span>
                <div className="mt-1 text-xs text-slate-500">
                  {formatCurrencyFromCents(pickPrice(r))}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-slate-700">
                  {format(r.startDate, "MMM dd")} – {format(r.endDate, "MMM dd, yyyy")}
                </div>
                {r.competitionDate && (
                  <div className="text-xs text-slate-500">
                    Comp: {format(r.competitionDate, "MMM dd, yyyy")}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <p className="line-clamp-2 max-w-xs text-xs text-slate-600">{r.message}</p>
              </TableCell>
              <TableCell>
                <RentalStatusBadge status={r.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    onClick={() => onApprove(r)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDecline(r)}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50"
                  >
                    Decline
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AwaitingPaymentTable — Mark Paid per row
// ---------------------------------------------------------------------------

function AwaitingPaymentTable({
  requests,
  onMarkPaid,
}: {
  requests: QueueRequestRow[];
  onMarkPaid: (r: QueueRequestRow) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Dress</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Rental Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <DressThumb url={r.Dress.Images[0]?.url} title={r.Dress.title} />
              </TableCell>
              <TableCell>
                <div className="font-medium text-[#1a3a5c]">{r.Dress.title}</div>
                <div className="text-xs text-slate-500">
                  Size {r.Dress.sizeLabel}
                  {r.Dress.color ? ` · ${r.Dress.color}` : ""}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-slate-700">{r.Student.User.name ?? "—"}</div>
                <div className="text-xs text-slate-500">{r.Student.User.email}</div>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {RENTAL_TYPE_LABEL[r.rentalType]}
                </span>
                <div className="mt-1 text-xs text-slate-500">
                  {formatCurrencyFromCents(pickPrice(r))}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-slate-700">
                  {format(r.startDate, "MMM dd")} – {format(r.endDate, "MMM dd, yyyy")}
                </div>
                {r.competitionDate && (
                  <div className="text-xs text-slate-500">
                    Comp: {format(r.competitionDate, "MMM dd, yyyy")}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <RentalStatusBadge status={r.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  onClick={() => onMarkPaid(r)}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  Mark Paid
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Co-located helpers (private — not exported)
// ---------------------------------------------------------------------------

function DressThumb({ url, title }: { url: string | undefined; title: string }) {
  if (!url) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
        {title.slice(0, 2)}
      </div>
    );
  }
  return (
    // biome-ignore lint/performance/noImgElement: blob.vercel-storage.com not in next.config.js images.remotePatterns — see 14-05 SUMMARY
    <img src={url} alt="" className="h-12 w-12 rounded-md object-cover" />
  );
}

function LoadingState() {
  return <div className="text-sm text-slate-500 py-12 text-center">Loading…</div>;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

function pickPrice(r: QueueRequestRow): number {
  switch (r.rentalType) {
    case "COMPETITION":
      return r.Dress.competitionPrice;
    case "SEASONAL":
      return r.Dress.seasonalPrice;
    case "PURCHASE":
      return r.Dress.purchasePrice ?? 0;
  }
}

// ---------------------------------------------------------------------------
// PaymentPlaceholderDialog — stub until Plan 17-03 ships RecordPaymentDialog.
// Same controlled open/onOpenChange contract so the swap is trivial.
// ---------------------------------------------------------------------------

function PaymentPlaceholderDialog({
  open,
  onOpenChange,
  dressTitle,
  studentName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dressTitle: string;
  studentName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1a3a5c]">Record payment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Record payment for {studentName}'s rental of {dressTitle}.
        </p>
        <p className="text-xs text-slate-500">
          Recording the payment UI lands in Plan 17-03. For now this is a placeholder so the queue
          can compose the full state machine.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
