// src/features/wardrobe/components/admin/RentalsTable.tsx
//
// Plan 17-03 Task 3 — RentalsTable (original 2-tab shape).
// Plan 19-03 — extended with 3rd "Outstanding Payouts" tab + per-row
//              "Mark Payout Sent" action wired to api.admin.wardrobeRentals.markConsignmentPaidOut.
//
// Admin view of post-payment rentals. Tabbed surface with three top-level views:
//   1. Active              — paymentStatus IN [PAID, RETURNED]. Splits internally into
//                            "Returns Due" (PAID + endDate within wardrobeReturnReminderDays
//                            of now) and "All Active Rentals" sections.
//   2. Late Fee            — paymentStatus = LATE_FEE_OWED. Separate sub-tab for flagged
//                            rentals; admin can still release deposit here after manual
//                            settlement.
//   3. Outstanding Payouts — server-filtered (outstandingPayoutsOnly: true) to
//                            consignmentPayoutAmount IS NOT NULL AND consignmentPaidOut = false.
//                            Override semantics (does NOT additionally filter by paymentStatus)
//                            so payouts owed on DEPOSIT_RELEASED / LATE_FEE_OWED rentals appear.
//                            Only the Mark Payout Sent action is rendered on this focused surface.
//
// Per-row actions (state machine matrix per research Pitfall 8):
//   PAID            -> "Mark Returned" (opens MarkReturnedDialog)
//                      + "Flag Late Fee" (confirmation toast)
//   RETURNED        -> "Release Deposit" (confirmation toast)
//   LATE_FEE_OWED   -> "Release Deposit" only (Flag button omitted via null prop)
//   CONSIGNED + un-sent payout (any tab) -> "Mark Payout Sent" (confirmation toast)
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
//   - markReturned isPending disabled pattern (Phase 17) — applied to markPayoutSent

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
  // Plan 19-01 / RENTAL-08 payout columns — surfaced by server include shape.
  consignmentPayoutAmount: number | null;
  consignmentPaidOut: boolean;
  consignmentPaidOutAt: Date | null;
  Dress: {
    id: string;
    title: string;
    sizeLabel: string;
    color: string | null;
    Images: { url: string }[];
    // Plan 19-01 — Dress.Owner.{id,name} added to listRentals include for
    // RENTAL-08 Mark Payout Sent confirm-toast (consigner name display).
    Owner: { id: string; name: string | null };
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
  // RENTAL-08 — Outstanding Payouts tab: server-filtered to
  // consignmentPayoutAmount IS NOT NULL AND consignmentPaidOut = false.
  // Override semantics — does NOT additionally filter by paymentStatus,
  // so payouts owed on DEPOSIT_RELEASED / LATE_FEE_OWED rentals surface here.
  const outstandingPayoutsQuery = api.admin.wardrobeRentals.listRentals.useQuery({
    outstandingPayoutsOnly: true,
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

  // RENTAL-08 — Mark Payout Sent (Plan 19-03).
  // Idempotent at the UI layer (button hidden when not eligible + disabled-while-pending);
  // server defends with 3 checks (NOT_FOUND, payout NULL, already paid).
  // Friendly server error message (e.g. "Payout already marked as sent") surfaces
  // verbatim in toast.error description for the race-condition / double-click path.
  const markPayoutSent = api.admin.wardrobeRentals.markConsignmentPaidOut.useMutation({
    onSuccess: () => {
      toast.success("Payout marked as sent", {
        description: "The consigner will see the updated status on their earnings tab.",
      });
      utils.admin.wardrobeRentals.listRentals.invalidate();
    },
    onError: (e) => {
      toast.error("Failed to mark payout sent", { description: e.message });
    },
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
  const outstandingPayouts = (outstandingPayoutsQuery.data?.rentals ??
    []) as unknown as RentalRow[];

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

  const handleMarkPayoutSent = (r: RentalRow) => {
    // Belt-and-suspenders guard for keyboard activation race conditions —
    // the button is also conditionally rendered (UX-layer gate).
    if (r.consignmentPayoutAmount == null || r.consignmentPaidOut) {
      return;
    }

    showConfirmationToast({
      title: "Mark payout sent",
      description: `Confirm that you have sent ${formatCurrencyFromCents(
        r.consignmentPayoutAmount,
      )} payout to ${r.Dress.Owner.name ?? "the consigner"} for "${
        r.Dress.title
      }"? This action cannot be undone.`,
      confirmLabel: "Mark Sent",
      onConfirm: () => markPayoutSent.mutate({ rentalId: r.id }),
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
          <TabsTrigger value="outstanding-payouts">
            Outstanding Payouts
            {outstandingPayoutsQuery.data ? ` (${outstandingPayoutsQuery.data.total})` : ""}
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
                    onMarkPayoutSent={handleMarkPayoutSent}
                    markPayoutSentPending={markPayoutSent.isPending}
                  />
                </Section>
              )}
              <Section title="All Active Rentals" subtitle={null} highlight={false}>
                <RentalRows
                  rentals={others}
                  onMarkReturned={handleMarkReturned}
                  onReleaseDeposit={handleReleaseDeposit}
                  onFlagLateFee={handleFlagLateFee}
                  onMarkPayoutSent={handleMarkPayoutSent}
                  markPayoutSentPending={markPayoutSent.isPending}
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
              onMarkPayoutSent={handleMarkPayoutSent}
              markPayoutSentPending={markPayoutSent.isPending}
            />
          )}
        </TabsContent>

        <TabsContent value="outstanding-payouts" className="mt-6">
          {outstandingPayoutsQuery.isLoading ? (
            <LoadingState />
          ) : outstandingPayouts.length === 0 ? (
            <EmptyState label="No outstanding payouts. All consigned rentals are settled." />
          ) : (
            <RentalRows
              rentals={outstandingPayouts}
              // The Outstanding Payouts tab is a focused payout-action surface —
              // hide unrelated state-machine actions so the only affordance is
              // Mark Payout Sent. The same rows still appear on Active / Late Fee
              // tabs where their other actions remain available.
              onMarkReturned={null}
              onReleaseDeposit={null}
              onFlagLateFee={null}
              onMarkPayoutSent={handleMarkPayoutSent}
              markPayoutSentPending={markPayoutSent.isPending}
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
  /** Null = Mark Returned button hidden (e.g., the Outstanding Payouts tab — focused payout-action surface). */
  onMarkReturned: ((r: RentalRow) => void) | null;
  /** Null = Release Deposit button hidden (e.g., the Outstanding Payouts tab — focused payout-action surface). */
  onReleaseDeposit: ((r: RentalRow) => void) | null;
  /** Null = Flag Late Fee button hidden (e.g., already-flagged rentals in the Late Fee tab). */
  onFlagLateFee: ((r: RentalRow) => void) | null;
  /** Plan 19-03 / RENTAL-08 — Mark Payout Sent action. Always provided when payout columns are present. */
  onMarkPayoutSent: (r: RentalRow) => void;
  /** Disables the Mark Payout Sent button while a mutation is in flight (prevents double-clicks). */
  markPayoutSentPending: boolean;
}

function RentalRows({
  rentals,
  onMarkReturned,
  onReleaseDeposit,
  onFlagLateFee,
  onMarkPayoutSent,
  markPayoutSentPending,
}: RentalRowsProps) {
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
                    {onMarkReturned && r.paymentStatus === "PAID" && (
                      <Button
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-700 text-white"
                        onClick={() => onMarkReturned(r)}
                      >
                        Mark Returned
                      </Button>
                    )}
                    {onReleaseDeposit &&
                      (r.paymentStatus === "RETURNED" || r.paymentStatus === "LATE_FEE_OWED") && (
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
                    {/* Plan 19-03 / RENTAL-08 — Mark Payout Sent.
                        UI gate: only consigned rentals with un-sent payouts show
                        the button. Server defends with 3 checks (Plan 19-01). */}
                    {r.consignmentPayoutAmount != null && !r.consignmentPaidOut && (
                      <Button
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-700 text-white"
                        onClick={() => onMarkPayoutSent(r)}
                        disabled={markPayoutSentPending}
                      >
                        Mark Payout Sent
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
