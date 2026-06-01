// src/features/wardrobe/components/consigner/MyConsignedDressesList.tsx
//
// Phase 18 consigner landing surface. Lists ALL caller-owned dresses (via
// wardrobe.consigner.mine), grouped into 4 tabs by status + actionability:
//
//   Live           AVAILABLE, PENDING, RENTED, MAINTENANCE
//   Pending Review PENDING_APPROVAL with at least 1 image
//   Needs Attention REJECTED + PENDING_APPROVAL with zero images
//   Archived       ARCHIVED
//
// The Needs Attention tab is the action funnel — REJECTED dresses show their
// rejection reason + resubmit CTA; image-less PENDING_APPROVAL dresses show
// an upload prompt. Both link to /wardrobe/consigned/[id]/edit.
//
// URL ?tab= persists the active tab across refresh (mirrors Phase 16-07
// MyRentalsView). Empty state has a cyan CTA to /wardrobe/consigned/new
// per NAV-02 always-visible rationale.
//
// CONSIGN-09 (resubmit) is surfaced inline on REJECTED rows by displaying the
// rejectionReason in a rose-tinted callout. CONSIGN-03 (image-required to
// submit) is surfaced inline on image-less PENDING_APPROVAL rows with an
// amber "Add an image" callout.
//
// internalNotes is NEVER referenced here — the server-side select on
// wardrobe.consigner.mine omits it per CONSIGN-02 (admin-only field hidden
// from consigners).

"use client";

import type { DressStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, ImagePlus, Shirt } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DressStatusBadge } from "@/features/wardrobe/components/DressStatusBadge";
import { api } from "@/lib/api";
import { formatCurrencyFromCents } from "@/lib/utils";
import { ConsignerEarningsTable } from "./ConsignerEarningsTable";

// Local shape mirroring wardrobe.consigner.mine's per-item select shape (see
// consignerQueries.ts mine procedure). We keep this declaration here so the
// component can render cleanly even if the wardrobe router hasn't mounted the
// consigner sub-router yet (stub-then-swap protocol — when Plan 18-02 wires
// `consigner: consignerRouter` into wardrobeRouter, the call site becomes
// type-checked end-to-end without any further edits here).
type ConsignedDress = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  color: string;
  sizeLabel: string;
  status: DressStatus;
  rejectionReason: string | null;
  competitionPrice: number;
  seasonalPrice: number;
  purchasePrice: number | null;
  consignmentCommissionPct: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  Images: { url: string }[];
  _count: { Images: number; Rentals: number };
};

type TabKey = "live" | "pending" | "attention" | "archived" | "earnings";
const TAB_KEYS: TabKey[] = ["live", "pending", "attention", "archived", "earnings"];
const DEFAULT_TAB: TabKey = "live";

function parseTab(raw: string | null): TabKey {
  return TAB_KEYS.includes(raw as TabKey) ? (raw as TabKey) : DEFAULT_TAB;
}

function bucketize(dresses: ConsignedDress[]) {
  const live: ConsignedDress[] = [];
  const pending: ConsignedDress[] = [];
  const attention: ConsignedDress[] = [];
  const archived: ConsignedDress[] = [];

  for (const d of dresses) {
    if (d.status === "ARCHIVED") {
      archived.push(d);
    } else if (d.status === "REJECTED") {
      attention.push(d);
    } else if (d.status === "PENDING_APPROVAL" && d._count.Images === 0) {
      attention.push(d);
    } else if (d.status === "PENDING_APPROVAL") {
      pending.push(d);
    } else {
      live.push(d);
    }
  }
  return { live, pending, attention, archived };
}

