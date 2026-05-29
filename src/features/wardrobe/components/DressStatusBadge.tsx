import type { DressStatus } from "@prisma/client";

const STATUS_STYLES: Record<DressStatus, { bg: string; text: string; dot: string; label: string }> =
  {
    AVAILABLE: {
      bg: "bg-emerald-100",
      text: "text-emerald-800",
      dot: "bg-emerald-500",
      label: "Available",
    },
    PENDING_APPROVAL: {
      bg: "bg-amber-100",
      text: "text-amber-800",
      dot: "bg-amber-500 animate-pulse",
      label: "Pending Approval",
    },
    PENDING: {
      bg: "bg-cyan-100",
      text: "text-cyan-800",
      dot: "bg-cyan-500",
      label: "Pending Rental",
    },
    RENTED: {
      bg: "bg-violet-100",
      text: "text-violet-800",
      dot: "bg-violet-500",
      label: "Rented",
    },
    MAINTENANCE: {
      bg: "bg-slate-100",
      text: "text-slate-600",
      dot: "bg-slate-400",
      label: "Maintenance",
    },
    REJECTED: {
      bg: "bg-rose-100",
      text: "text-rose-800",
      dot: "bg-rose-500",
      label: "Rejected",
    },
    ARCHIVED: {
      bg: "bg-slate-100",
      text: "text-slate-500",
      dot: "bg-slate-300",
      label: "Archived",
    },
  };

interface DressStatusBadgeProps {
  status: DressStatus;
  className?: string;
}

export function DressStatusBadge({ status, className = "" }: DressStatusBadgeProps) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
