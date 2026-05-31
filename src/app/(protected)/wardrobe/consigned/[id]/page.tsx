// src/app/(protected)/wardrobe/consigned/[id]/page.tsx
//
// Intermediate segment redirect. The edit page lives at
// /wardrobe/consigned/[id]/edit; this stub catches bare /[id] navigations
// and prefetch RSC fetches so they don't 404.

import { redirect } from "next/navigation";

export default async function ConsignerDressByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/wardrobe/consigned/${id}/edit`);
}
