"use client";

import { use } from "react";

import { DressDetailView } from "@/features/wardrobe/components/detail/DressDetailView";

export default function DressDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DressDetailView dressId={id} />;
}
