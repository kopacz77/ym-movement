// src/features/scheduling/components/calendar/CalendarToolbar.tsx
"use client";

import { format } from "date-fns";
import { CheckSquare, ChevronLeft, ChevronRight, Globe, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UndoBulkCreationButton } from "@/features/admin/components/scheduling/UndoBulkCreationButton";
import { useScheduleContext } from "@/features/scheduling/context/ScheduleContext";
import type { CalendarView } from "@/features/scheduling/context/schedule-state";
import { api } from "@/lib/api";
import type { TimeSlot } from "@/types/scheduling";

interface CalendarToolbarProps {
  rinks: Array<{ id: string; name: string; timezone: string }> | undefined;
  coaches: Array<{ id: string; user: { name: string | null } }> | undefined;
  filteredTimeSlots: TimeSlot[];
}

const VIEW_OPTIONS: { label: string; value: CalendarView }[] = [
  { label: "Week", value: "timeGridWeek" },
  { label: "Day", value: "timeGridDay" },
  { label: "Month", value: "dayGridMonth" },
];

const TIMEZONE_FILTERS = [
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/New_York", label: "Eastern Time" },
];

export function CalendarToolbar({ rinks, coaches, filteredTimeSlots }: CalendarToolbarProps) {
  const { state, dispatch } = useScheduleContext();
  const utils = api.useUtils();

  const dateLabel = format(
    state.currentDate,
    state.view === "dayGridMonth" ? "MMMM yyyy" : "MMM d, yyyy",
  );
  const draftCount = filteredTimeSlots.filter((s) => !s.isActive).length;

  // Publish drafts mutation
  const publishMutation = api.admin.schedule.publishTimeSlots.useMutation({
    onSuccess: (result) => {
      toast("Published", {
        description: `${result.publishedCount} time slot${result.publishedCount !== 1 ? "s" : ""} published successfully`,
      });
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (err) => {
      toast.error("Failed to publish", { description: err.message });
    },
  });

  const handlePublishDrafts = () => {
    // Publish all drafts in the current view range
    const d = state.currentDate;
    let startDate: Date;
    let endDate: Date;

    if (state.view === "timeGridWeek") {
      const dayOfWeek = d.getDay();
      startDate = new Date(d);
      startDate.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (state.view === "timeGridDay") {
      startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    } else {
      startDate = new Date(d.getFullYear(), d.getMonth(), 1);
      endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    }

    publishMutation.mutate({
      startDate,
      endDate,
      ...(state.selectedCoachId && { coachId: state.selectedCoachId }),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Navigation + View + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Left: Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => dispatch({ type: "NAVIGATE_TODAY" })}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => dispatch({ type: "NAVIGATE_PREV" })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => dispatch({ type: "NAVIGATE_NEXT" })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg">{dateLabel}</span>
        </div>

        {/* Right: View switcher + actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View switcher */}
          <div className="flex border rounded-md overflow-hidden">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => dispatch({ type: "SET_VIEW", view: opt.value })}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  state.view === opt.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Publish drafts */}
          {draftCount > 0 && (
            <Button
              size="sm"
              onClick={handlePublishDrafts}
              disabled={publishMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">
                {publishMutation.isPending
                  ? "Publishing..."
                  : `Publish ${draftCount} Draft${draftCount !== 1 ? "s" : ""}`}
              </span>
              <span className="sm:hidden">
                {publishMutation.isPending ? "..." : `Publish (${draftCount})`}
              </span>
            </Button>
          )}

          {/* Undo bulk creation */}
          <UndoBulkCreationButton />

          {/* Bulk select toggle */}
          <Button
            variant={state.isSelectionMode ? "default" : "outline"}
            size="sm"
            onClick={() => dispatch({ type: "TOGGLE_SELECTION_MODE" })}
          >
            {state.isSelectionMode ? (
              <X className="h-4 w-4 mr-1" />
            ) : (
              <CheckSquare className="h-4 w-4 mr-1" />
            )}
            {state.isSelectionMode ? "Exit Select" : "Select"}
          </Button>

          {/* Bulk create */}
          <Button size="sm" onClick={() => dispatch({ type: "OPEN_BULK_CREATE" })}>
            <Plus className="h-4 w-4 mr-1" />
            Bulk Create
          </Button>
        </div>
      </div>

      {/* Row 2: Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Rink filter */}
        <Select
          value={state.selectedRinkId || "all"}
          onValueChange={(v) => dispatch({ type: "SET_RINK", rinkId: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-[180px] h-8">
            <SelectValue placeholder="All Rinks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rinks</SelectItem>
            {rinks?.map((rink) => (
              <SelectItem key={rink.id} value={rink.id}>
                {rink.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Timezone filter - shown when All Rinks selected */}
        {!state.selectedRinkId && (
          <Select
            value={state.timezoneFilter}
            onValueChange={(v) => dispatch({ type: "SET_TIMEZONE_FILTER", timezone: v })}
          >
            <SelectTrigger className="w-[180px] h-8">
              <Globe className="h-3 w-3 mr-1" />
              <SelectValue />
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

        {/* Coach filter */}
        {coaches && coaches.length > 1 && (
          <Select
            value={state.selectedCoachId || "all"}
            onValueChange={(v) =>
              dispatch({ type: "SET_COACH", coachId: v === "all" ? undefined : v })
            }
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="All Coaches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Coaches</SelectItem>
              {coaches.map((coach) => (
                <SelectItem key={coach.id} value={coach.id}>
                  {coach.user?.name || "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Draft count badge */}
        {draftCount > 0 && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            {draftCount} unpublished
          </Badge>
        )}

        {/* Selection mode info */}
        {state.isSelectionMode && state.selectedSlotIds.size > 0 && (
          <Badge variant="secondary">{state.selectedSlotIds.size} selected</Badge>
        )}
      </div>
    </div>
  );
}
