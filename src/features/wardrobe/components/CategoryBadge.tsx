import type { DressCategory } from "@prisma/client";

const CATEGORY_LABELS: Record<DressCategory, string> = {
  CLASSICAL: "Classical",
  DRAMATIC: "Dramatic",
  THEMED: "Themed",
  ICE_DANCE_PARTNER: "Ice Dance — Partner",
  ICE_DANCE_SINGLE: "Ice Dance — Single",
  COMPETITION: "Competition",
  TEST: "Test",
};

interface CategoryBadgeProps {
  category: DressCategory;
  className?: string;
}

export function CategoryBadge({ category, className = "" }: CategoryBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 ${className}`}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}
