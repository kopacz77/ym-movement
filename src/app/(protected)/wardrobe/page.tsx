import { Shirt } from "lucide-react";

export default function WardrobePlaceholderPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">Wardrobe</h1>
        <p className="mt-1 text-sm text-slate-500">Browse and rent competition dresses.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] p-12 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0891b2]/10 text-[#0891b2] mb-4">
          <Shirt className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#1a3a5c]">Coming soon</h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
          The wardrobe catalog launches with Phase 15. You will be able to browse competition
          dresses, filter by category and color, see fit recommendations based on your measurements,
          and submit rental requests directly to dress owners.
        </p>
      </div>
    </div>
  );
}
