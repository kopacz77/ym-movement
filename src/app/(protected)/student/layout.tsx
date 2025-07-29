// src/app/(protected)/student/layout.tsx
"use client";

import { AppLayout } from "@/components/layout/AppLayout";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout role="student">{children}</AppLayout>;
}
