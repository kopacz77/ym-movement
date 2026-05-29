"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DressForm } from "@/features/wardrobe/components/admin/DressForm";
import { api } from "@/lib/api";

export default function NewDressPage() {
  const router = useRouter();
  const utils = api.useUtils();

  const create = api.admin.wardrobe.create.useMutation({
    onSuccess: (dress) => {
      // Invalidate the list so a return-to-inventory will show the new dress
      utils.admin.wardrobe.list.invalidate();
      toast.success("Dress created", {
        description: "Add images on the next screen to complete the listing.",
      });
      // Create-then-redirect: the Phase 13 upload pipeline requires a real
      // dressId at token-mint time (the /api/wardrobe/upload route reads
      // dressId from clientPayload and calls prisma.dress.findUnique). So we
      // cannot upload images on the new-dress page itself — the user lands on
      // the edit page where DressImageGallery is wired and ready.
      router.push(`/admin/wardrobe/${dress.id}/edit`);
    },
    onError: (error) => {
      toast.error("Failed to create dress", { description: error.message });
    },
  });

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
        <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">New Dress</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a dress to inventory. Once saved, you can upload images on the next screen.
        </p>
      </div>

      <DressForm
        mode="create"
        onSubmit={(input) => create.mutate(input)}
        isSubmitting={create.isPending}
        submitLabel="Create dress"
      />
    </div>
  );
}
