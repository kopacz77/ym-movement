// src/features/admin/components/scheduling/ScheduleHeader.tsx

import { CheckSquare, Filter, Globe, Plane, Send } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

// US timezones for filtering rinks (no "All" option - would be visually chaotic)
const TIMEZONE_FILTERS = [
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/New_York", label: "Eastern Time" },
];

interface ScheduleHeaderProps {
  selectedRink: string | undefined;
  onRinkSelect: (rinkId: string | undefined) => void;
  createTimeSlotButton: React.ReactNode;
  bulkCreateButton: React.ReactNode;
  rinks: Rink[];
  // Display timezone for "All Rinks" view
  displayTimezone?: string;
  onDisplayTimezoneChange?: (timezone: string) => void;
  // Coach selector props
  selectedCoachId?: string;
  onCoachSelect?: (coachId: string | undefined) => void;
  coaches?: Array<{ id: string; user: { name: string | null } }>;
  currentUserCoachId?: string;
  // Bulk actions props
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  // Date range filter props
  dateRangeFilter?: React.ReactNode;
  // Travel dates blocker
  travelDateBlocker?: React.ReactNode;
  // Draft publish props
  draftCount?: number;
  onPublishDrafts?: () => void;
  isPublishing?: boolean;
}

export const ScheduleHeader: FC<ScheduleHeaderProps> = ({
  selectedRink,
  onRinkSelect,
  createTimeSlotButton,
  bulkCreateButton,
  rinks,
  displayTimezone = "America/Los_Angeles",
  onDisplayTimezoneChange,
  selectedCoachId,
  onCoachSelect,
  coaches,
  currentUserCoachId,
  isSelectionMode,
  onToggleSelectionMode,
  dateRangeFilter,
  travelDateBlocker,
  draftCount = 0,
  onPublishDrafts,
  isPublishing = false,
}) => {
  // Check if "All Rinks" is selected (no specific rink)
  const isAllRinksSelected = !selectedRink;
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
          <div className="p-2 bg-cyan-50 rounded-lg shrink-0">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-[#0891b2]"
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
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Create individual or bulk time slots
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* Coach Selector, Rink Selector, and Display Timezone */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Coach Selector - Only shown when coaches and onCoachSelect are provided */}
            {coaches && onCoachSelect && (
              <Select
                value={selectedCoachId || "all_coaches"}
                onValueChange={(value) =>
                  onCoachSelect(value === "all_coaches" ? undefined : value)
                }
              >
                <SelectTrigger className="w-full sm:flex-1 bg-white shadow-sm">
                  <SelectValue placeholder="All Coaches" />
                </SelectTrigger>
                <SelectContent className="max-w-sm">
                  <SelectItem value="all_coaches">All Coaches</SelectItem>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.user.name || "Unnamed Coach"}
                      {currentUserCoachId && coach.id === currentUserCoachId ? " (You)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={selectedRink || "all_rinks"}
              onValueChange={(value) => onRinkSelect(value === "all_rinks" ? undefined : value)}
            >
              <SelectTrigger className="w-full sm:flex-1 bg-white shadow-sm">
                <SelectValue placeholder="All Rinks" />
              </SelectTrigger>
              <SelectContent className="max-w-sm">
                <SelectItem value="all_rinks">All Rinks</SelectItem>
                {rinks?.map((rink: Rink) => (
                  <SelectItem key={rink.id} value={rink.id} className="whitespace-normal">
                    <span className="block" suppressHydrationWarning>
                      {rink.name} ({rink.timezone.split("/").pop()?.replace("_", " ")})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Timezone Filter - Only shown when "All Rinks" is selected */}
            {isAllRinksSelected && onDisplayTimezoneChange && (
              <Select value={displayTimezone} onValueChange={onDisplayTimezoneChange}>
                <SelectTrigger className="w-full sm:w-[200px] bg-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filter by timezone..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_FILTERS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {draftCount > 0 && onPublishDrafts && (
              <Button
                variant="default"
                size="sm"
                onClick={onPublishDrafts}
                disabled={isPublishing}
                className="flex items-center gap-2 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {isPublishing
                    ? "Publishing..."
                    : `Publish ${draftCount} Draft${draftCount !== 1 ? "s" : ""}`}
                </span>
                <span className="sm:hidden">
                  {isPublishing ? "..." : `Publish (${draftCount})`}
                </span>
              </Button>
            )}
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
            {dateRangeFilter && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Filter Dates</span>
                    <span className="sm:hidden">Filter</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  {dateRangeFilter}
                </PopoverContent>
              </Popover>
            )}
            {travelDateBlocker && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <Plane className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Block Dates</span>
                    <span className="sm:hidden">Block</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96" align="start">
                  {travelDateBlocker}
                </PopoverContent>
              </Popover>
            )}
            {createTimeSlotButton}
            {bulkCreateButton}
          </div>
        </div>
      </div>
    </div>
  );
};
