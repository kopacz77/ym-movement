// src/app/(protected)/wardrobe/measurements/page.tsx
//
// Thin client shell — pattern from 14-06: pages own routing + width
// constraint; the form owns its own header/card chrome. No auth() call here
// because the parent layout (15-04 Task 1) wraps with AppLayout, which gates
// session and role per project convention.

"use client";

import { MeasurementForm } from "@/features/wardrobe/components/MeasurementForm";

export default function MeasurementsPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <MeasurementForm />
    </div>
  );
}