export function MyConsignedDressesList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));

  const setTab = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === DEFAULT_TAB) {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  // wardrobe.consigner.mine is shipped by Plan 18-02 (consignerQueries.ts +
  // mounted in wardrobeRouter). The locally-declared ConsignedDress type
  // mirrors that procedure's select shape exactly.
  const { data, isLoading } = api.wardrobe.consigner.mine.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-cyan-50 flex items-center justify-center">
          <Shirt className="w-8 h-8 text-[#0891b2]" />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
          Get started
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#1a3a5c]">Consign your first dress</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
          List a dress on the YM Wardrobe marketplace. We'll review your submission and notify you
          when it goes live.
        </p>
        <Link href="/wardrobe/consigned/new" className="mt-6 inline-block">
          <Button className="bg-[#0891b2] hover:bg-[#06748f] text-white">
            List a new dress <ArrowRight className="ml-1 w-4 h-4" />
          </Button>
        </Link>
      </div>
    );
  }

  const buckets = bucketize(rows);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
            My listings
          </p>
          <h2 className="mt-1 text-2xl font-bold text-[#1a3a5c]">Consigned dresses</h2>
        </div>
        <Link href="/wardrobe/consigned/new">
          <Button className="bg-[#0891b2] hover:bg-[#06748f] text-white">List a new dress</Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="live">Live ({buckets.live.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending Review ({buckets.pending.length})</TabsTrigger>
          <TabsTrigger value="attention">Needs Attention ({buckets.attention.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({buckets.archived.length})</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          <DressRowGrid rows={buckets.live} variant="default" />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <DressRowGrid rows={buckets.pending} variant="default" />
        </TabsContent>
        <TabsContent value="attention" className="mt-4">
          <DressRowGrid rows={buckets.attention} variant="attention" />
        </TabsContent>
        <TabsContent value="archived" className="mt-4">
          <DressRowGrid rows={buckets.archived} variant="archived" />
        </TabsContent>
        <TabsContent value="earnings" className="mt-4">
          <ConsignerEarningsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Internal row grid + card. Co-located, not exported — single-caller use.
// -----------------------------------------------------------------------------

type RowVariant = "default" | "attention" | "archived";

function DressRowGrid({ rows, variant }: { rows: ConsignedDress[]; variant: RowVariant }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">No dresses in this bucket.</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rows.map((dress) => (
        <ConsignerDressCard key={dress.id} dress={dress} variant={variant} />
      ))}
    </div>
  );
}

function ConsignerDressCard({ dress, variant }: { dress: ConsignedDress; variant: RowVariant }) {
  const primaryUrl = dress.Images[0]?.url;
  const needsImage = dress.status === "PENDING_APPROVAL" && dress._count.Images === 0;
  const wasRejected = dress.status === "REJECTED";

  return (
    <Link
      href={`/wardrobe/consigned/${dress.id}/edit`}
      className="group block bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] overflow-hidden hover:-translate-y-1 transition-transform"
    >
      <div
        className={`relative aspect-[4/5] bg-slate-100 ${variant === "archived" ? "opacity-60" : ""}`}
      >
        {primaryUrl ? (
          <Image
            src={primaryUrl}
            alt={dress.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <ImagePlus className="w-10 h-10" />
            <span className="mt-2 text-xs">No image yet</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-[#1a3a5c] line-clamp-1">{dress.title}</h3>
          <DressStatusBadge status={dress.status} />
        </div>

        <div className="text-sm text-slate-500 flex items-center justify-between">
          <span>
            {dress.color} · {dress.sizeLabel}
          </span>
          <span>{formatCurrencyFromCents(dress.competitionPrice)}</span>
        </div>

        {needsImage && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold">Add at least one image</p>
            <p className="mt-1">
              Your dress will appear in the admin review queue once it has a primary image.
            </p>
          </div>
        )}

        {wasRejected && dress.rejectionReason && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
            <p className="font-semibold">Rejected — please review</p>
            <p className="mt-1 line-clamp-3">{dress.rejectionReason}</p>
            <p className="mt-2 underline">Edit and resubmit →</p>
          </div>
        )}

        <p className="text-xs text-slate-400">
          Updated {formatDistanceToNow(new Date(dress.updatedAt), { addSuffix: true })}
        </p>
      </div>
    </Link>
  );
}
