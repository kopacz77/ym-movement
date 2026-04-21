// src/features/scheduling/components/calendar/CalendarToolbar.tsx
"use client";

import { ChevronLeft, ChevronRight, CheckSquare, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScheduleContext } from "@/features/scheduling/context/ScheduleContext";
import type { CalendarView } from "@/features/scheduling/context/schedule-state";
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

export function CalendarToolbar({ rinks, coaches, filteredTimeSlots }: CalendarToolbarProps) {
  const { state, dispatch } = useScheduleContext();

  const dateLabel = format(
    state.currentDate,
    state.view === "dayGridMonth" ? "MMMM yyyy" : "MMM d, yyyy",
  );
  const draftCount = filteredTimeSlots.filter((s) => !s.isActive).length;

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
          {draftCount > 0 && (
            <Badge variant="secondary" size="sm">
              {draftCount} drafts
            </Badge>
          )}
        </div>

        {/* Right: View switcher + actions */}
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex border rounded-md overflow-hidden">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => dispatch({ type: "SET_VIEW", view: opt.value })}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  state.view === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

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

        {/* Selection mode info */}
        {state.isSelectionMode && state.selectedSlotIds.size > 0 && (
          <Badge variant="secondary">{state.selectedSlotIds.size} selected</Badge>
        )}
      </div>
    </div>
  );
}
