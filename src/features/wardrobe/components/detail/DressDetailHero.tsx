"use client";

import type { DressCategory, DressStatus } from "@prisma/client";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { BestFitBadge } from "@/features/wardrobe/components/BestFitBadge";
import { CategoryBadge } from "@/features/wardrobe/components/CategoryBadge";
import { DressStatusBadge } from "@/features/wardrobe/components/DressStatusBadge";
import { DressImageCarousel } from "./DressImageCarousel";

export interface DressDetailHeroProps {
  dress: {
    id: string;
    title: string;
    category: DressCategory;
    status: DressStatus;
    color: string;
    sizeLabel: string;
    Images: Array<{ id: string; url: string; isPrimary: boolean; sortOrder: number }>;
  };
  /** Catalog-style 0..100 fit percent. Null when caller has no measurements. */
  fitScorePercent: number | null;
  /** Opens the RequestRentalDialog in the parent */
  onRequestClick: () => void;
  /** Show "Sign in to request" CTA instead of "Request to Rent" when false (research Open Question 4) */
  isAuthenticated?: boolean;
}

export function DressDetailHero({
  dress,
  fitScorePercent,
  onRequestClick,
  isAuthenticated = true,
}: DressDetailHeroProps) {
  const canRequest = dress.status === "AVAILABLE" || dress.status === "PENDING";

  return (
    <div>
      {/* Back link */}
      <Link
        href="/wardrobe"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-[#0891b2] mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to wardrobe
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Carousel */}
        <DressImageCarousel images={dress.Images} title={dress.title} />

        {/* Title block */}
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <CategoryBadge category={dress.category} />
              {dress.status !== "AVAILABLE" && <DressStatusBadge status={dress.status} />}
              {fitScorePercent != null && <BestFitBadge percent={fitScorePercent} />}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">{dress.title}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {dress.color} · Size {dress.sizeLabel}
            </p>
          </div>

          {/* CTA */}
          {canRequest &&
            (isAuthenticated ? (
              <Button
                onClick={onRequestClick}
                className="bg-[#0891b2] hover:bg-cyan-700 text-white px-6 py-3 text-base"
                size="lg"
              >
                Request to Rent
              </Button>
            ) : (
              <Link
                href={`/auth/signin?redirect=/wardrobe/${dress.id}`}
                className="inline-flex items-center justify-center rounded-md bg-[#0891b2] hover:bg-cyan-700 text-white px-6 py-3 text-base font-medium"
              >
                Sign in to request
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
