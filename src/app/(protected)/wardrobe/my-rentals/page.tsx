"use client";

import { Suspense } from "react";
import { MyRentalsView } from "@/features/wardrobe/components/request/MyRentalsView";

export default function MyRentalsPage() {
  return (
    <Suspense fallback={null}>
      <MyRentalsView />
    </Suspense>
  );
}
