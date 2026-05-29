"use client";

import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useCallback, useState } from "react";

export interface DressImageCarouselProps {
  images: Array<{ id: string; url: string; isPrimary: boolean; sortOrder: number }>;
  title: string;
}

export function DressImageCarousel({ images, title }: DressImageCarouselProps) {
  // Seed initial frame to the primary image (Pitfall 6 — first frame matches catalog thumbnail).
  // Math.max(0, …) coerces -1 (no primary) into 0; safe for 0-length arrays too because the
  // empty-state branch short-circuits before we read images[index].
  const startIdx = Math.max(
    0,
    images.findIndex((i) => i.isPrimary),
  );
  const [index, setIndex] = useState(startIdx);
  const total = images.length;

  const goPrev = useCallback(() => setIndex((i) => (i - 1 + total) % total), [total]);
  const goNext = useCallback(() => setIndex((i) => (i + 1) % total), [total]);

  if (total === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-slate-50 text-slate-300">
        <ImageIcon className="h-16 w-16" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-50">
        {/* biome-ignore lint/performance/noImgElement: Vercel Blob domain not in next.config remotePatterns (deferred per 14-05 SUMMARY) */}
        <img
          src={images[index].url}
          alt={`${title} (image ${index + 1} of ${total})`}
          className="h-full w-full object-cover"
        />
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to image ${i + 1}`}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i === index ? "bg-[#0891b2]" : "bg-slate-200 hover:bg-slate-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
