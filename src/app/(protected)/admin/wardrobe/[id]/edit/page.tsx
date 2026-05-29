"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { DressForm } from "@/features/wardrobe/components/admin/DressForm";
import { DressImageGallery } from "@/features/wardrobe/components/admin/DressImageGallery";
import { DressStatusBadge } from "@/features/wardrobe/components/DressStatusBadge";
import { api } from "@/lib/api";

export default function EditDressPage() {
  const params = useParams<{ id: string }>();
  const dressId = params.id;
  const utils = api.useUtils();

  const { data: dress, isLoading } = api.admin.wardrobe.byId.useQuery({ id: dressId });

  const update = api.admin.wardrobe.update.useMutation({
    onSuccess: () => {
      utils.admin.wardrobe.byId.invalidate({ id: dressId });
      utils.admin.wardrobe.list.invalidate();
      toast.success("Dress updated");
    },
    onError: (error) => {
      toast.error("Failed to save changes", { description: error.message });
    },
  });

  // Invalidator passed to the gallery; gallery calls onMutated() after any image change
  const handleImagesMutated = () => {
    utils.admin.wardrobe.byId.invalidate({ id: dressId });
    utils.admin.wardrobe.list.invalidate();
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
          href="/admin/wardrobe"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0891b2]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to inventory
        </Link>
        <p className="text-sm text-slate-600">Dress not found.</p>
      </div>
    );
  }

  // Map server dress (cents, arrays) → DressForm defaultValues (dollars, comma-separated raw strings).
  // This is the single conversion site between the wire/DB layer and the form UI layer.
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
    securityDepositUsd: dress.securityDeposit / 100,
    cleaningFeeUsd: dress.cleaningFee / 100,
    consignmentCommissionPct: dress.consignmentCommissionPct,
    internalNotes: dress.internalNotes ?? "",
    status: dress.status,
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/wardrobe"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0891b2] mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to inventory
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">{dress.title}</h1>
          <DressStatusBadge status={dress.status} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Owner: {dress.Owner?.email ?? "—"} · Edit fields, manage images, change status.
        </p>
      </div>

      {/* Images — full gallery above the form so first-time edit-from-create lands here directly */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] p-6">
        <DressImageGallery
          dressId={dress.id}
          images={dress.Images ?? []}
          onMutated={handleImagesMutated}
        />
      </section>

      {/* Metadata form */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] p-6">
        <DressForm
          mode="edit"
          defaultValues={defaultValues}
          onSubmit={(input) => update.mutate({ id: dress.id, ...input })}
          isSubmitting={update.isPending}
          submitLabel="Save changes"
        />
      </section>
    </div>
  );
}
