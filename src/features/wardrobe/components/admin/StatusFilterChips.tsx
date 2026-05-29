"use client";

import type { DressStatus } from "@prisma/client";

const ALL_STATUSES: DressStatus[] = [
  "AVAILABLE",
  "PENDING_APPROVAL",
  "PENDING",
  "RENTED",
  "MAINTENANCE",
  "REJECTED",
  "ARCHIVED",
];

const STATUS_LABELS: Record<DressStatus, string> = {
  AVAILABLE: "Available",
  PENDING_APPROVAL: "Pending Approval",
  PENDING: "Pending Rental",
  RENTED: "Rented",
  MAINTENANCE: "Maintenance",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

interface StatusFilterChipsProps {
  selected: DressStatus[];
  onChange: (next: DressStatus[]) => void;
  className?: string;
}

export function StatusFilterChips({ selected, onChange, className = "" }: StatusFilterChipsProps) {
  const toggle = (status: DressStatus) => {
    if (selected.includes(status)) {
      onChange(selected.filter((s) => s !== status));
    } else {
      onChange([...selected, status]);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {ALL_STATUSES.map((status) => {
        const active = selected.includes(status);
        return (
          <button
            key={status}
            type="button"
            onClick={() => toggle(status)}
            aria-pressed={active}
            className={
              active
                ? "px-3 py-1.5 rounded-full text-xs font-semibold bg-[#0891b2] text-white border border-[#0891b2] transition-colors hover:bg-[#06748f]"
                : "px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-slate-700 border border-slate-300 transition-colors hover:bg-slate-50"
            }
          >
            {STATUS_LABELS[status]}
          </button>
        );
      })}
    </div>
  );
}
