// src/features/admin/components/payments/PaymentFilter.tsx

import type { PaymentStatus } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaymentFilterProps {
  currentFilter: PaymentStatus | "ALL";
  onFilterChange: (status: PaymentStatus | "ALL") => void;
  coachFilter?: string;
  onCoachFilterChange?: (coachId: string | undefined) => void;
  coaches?: { id: string; name: string | null }[];
}

export const PaymentFilter: React.FC<PaymentFilterProps> = ({
  currentFilter,
  onFilterChange,
  coachFilter,
  onCoachFilterChange,
  coaches,
}) => {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Select
          value={currentFilter}
          onValueChange={(value: PaymentStatus | "ALL") => onFilterChange(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="w-full">
            <SelectItem value="ALL" className="w-full">
              All Statuses
            </SelectItem>
            <SelectItem value="PENDING" className="w-full">
              Pending
            </SelectItem>
            <SelectItem value="COMPLETED" className="w-full">
              Completed
            </SelectItem>
            <SelectItem value="FAILED" className="w-full">
              Failed
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {coaches && coaches.length > 0 && onCoachFilterChange && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Coach:</span>
          <Select
            value={coachFilter ?? "ALL"}
            onValueChange={(value) => onCoachFilterChange(value === "ALL" ? undefined : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by coach" />
            </SelectTrigger>
            <SelectContent className="w-full">
              <SelectItem value="ALL" className="w-full">
                All Coaches
              </SelectItem>
              {coaches.map((coach) => (
                <SelectItem key={coach.id} value={coach.id} className="w-full">
                  {coach.name || "Unnamed Coach"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
