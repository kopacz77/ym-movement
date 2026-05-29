// src/features/wardrobe/components/consigner/ConsignerEarningsTable.tsx
//
// CONSIGN-10 consigner surface: per-rental earnings table grouped by dress with
// a 3-card totals strip on top. Self-fetches via api.wardrobe.consigner.myEarnings
// (Plan 19-01) — no props, no shared state with the parent MyConsignedDressesList.
//
// Composite-by-dress shape (set by Plan 19-01) means we don't re-group client-
// side. Each dress entry carries a primary image, sizeLabel, status (so we can
// render an ARCHIVED badge inline on historic earnings — per 19-RESEARCH §Q10
// CONSIGN earnings history is forever) and 1..N rental rows.
//
// Brand:
//   emerald = paid (admin sent payout)
//   amber   = pending payout
//   cyan    = brand accent (matches Plan 18-05 MyConsignedDressesList chrome)
//   navy    = headers
//
// PII boundary: server omits internalNotes + consignmentCommissionPct +
// Student.User.{email,phone}. This client mirrors that — renter name only.

"use client";

import { format } from "date-fns";
import { CheckCircle2, Clock, ImageIcon, Shirt } from "lucide-react";
import { DressStatusBadge } from "@/features/wardrobe/components/DressStatusBadge";
import { api } from "@/lib/api";
import { formatCurrencyFromCents } from "@/lib/utils";

export function ConsignerEarningsTable() {
  const { data, isLoading } = api.wardrobe.consigner.myEarnings.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        </div>
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const rentalsByDress = data?.rentalsByDress ?? [];
  const totals = data?.totals ?? { earnedToDate: 0, pendingPayout: 0, rentalCount: 0 };

  if (rentalsByDress.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-cyan-50 flex items-center justify-center">
          <Shirt className="w-8 h-8 text-[#0891b2]" />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
          No rentals yet
        </p>
        <h3 className="mt-2 text-2xl font-bold text-[#1a3a5c]">
          We'll show your earnings here once your dresses start renting.
        </h3>
        <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
          Each time a renter pays for one of your listings, your share appears here. We'll mark each
          payout as sent once it's been transferred.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 3-card totals strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TotalCard
          label="Earned to date"
          value={formatCurrencyFromCents(totals.earnedToDate)}
          accent="emerald"
          Icon={CheckCircle2}
        />
        <TotalCard
          label="Pending payout"
          value={formatCurrencyFromCents(totals.pendingPayout)}
          accent="amber"
          Icon={Clock}
        />
        <TotalCard
          label="Total rentals"
          value={String(totals.rentalCount)}
          accent="slate"
          Icon={Shirt}
        />
      </div>

      {/* Grouped table */}
      <div className="space-y-6">
        {rentalsByDress.map(({ dress, rentals }) => (
          <DressEarningsGroup key={dress.id} dress={dress} rentals={rentals} />
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Internal subcomponents — co-located, single-caller use (mirrors the
// DressRowGrid + ConsignerDressCard convention in MyConsignedDressesList).
// -----------------------------------------------------------------------------

function TotalCard({
  label,
  value,
  accent,
  Icon,
}: {
  label: string;
  value: string;
  accent: "emerald" | "amber" | "slate";
  Icon: React.ComponentType<{ className?: string }>;
}) {
  const accentMap = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-600" },
    slate: { bg: "bg-slate-50", text: "text-slate-700", icon: "text-slate-500" },
  } as const;
  const a = accentMap[accent];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${a.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${a.icon}`} />
        </div>
      </div>
      <p
        className={`mt-3 text-2xl font-bold ${a.text === "text-slate-700" ? "text-[#1a3a5c]" : a.text}`}
      >
        {value}
      </p>
    </div>
  );
}

// Mirror the server's myEarnings select shape (see consignerQueries.ts L354+).
// Local types live here (not imported from a generated tRPC inference) so the
// component remains type-safe even before the wardrobe router is mounted in
// hot-reload edge cases — matches the convention established in
// MyConsignedDressesList for ConsignedDress.
type EarningsRental = {
  id: string;
  startDate: Date;
  endDate: Date;
  rentalType: string;
  rentalFee: number;
  consignmentPayoutAmount: number | null;
  consignmentPaidOut: boolean;
  consignmentPaidOutAt: Date | null;
  paymentStatus: string;
  Student: { User: { name: string | null } };
};

type EarningsDress = {
  id: string;
  title: string;
  sizeLabel: string;
  color: string;
  status: import("@prisma/client").DressStatus;
  Images: { url: string }[];
};

function DressEarningsGroup({
  dress,
  rentals,
}: {
  dress: EarningsDress;
  rentals: EarningsRental[];
}) {
  const primaryUrl = dress.Images[0]?.url;
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] overflow-hidden">
      {/* Dress header row */}
      <div className="flex items-center gap-4 p-4 border-b border-slate-100">
        <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
          {primaryUrl ? (
            // biome-ignore lint/performance/noImgElement: see 14-05 SUMMARY — blob host not in next.config images
            <img src={primaryUrl} alt={dress.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <ImageIcon className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-[#1a3a5c]">{dress.title}</h3>
            <DressStatusBadge status={dress.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {dress.color} · Size {dress.sizeLabel} · {rentals.length} rental
            {rentals.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Per-rental rows (semantic table for accessibility / VRT stability) */}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50/60 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
            <th className="text-left px-4 py-2">Renter</th>
            <th className="text-left px-4 py-2">Dates</th>
            <th className="text-right px-4 py-2">Rental fee</th>
            <th className="text-right px-4 py-2">Your payout</th>
            <th className="text-right px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="px-4 py-3 text-[#1a3a5c]">{r.Student.User.name ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600">
                {format(new Date(r.startDate), "MMM d")} –{" "}
                {format(new Date(r.endDate), "MMM d, yyyy")}
              </td>
              <td className="px-4 py-3 text-right text-slate-600">
                {formatCurrencyFromCents(r.rentalFee)}
              </td>
              <td className="px-4 py-3 text-right font-medium text-[#1a3a5c]">
                {formatCurrencyFromCents(r.consignmentPayoutAmount ?? 0)}
              </td>
              <td className="px-4 py-3 text-right">
                {r.consignmentPaidOut ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    Paid{" "}
                    {r.consignmentPaidOutAt
                      ? format(new Date(r.consignmentPaidOutAt), "MMM d")
                      : ""}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
