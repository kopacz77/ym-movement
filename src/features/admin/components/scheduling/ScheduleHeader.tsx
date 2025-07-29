// src/features/admin/components/scheduling/ScheduleHeader.tsx

import { CheckSquare } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UndoBulkCreationButton } from "./UndoBulkCreationButton";

// Define a type for the rink object
interface Rink {
  id: string;
  name: string;
  timezone: string;
}

interface ScheduleHeaderProps {
  selectedRink: string | undefined;
  onRinkSelect: (rinkId: string | undefined) => void;
  createTimeSlotButton: React.ReactNode;
  bulkCreateButton: React.ReactNode;
  rinks: Rink[];
  // Bulk actions props
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
}

export const ScheduleHeader: FC<ScheduleHeaderProps> = ({
  selectedRink,
  onRinkSelect,
  createTimeSlotButton,
  bulkCreateButton,
  rinks,
  isSelectionMode,
  onToggleSelectionMode,
}) => {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Schedule Management</h1>
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
          Create and manage lesson time slots across all rinks.
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col gap-4 p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg shrink-0">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Quick Actions</h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Create individual or bulk time slots</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* Rink Selector */}
          <Select
            value={selectedRink}
            onValueChange={(value) => onRinkSelect(value === "all_rinks" ? undefined : value)}
          >
            <SelectTrigger className="w-full bg-white shadow-sm">
              <SelectValue placeholder="All Rinks" />
            </SelectTrigger>
            <SelectContent className="max-w-sm">
              <SelectItem value="all_rinks">All Rinks</SelectItem>
              {rinks?.map((rink: Rink) => (
                <SelectItem key={rink.id} value={rink.id} className="whitespace-normal">
                  <span className="block">
                    {rink.name} ({rink.timezone.split("/").pop()?.replace("_", " ")})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <UndoBulkCreationButton />
            {onToggleSelectionMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleSelectionMode}
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Bulk Select</span>
                <span className="sm:hidden">Select</span>
              </Button>
            )}
            {createTimeSlotButton}
            {bulkCreateButton}
          </div>
        </div>
      </div>
    </div>
  );
};
