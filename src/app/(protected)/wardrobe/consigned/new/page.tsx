// src/app/(protected)/wardrobe/consigned/new/page.tsx
//
// CONSIGN-01: any authenticated user can self-list a dress. Metadata-only step
// followed by an immediate redirect to /wardrobe/consigned/[id]/edit where the
// image gallery becomes available (Phase 14-06 create-then-redirect ADR — the
// /api/wardrobe/upload route requires a real dressId at clientPayload time).
//
// Server forces status=PENDING_APPROVAL and hydrates commission % from Settings.

"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConsignerDressForm } from "@/features/wardrobe/components/consigner/ConsignerDressForm";
import { api } from "@/lib/api";

export default function ConsignerNewDressPage() {
  const router = useRouter();
  const utils = api.useUtils();

  const create = api.wardrobe.consigner.create.useMutation({
    onSuccess: (dress) => {
      utils.wardrobe.consigner.mine.invalidate();
      toast.success("Dress saved", {
        description: "Add at least one image on the next screen to submit for review.",
      });
      router.push(`/wardrobe/consigned/${dress.id}/edit`);
    },
    onError: (e) => {
      toast.error("Failed to save dress", { description: e.message });
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/wardrobe/consigned"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0891b2] mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to my listings
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">List a new dress</h1>
        <p className="mt-1 text-sm text-slate-500">
          Save metadata first, then add images on the next screen. Admin reviews each submission
          before it goes live.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] p-6">
        <ConsignerDressForm
          mode="create"
          isSubmitting={create.isPending}
          onSubmit={(input) => create.mutate(input)}
          submitLabel="Save & continue"
        />
      </section>
    </div>
  );
}
