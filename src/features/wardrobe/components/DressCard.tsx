import type { DressCategory, DressStatus } from "@prisma/client";
import { ImageIcon } from "lucide-react";
import Link from "next/link";

import { BestFitBadge } from "@/features/wardrobe/components/BestFitBadge";
import { CategoryBadge } from "@/features/wardrobe/components/CategoryBadge";
import { DressStatusBadge } from "@/features/wardrobe/components/DressStatusBadge";
import { formatCurrencyFromCents } from "@/lib/utils";

export interface DressCardProps {
  dress: {
    id: string;
    title: string;
    category: DressCategory;
    status: DressStatus;
    sizeLabel: string;
    competitionPrice: number; // cents
    color: string;
    Images: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
  };
  /** From wardrobe.list when caller has measurements; null when not. */
  fitScorePercent?: number | null;
  /** Override the default /wardrobe/[id] link (used by Phase 18 consigner view). */
  href?: string;
}

export function DressCard({ dress, fitScorePercent, href }: DressCardProps) {
  const primaryImage = dress.Images.find((i) => i.isPrimary)?.url ?? dress.Images[0]?.url ?? null;
  const target = href ?? `/wardrobe/${dress.id}`;

  return (
    <Link
      href={target}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] transition hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Image — aspect square; fallback when no images */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
        {primaryImage ? (
          // biome-ignore lint/performance/noImgElement: Vercel Blob domain not in next.config remotePatterns (deferred per 14-05 SUMMARY)
          <img
            src={primaryImage}
            alt={dress.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageIcon className="h-12 w-12" />
          </div>
        )}
        {/* Status badge only when NOT the default AVAILABLE */}
        {dress.status !== "AVAILABLE" && (
          <div className="absolute right-2 top-2">
            <DressStatusBadge status={dress.status} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold text-[#1a3a5c]">{dress.title}</h3>
          <CategoryBadge category={dress.category} />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Size {dress.sizeLabel}</span>
          <span aria-hidden>•</span>
          <span>{dress.color}</span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Competition</div>
            <div className="text-lg font-bold text-[#1a3a5c]">
              {formatCurrencyFromCents(dress.competitionPrice)}
            </div>
          </div>
          {fitScorePercent != null && <BestFitBadge percent={fitScorePercent} />}
        </div>
      </div>
    </Link>
  );
}
