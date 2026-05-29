// src/features/wardrobe/components/admin/RentalsTable.tsx
//
// Plan 17-03 Task 3 — RentalsTable.
//
// Admin view of post-payment rentals. Tabbed surface with two top-level views:
//   1. Active     — paymentStatus IN [PAID, RETURNED]. Splits internally into
//                   "Returns Due" (PAID + endDate within wardrobeReturnReminderDays
//                   of now) and "All Active Rentals" sections.
//   2. Late Fee   — paymentStatus = LATE_FEE_OWED. Separate sub-tab for flagged
//                   rentals; admin can still release deposit here after manual
//                   settlement.
//
// Per-row actions (state machine matrix per research Pitfall 8):
//   PAID            -> "Mark Returned" (opens MarkReturnedDialog)
//                      + "Flag Late Fee" (confirmation toast)
//   RETURNED        -> "Release Deposit" (confirmation toast)
//   LATE_FEE_OWED   -> "Release Deposit" only (Flag button omitted via null prop)
//
// Returns-Due lead time read from api.admin.wardrobeSettings.get
// (wardrobeReturnReminderDays). Default fallback: 1 day if settings not yet
// resolved.
//
// Pattern lineage:
//   - DressInventoryGrid (14-05) brand styling + Section/Empty conventions
//   - MyRentalsView (16-07) Tabs primitive usage
//   - showConfirmationToast (toast-confirmations.ts) — object-form helper
//   - RentalStatusBadge (16-03) handles both RequestStatus + PaymentStatus unions

"use client";

import { addDays, format, isBefore } from "date-fns";
import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { showConfirmationToast } from "@/lib/toast-confirmations";
import { formatCurrencyFromCents } from "@/lib/utils";

import { MarkReturnedDialog } from "./MarkReturnedDialog";

// ---------------------------------------------------------------------------
// Local types — derived from the wardrobeRentals.listRentals shape
// (matches the include block in wardrobeRequestQueries.ts:407+)
// ---------------------------------------------------------------------------

interface RentalRow {
  id: string;
  paymentStatus: "PAID" | "RETURNED" | "LATE_FEE_OWED" | "AWAITING_PAYMENT" | "DEPOSIT_RELEASED";
  startDate: Date;
  endDate: Date;
  rentalFee: number;
  securityDeposit: number;
  Dress: {
    id: string;
    title: string;
    sizeLabel: string;
    color: string | null;
    Images: { url: string }[];
  };
  Student: {
    id: string;
    User: { name: string | null; email: string };
  };
}

