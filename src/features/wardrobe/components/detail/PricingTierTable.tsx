"use client";

import { formatCurrencyFromCents } from "@/lib/utils";

export interface PricingTierTableProps {
  /** Competition rental price in cents — required */
  competitionPrice: number;
  /** Seasonal rental price in cents — required */
  seasonalPrice: number;
  /** Purchase price in cents; null elides the Purchase row entirely */
  purchasePrice: number | null;
  /** Security deposit (refundable) in cents */
  securityDeposit: number;
  /** Cleaning fee in cents */
  cleaningFee: number;
}

export function PricingTierTable({
  competitionPrice,
  seasonalPrice,
  purchasePrice,
  securityDeposit,
  cleaningFee,
}: PricingTierTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]">
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-4">Pricing</h3>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          <tr>
            <td className="py-3 text-slate-700">Competition rental</td>
            <td className="py-3 text-right font-semibold text-slate-900">
              {formatCurrencyFromCents(competitionPrice)}
            </td>
          </tr>
          <tr>
            <td className="py-3 text-slate-700">Seasonal rental</td>
            <td className="py-3 text-right font-semibold text-slate-900">
              {formatCurrencyFromCents(seasonalPrice)}
            </td>
          </tr>
          {purchasePrice != null && (
            <tr>
              <td className="py-3 text-slate-700">Purchase</td>
              <td className="py-3 text-right font-semibold text-slate-900">
                {formatCurrencyFromCents(purchasePrice)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500">
        <div className="flex justify-between">
          <span>Security deposit (refundable)</span>
          <span>{formatCurrencyFromCents(securityDeposit)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cleaning fee</span>
          <span>{formatCurrencyFromCents(cleaningFee)}</span>
        </div>
      </div>
    </div>
  );
}
