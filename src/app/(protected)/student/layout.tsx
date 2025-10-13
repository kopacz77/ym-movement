// src/app/(protected)/student/layout.tsx
"use client";

import { AppLayout } from "@/components/layout/AppLayout";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  // biome-ignore lint/a11y/useValidAriaRole: role is a custom prop for AppLayout, not an ARIA attribute
  return <AppLayout role="student">{children}</AppLayout>;
}
