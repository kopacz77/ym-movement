"use client";

import Link from "next/link";
import { useState } from "react";

import { FitCheckCard } from "@/features/wardrobe/components/detail/FitCheckCard";
import { PricingTierTable } from "@/features/wardrobe/components/detail/PricingTierTable";
import { StructuredSizeSummary } from "@/features/wardrobe/components/detail/StructuredSizeSummary";
import { RequestRentalDialog } from "@/features/wardrobe/components/request/RequestRentalDialog";
import { scoreDress, scoreToPercent } from "@/features/wardrobe/lib/fitScore";
import { api } from "@/lib/api";
import { DressDetailHero } from "./DressDetailHero";

interface DressFitFields {
  chestMinCm: number | null;
  chestMaxCm: number | null;
  waistMinCm: number | null;
  waistMaxCm: number | null;
  hipsMinCm: number | null;
  hipsMaxCm: number | null;
  lengthCm: number | null;
  alterableSmaller: boolean;
  alterableLarger: boolean;
}

interface StudentFitFields {
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  heightCm: number | null;
}

export function DressDetailView({ dressId }: { dressId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const dressQuery = api.wardrobe.byId.useQuery({ id: dressId });
  // Plan 15-01 throws NOT_FOUND when caller has no Student row — suppress retry
  const measurementsQuery = api.wardrobe.measurements.get.useQuery(undefined, { retry: false });

  if (dressQuery.isLoading) {
    return <DetailSkeleton />;
  }
  if (dressQuery.error || !dressQuery.data) {
    return <NotFoundState />;
  }

  const dress = dressQuery.data;
  // measurements may be undefined (not yet loaded) or null (NOT_FOUND) — treat both as "no measurements"
  const measurements = measurementsQuery.data ?? null;

  // fitScorePercent derived client-side via existing Phase 15 fitScore helpers.
  const fitScorePercent = computeFitPercent(dress, measurements);

  return (
    <div className="space-y-8">
      <DressDetailHero
        dress={dress}
        fitScorePercent={fitScorePercent}
        onRequestClick={() => setDialogOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {dress.description && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">
                Description
              </h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{dress.description}</p>
            </div>
          )}
          <StructuredSizeSummary dress={dress} />
        </div>
        <div className="space-y-6">
          <PricingTierTable
            competitionPrice={dress.competitionPrice}
            seasonalPrice={dress.seasonalPrice}
            purchasePrice={dress.purchasePrice}
            securityDeposit={dress.securityDeposit}
            cleaningFee={dress.cleaningFee}
          />
          <FitCheckCard dress={dress} measurements={measurements} />
        </div>
      </div>

      <RequestRentalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        dress={{ id: dress.id, title: dress.title, purchasePrice: dress.purchasePrice }}
      />
    </div>
  );
}

function computeFitPercent(
  dress: DressFitFields,
  measurements: StudentFitFields | null,
): number | null {
  if (!measurements) {
    return null;
  }
  const hasAny =
    measurements.chestCm != null || measurements.waistCm != null || measurements.hipsCm != null;
  if (!hasAny) {
    return null;
  }
  return scoreToPercent(scoreDress(dress, measurements));
}

function DetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-6 w-32 rounded bg-slate-100 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="aspect-square rounded-xl bg-slate-100 animate-pulse" />
        <div className="space-y-4">
          <div className="h-10 w-3/4 rounded bg-slate-100 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse" />
          <div className="h-12 w-40 rounded bg-slate-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
      <h2 className="text-xl font-semibold text-slate-900">Dress not found</h2>
      <p className="mt-2 text-sm text-slate-600">
        This dress may have been removed or is no longer available.
      </p>
      <Link
        href="/wardrobe"
        className="mt-6 inline-flex items-center text-sm text-[#0891b2] hover:underline"
      >
        Back to wardrobe
      </Link>
    </div>
  );
}
