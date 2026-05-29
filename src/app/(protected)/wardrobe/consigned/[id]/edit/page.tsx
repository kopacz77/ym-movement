// src/app/(protected)/wardrobe/consigned/[id]/edit/page.tsx
//
// CONSIGN-04 + CONSIGN-09 surface. Composes:
//   1. Editorial header + status badge
//   2. Rejection-reason banner (REJECTED only) with explicit "Resubmit" CTA
//   3. Image-less PENDING_APPROVAL banner (amber, instructive)
//   4. DressImageGallery — already authorizes owner via Phase 13's
//      assertCanModifyDress, so no consigner-specific gallery needed
//   5. ConsignerDressForm with lockPricingAndSize derived from dress.status
//
// CONSIGN-05 archive action also lives here (button next to status badge),
// visible only when dress.status === "AVAILABLE".

"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DressImageGallery } from "@/features/wardrobe/components/admin/DressImageGallery";
import { ConsignerDressForm } from "@/features/wardrobe/components/consigner/ConsignerDressForm";
import { DressStatusBadge } from "@/features/wardrobe/components/DressStatusBadge";
import { api } from "@/lib/api";

export default function ConsignerEditDressPage() {
  const params = useParams<{ id: string }>();
  const dressId = params.id;
  const utils = api.useUtils();

  const { data: dress, isLoading } = api.wardrobe.consigner.byId.useQuery({ id: dressId });

  const update = api.wardrobe.consigner.update.useMutation({
    onSuccess: () => {
      utils.wardrobe.consigner.byId.invalidate({ id: dressId });
      utils.wardrobe.consigner.mine.invalidate();
      toast.success("Dress updated");
    },
    onError: (e) => toast.error("Failed to save changes", { description: e.message }),
  });

  const resubmit = api.wardrobe.consigner.resubmit.useMutation({
    onSuccess: () => {
      utils.wardrobe.consigner.byId.invalidate({ id: dressId });
      utils.wardrobe.consigner.mine.invalidate();
      toast.success("Resubmitted for review");
    },
    onError: (e) => toast.error("Failed to resubmit", { description: e.message }),
  });

  const archive = api.wardrobe.consigner.archive.useMutation({
    onSuccess: () => {
      utils.wardrobe.consigner.byId.invalidate({ id: dressId });
      utils.wardrobe.consigner.mine.invalidate();
      toast.success("Dress archived");
    },
    onError: (e) => toast.error("Failed to archive", { description: e.message }),
  });

  const handleImagesMutated = () => {
    utils.wardrobe.consigner.byId.invalidate({ id: dressId });
    utils.wardrobe.consigner.mine.invalidate();
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-12 bg-slate-100 rounded animate-pulse w-1/3" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
        <div className="h-96 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!dress) {
    return (
      <div className="space-y-4">
        <Link
          href="/wardrobe/consigned"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0891b2]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to my listings
        </Link>
        <p className="text-sm text-slate-600">Dress not found.</p>
      </div>
    );
  }

  const lockPricingAndSize = dress.status !== "PENDING_APPROVAL" && dress.status !== "REJECTED";
  const needsImage = dress.status === "PENDING_APPROVAL" && (dress.Images?.length ?? 0) === 0;
  const canArchive = dress.status === "AVAILABLE";

  // Map server dress (cents, arrays) → ConsignerDressForm defaultValues (dollars,
  // comma-separated raw strings). Single conversion site, mirrors admin edit page.
  const defaultValues = {
    title: dress.title,
    description: dress.description,
    category: dress.category,
    themeTagsRaw: (dress.themeTags ?? []).join(", "),
    color: dress.color,
    secondaryColorsRaw: (dress.secondaryColors ?? []).join(", "),
    condition: dress.condition,
    yearMade: dress.yearMade ?? undefined,
    sizeLabel: dress.sizeLabel,
    chestMinCm: dress.chestMinCm ?? undefined,
    chestMaxCm: dress.chestMaxCm ?? undefined,
    waistMinCm: dress.waistMinCm ?? undefined,
    waistMaxCm: dress.waistMaxCm ?? undefined,
    hipsMinCm: dress.hipsMinCm ?? undefined,
    hipsMaxCm: dress.hipsMaxCm ?? undefined,
    torsoMinCm: dress.torsoMinCm ?? undefined,
    torsoMaxCm: dress.torsoMaxCm ?? undefined,
    lengthCm: dress.lengthCm ?? undefined,
    alterableSmaller: dress.alterableSmaller,
    alterableLarger: dress.alterableLarger,
    competitionPriceUsd: dress.competitionPrice / 100,
    seasonalPriceUsd: dress.seasonalPrice / 100,
    purchasePriceUsd: dress.purchasePrice != null ? dress.purchasePrice / 100 : undefined,
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/wardrobe/consigned"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0891b2] mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to my listings
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">{dress.title}</h1>
          <DressStatusBadge status={dress.status} />
          {canArchive && (
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={() => {
                if (confirm(`Archive ${dress.title}? It will be removed from the catalog.`)) {
                  archive.mutate({ id: dress.id });
                }
              }}
              disabled={archive.isPending}
            >
              Archive
            </Button>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Edit your listing, manage images, and resubmit if your dress was rejected.
        </p>
      </div>

      {dress.status === "REJECTED" && dress.rejectionReason && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-800">Your dress was rejected</p>
          <p className="mt-1 text-sm text-rose-700">{dress.rejectionReason}</p>
          <Button
            variant="outline"
            className="mt-3 border-rose-300 text-rose-800 hover:bg-rose-100"
            onClick={() => resubmit.mutate({ id: dress.id })}
            disabled={resubmit.isPending}
          >
            {resubmit.isPending ? "Resubmitting..." : "Edit and resubmit"}
          </Button>
        </div>
      )}

      {needsImage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Add at least one image</p>
          <p className="mt-1 text-sm text-amber-800">
            Your dress will appear in the admin review queue once it has a primary image.
          </p>
        </div>
      )}

      <section className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] p-6">
        <DressImageGallery
          dressId={dress.id}
          images={dress.Images ?? []}
          onMutated={handleImagesMutated}
        />
      </section>

      <section className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] p-6">
        <ConsignerDressForm
          mode="edit"
          defaultValues={defaultValues}
          lockPricingAndSize={lockPricingAndSize}
          onSubmit={(input) => update.mutate({ id: dress.id, ...input })}
          isSubmitting={update.isPending}
          submitLabel="Save changes"
        />
      </section>
    </div>
  );
}
