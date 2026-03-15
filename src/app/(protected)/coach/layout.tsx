// src/app/(protected)/coach/layout.tsx
"use client";

import { AppLayout } from "@/components/layout/AppLayout";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout role="coach">{children}</AppLayout>;
}
