import { Sparkles } from "lucide-react";

export interface BestFitBadgeProps {
  /** 0..100 integer score. Pass null/undefined to render nothing. */
  percent: number | null | undefined;
  /** Optional override to color the pill by tier (>=80 emerald, >=50 cyan, else amber). */
  tier?: "auto" | "cyan";
}

export function BestFitBadge({ percent, tier = "auto" }: BestFitBadgeProps) {
  if (percent == null || percent < 0) {
    return null;
  }

  // Tier coloring: high fit = emerald (success), medium = cyan (brand), low = amber (caution).
  let bg = "bg-cyan-50";
  let text = "text-cyan-700";
  if (tier === "auto") {
    if (percent >= 80) {
      bg = "bg-emerald-50";
      text = "text-emerald-700";
    } else if (percent < 50) {
      bg = "bg-amber-50";
      text = "text-amber-700";
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bg} ${text}`}
    >
      <Sparkles className="h-3 w-3" />
      Best Fit {percent}%
    </span>
  );
}
