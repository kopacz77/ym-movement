"use client";

import { EarningsOverview } from "@/features/coach/components/earnings/EarningsOverview";
import { PaymentHistory } from "@/features/coach/components/earnings/PaymentHistory";

export default function CoachEarningsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Earnings</h1>
      <EarningsOverview />
      <PaymentHistory />
    </div>
  );
}
