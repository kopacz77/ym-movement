import type { RentalPaymentStatus, RentalRequestStatus } from "@prisma/client";

/**
 * Status values this badge accepts: the full RentalRequestStatus enum (5 variants)
 * unioned with the full RentalPaymentStatus enum (5 variants). The exhaustive
 * Record forces a compile error if either Prisma enum adds a variant — same
 * contract pattern as DressStatusBadge.tsx.
 *
 * Brand palette per 2026-04-26 sweep (CLAUDE.md): emerald/cyan/amber/slate/rose.
 */
type Status = RentalRequestStatus | RentalPaymentStatus;

const STATUS_STYLES: Record<Status, { bg: string; text: string; label: string }> = {
  // RentalRequestStatus
  PENDING: { bg: "bg-cyan-50", text: "text-cyan-700", label: "Pending" },
  APPROVED: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Approved" },
  DECLINED: { bg: "bg-rose-50", text: "text-rose-700", label: "Declined" },
  CANCELED: { bg: "bg-slate-100", text: "text-slate-600", label: "Canceled" },
  CONVERTED: { bg: "bg-violet-50", text: "text-violet-700", label: "Confirmed" },
  // RentalPaymentStatus
  AWAITING_PAYMENT: { bg: "bg-amber-50", text: "text-amber-700", label: "Awaiting Payment" },
  PAID: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Paid" },
  RETURNED: { bg: "bg-cyan-50", text: "text-cyan-700", label: "Returned" },
  DEPOSIT_RELEASED: { bg: "bg-slate-50", text: "text-slate-700", label: "Closed" },
  LATE_FEE_OWED: { bg: "bg-rose-50", text: "text-rose-700", label: "Late Fee Owed" },
};

export interface RentalStatusBadgeProps {
  status: Status;
  className?: string;
}

export function RentalStatusBadge({ status, className = "" }: RentalStatusBadgeProps) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text} ${className}`}
    >
      {s.label}
    </span>
  );
}
