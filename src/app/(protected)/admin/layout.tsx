// src/app/(protected)/admin/layout.tsx
"use client";

import { AppLayout } from "@/components/layout/AppLayout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // biome-ignore lint/a11y/useValidAriaRole: role is a custom prop for AppLayout, not an ARIA attribute
  return <AppLayout role="admin">{children}</AppLayout>;
}
