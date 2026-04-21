// src/features/scheduling/components/calendar/MobileScheduleList.tsx
"use client";

import { DateTime } from "luxon";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { TimeSlot } from "@/types/scheduling";

interface MobileScheduleListProps {
  timeSlots: TimeSlot[];
  timezone: string;
  onSlotClick: (slot: TimeSlot) => void;
}

export function MobileScheduleList({ timeSlots, timezone, onSlotClick }: MobileScheduleListProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, TimeSlot[]>();
    for (const slot of timeSlots) {
      const dt = DateTime.fromISO(
        typeof slot.startTime === "string" ? slot.startTime : slot.startTime.toISOString(),
        { zone: "utc" },
      ).setZone(timezone);
      const key = dt.toFormat("yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    // Sort by date
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [timeSlots, timezone]);

  if (grouped.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">No time slots in this period.</div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([dateKey, slots]) => {
        const dt = DateTime.fromISO(dateKey);
        return (
          <div key={dateKey}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              {dt.toFormat("EEEE, MMM d")}
            </h3>
            <div className="space-y-2">
              {slots.map((slot) => {
                const start = DateTime.fromISO(
                  typeof slot.startTime === "string"
                    ? slot.startTime
                    : slot.startTime.toISOString(),
                  { zone: "utc" },
                ).setZone(timezone);
                const end = DateTime.fromISO(
                  typeof slot.endTime === "string" ? slot.endTime : slot.endTime.toISOString(),
                  { zone: "utc" },
                ).setZone(timezone);
                const lessons = slot.Lesson || [];

                return (
                  <Card
                    key={slot.id}
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSlotClick(slot)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          {start.toFormat("h:mm a")} - {end.toFormat("h:mm a")}
                        </div>
                        <div className="text-xs text-muted-foreground">{slot.Rink?.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!slot.isActive && (
                          <Badge variant="secondary" size="sm">
                            Draft
                          </Badge>
                        )}
                        <Badge
                          variant={lessons.length >= slot.maxStudents ? "default" : "outline"}
                          size="sm"
                        >
                          {lessons.length}/{slot.maxStudents}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