type DialogState =
  | { kind: "none" }
  | { kind: "return"; rentalId: string; dressTitle: string; studentName: string };

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RentalsTable() {
  const utils = api.useUtils();
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });

  // -- Settings + data queries ---------------------------------------------
  const settingsQuery = api.admin.wardrobeSettings.get.useQuery();
  const activeQuery = api.admin.wardrobeRentals.listRentals.useQuery({
    paymentStatus: ["PAID", "RETURNED"],
    page: 1,
    limit: 100,
  });
  const lateFeeQuery = api.admin.wardrobeRentals.listRentals.useQuery({
    paymentStatus: ["LATE_FEE_OWED"],
    page: 1,
    limit: 100,
  });

  // -- Mutations ------------------------------------------------------------
  const releaseDeposit = api.admin.wardrobeRentals.releaseDeposit.useMutation({
    onSuccess: () => {
      utils.admin.wardrobeRentals.listRentals.invalidate();
      toast.success("Deposit released");
    },
    onError: (e) => toast.error("Failed to release deposit", { description: e.message }),
  });

  const flagLateFee = api.admin.wardrobeRentals.flagLateFee.useMutation({
    onSuccess: () => {
      utils.admin.wardrobeRentals.listRentals.invalidate();
      toast.success("Rental flagged for late fee");
    },
    onError: (e) => toast.error("Failed to flag late fee", { description: e.message }),
  });

  // -- Returns-due derivation ----------------------------------------------
  const returnReminderDays = settingsQuery.data?.wardrobeReturnReminderDays ?? 1;
  const now = new Date();
  const dueByThreshold = addDays(now, returnReminderDays);

  const allActive = (activeQuery.data?.rentals ?? []) as unknown as RentalRow[];
  const returnsDue = allActive.filter(
    (r) => r.paymentStatus === "PAID" && isBefore(new Date(r.endDate), dueByThreshold),
  );
  const others = allActive.filter((r) => !returnsDue.some((d) => d.id === r.id));
  const lateFeeRentals = (lateFeeQuery.data?.rentals ?? []) as unknown as RentalRow[];

  // -- Confirmation handlers (showConfirmationToast object form) ----------
  const handleReleaseDeposit = (r: RentalRow) => {
    showConfirmationToast({
      title: "Release deposit",
      description: `Release security deposit (${formatCurrencyFromCents(
        r.securityDeposit,
      )}) for ${r.Student.User.name ?? r.Student.User.email}'s rental of "${
        r.Dress.title
      }"? The dress will return to AVAILABLE.`,
      confirmLabel: "Release Deposit",
      onConfirm: () => releaseDeposit.mutate({ rentalId: r.id }),
    });
  };

  const handleFlagLateFee = (r: RentalRow) => {
    showConfirmationToast({
      title: "Flag late fee",
      description: `Mark "${r.Dress.title}" rental as having a late fee owed by ${
        r.Student.User.name ?? r.Student.User.email
      }? You'll resolve this manually with the renter.`,
      confirmLabel: "Flag for Late Fee",
      onConfirm: () => flagLateFee.mutate({ rentalId: r.id }),
    });
  };

  const handleMarkReturned = (r: RentalRow) => {
    setDialog({
      kind: "return",
      rentalId: r.id,
      dressTitle: r.Dress.title,
      studentName: r.Student.User.name ?? r.Student.User.email,
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            Active
            {activeQuery.data ? ` (${activeQuery.data.total})` : ""}
          </TabsTrigger>
          <TabsTrigger value="late-fee">
            Late Fee
            {lateFeeQuery.data ? ` (${lateFeeQuery.data.total})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6 space-y-8">
          {activeQuery.isLoading ? (
            <LoadingState />
          ) : allActive.length === 0 ? (
            <EmptyState label="No active rentals" />
          ) : (
            <>
              {returnsDue.length > 0 && (
                <Section
                  title="Returns Due"
                  subtitle={`End date within ${returnReminderDays} day${
                    returnReminderDays === 1 ? "" : "s"
                  }`}
                  highlight
                >
                  <RentalRows
                    rentals={returnsDue}
                    onMarkReturned={handleMarkReturned}
                    onReleaseDeposit={handleReleaseDeposit}
                    onFlagLateFee={handleFlagLateFee}
                  />
                </Section>
              )}
              <Section title="All Active Rentals" subtitle={null} highlight={false}>
                <RentalRows
                  rentals={others}
                  onMarkReturned={handleMarkReturned}
                  onReleaseDeposit={handleReleaseDeposit}
                  onFlagLateFee={handleFlagLateFee}
                />
              </Section>
            </>
          )}
        </TabsContent>

        <TabsContent value="late-fee" className="mt-6">
          {lateFeeQuery.isLoading ? (
            <LoadingState />
          ) : lateFeeRentals.length === 0 ? (
            <EmptyState label="No rentals flagged for late fee" />
          ) : (
            <RentalRows
              rentals={lateFeeRentals}
              onMarkReturned={handleMarkReturned}
              onReleaseDeposit={handleReleaseDeposit}
              onFlagLateFee={null}
            />
          )}
        </TabsContent>
      </Tabs>

      {dialog.kind === "return" && (
        <MarkReturnedDialog
          open
          onOpenChange={(o) => {
            if (!o) {
              setDialog({ kind: "none" });
            }
          }}
          rentalId={dialog.rentalId}
          dressTitle={dialog.dressTitle}
          studentName={dialog.studentName}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section — editorial header + child rows
// ---------------------------------------------------------------------------

interface SectionProps {
  title: string;
  subtitle: string | null;
  highlight: boolean;
  children: React.ReactNode;
}

function Section({ title, subtitle, highlight, children }: SectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h3
          className={`text-xs font-bold uppercase tracking-[0.15em] ${
            highlight ? "text-cyan-700" : "text-slate-500"
          }`}
        >
          {title}
        </h3>
        {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// RentalRows — table of rentals with conditional action buttons
// ---------------------------------------------------------------------------

interface RentalRowsProps {
  rentals: RentalRow[];
  onMarkReturned: (r: RentalRow) => void;
  onReleaseDeposit: (r: RentalRow) => void;
  /** Null = flag button hidden (e.g., already-flagged rentals in the Late Fee tab). */
  onFlagLateFee: ((r: RentalRow) => void) | null;
}

function RentalRows({ rentals, onMarkReturned, onReleaseDeposit, onFlagLateFee }: RentalRowsProps) {
  if (rentals.length === 0) {
    return <div className="text-xs text-slate-500 italic px-2">No rentals in this section.</div>;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Image</TableHead>
            <TableHead>Dress</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead className="text-right">Rental Fee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rentals.map((r) => {
            const image = r.Dress.Images?.[0]?.url;
            const studentLabel = r.Student.User.name ?? r.Student.User.email;
            const isLateFee = r.paymentStatus === "LATE_FEE_OWED";
            return (
              <TableRow key={r.id} className={isLateFee ? "bg-rose-50" : undefined}>
                <TableCell>
                  <div className="h-12 w-12 rounded-md bg-slate-100 overflow-hidden flex items-center justify-center">
                    {image ? (
                      // biome-ignore lint/performance/noImgElement: blob URLs not in next.config images.remotePatterns (see 14-05 SUMMARY)
                      <img src={image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-[#1a3a5c]">{r.Dress.title}</div>
                  <div className="text-xs text-slate-500">
                    {r.Dress.sizeLabel}
                    {r.Dress.color ? ` · ${r.Dress.color}` : ""}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{studentLabel}</TableCell>
                <TableCell className="text-xs text-slate-600">
                  {format(new Date(r.startDate), "MMM dd, yyyy")}
                  <br />
                  <span className="text-slate-400">to</span>{" "}
                  {format(new Date(r.endDate), "MMM dd, yyyy")}
                </TableCell>
                <TableCell className="text-right font-semibold text-[#1a3a5c]">
                  {formatCurrencyFromCents(r.rentalFee)}
                </TableCell>
                <TableCell>
                  <RentalStatusBadge status={r.paymentStatus} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {r.paymentStatus === "PAID" && (
                      <Button
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-700 text-white"
                        onClick={() => onMarkReturned(r)}
                      >
                        Mark Returned
                      </Button>
                    )}
                    {(r.paymentStatus === "RETURNED" || r.paymentStatus === "LATE_FEE_OWED") && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => onReleaseDeposit(r)}
                      >
                        Release Deposit
                      </Button>
                    )}
                    {onFlagLateFee &&
                      (r.paymentStatus === "PAID" || r.paymentStatus === "RETURNED") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => onFlagLateFee(r)}
                        >
                          Flag Late Fee
                        </Button>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LoadingState + EmptyState
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

interface EmptyStateProps {
  label: string;
}

function EmptyState({ label }: EmptyStateProps) {
  return (
    <div className="border-2 border-dashed border-slate-200 rounded-xl p-16 text-center">
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
