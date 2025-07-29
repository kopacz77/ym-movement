// src/features/scheduling/components/RinkSelector.tsx
"use client";
import type { Rink } from "@prisma/client";
import type React from "react";
import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RinkSelectorProps {
  rinks: Rink[];
  selectedRinkId: string;
  onRinkChangeAction: (rinkId: string) => void;
}

export const RinkSelector: React.FC<RinkSelectorProps> = ({
  rinks,
  selectedRinkId,
  onRinkChangeAction,
}) => {
  // Memoize the selected rink's timezone to avoid recalculations on each render
  const selectedRinkTimezone = useMemo(() => {
    const selectedRink = rinks.find((r) => r.id === selectedRinkId);
    if (!selectedRink) {
      return null;
    }

    return selectedRink.timezone.split("/").pop()?.replace("_", " ") || selectedRink.timezone;
  }, [rinks, selectedRinkId]);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Select Rink:</label>
        <Select value={selectedRinkId} onValueChange={onRinkChangeAction}>
          <SelectTrigger className="w-full md:w-auto md:min-w-[280px] max-w-md">
            <SelectValue placeholder="Choose a rink" />
          </SelectTrigger>
          <SelectContent className="max-w-md">
            {rinks.map((rink) => (
              <SelectItem key={rink.id} value={rink.id} className="whitespace-normal">
                <span className="block">
                  {rink.name} ({rink.timezone.split("/").pop()?.replace("_", " ")})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedRinkId && selectedRinkTimezone && (
        <div className="mt-2 text-sm flex items-center">
          <span className="mr-2">🌐</span>
          <span>All times shown in {selectedRinkTimezone} local time</span>
        </div>
      )}
    </div>
  );
};
