"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOperationalSettings } from "@/hooks/useOperationalSettings";

interface CompactTimeSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  selectedStartTime?: string;
  selectedRinkId?: string;
  onBookingSubmit: (bookingData: {
    date: Date;
    startTime: string;
    endTime: string;
    rinkId: string;
    maxStudents: number;
  }) => void;
  rinks: Array<{ id: string; name: string; timezone: string }>;
  isLoading?: boolean;
}

export function CompactTimeSlotDialog({
  open,
  onOpenChange,
  selectedDate,
  selectedStartTime,
  selectedRinkId,
  onBookingSubmit,
  rinks,
  isLoading = false,
}: CompactTimeSlotDialogProps) {
  const [startTime, setStartTime] = React.useState<string>("");
  const [endTime, setEndTime] = React.useState<string>("");
  const [rinkId, setRinkId] = React.useState<string>("");
  const [maxStudents, setMaxStudents] = React.useState<number>(1);

  // Use operational settings for dynamic time slot generation
  const { businessHours, validateTimeSlot, isDayActive } = useOperationalSettings();

  // Generate time slots based on operational hours in 15-minute intervals
  const timeSlots = React.useMemo(() => {
    const slots = [];
    const startHour = businessHours.startHour;
    const endHour = businessHours.endHour;

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        // Don't create slots that go beyond the end hour
        if (hour === endHour && minute > businessHours.endMinutes) {
          break;
        }

        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        const displayTime = new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        slots.push({ value: timeString, label: displayTime });
      }
    }
    return slots;
  }, [businessHours]);

  // Auto-calculate end time when start time changes (1 hour default)
  React.useEffect(() => {
    if (startTime && !endTime) {
      const [hours, minutes] = startTime.split(":").map(Number);
      const endHour = hours + 1;
      const endTimeString = `${endHour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      setEndTime(endTimeString);
    }
  }, [startTime, endTime]);

  // Reset form when dialog opens with smart defaults
  React.useEffect(() => {
    if (open) {
      // Pre-fill start time if provided (from calendar click)
      setStartTime(selectedStartTime || "");
      setEndTime(""); // Will be auto-calculated

      // Pre-fill rink if provided or use first available
      setRinkId(selectedRinkId || rinks[0]?.id || "");
      setMaxStudents(1);
    }
  }, [open, selectedStartTime, selectedRinkId, rinks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !startTime || !endTime || !rinkId) {
      return;
    }

    // Check if the selected day is active
    if (!isDayActive(selectedDate)) {
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayName = dayNames[selectedDate.getDay()];
      toast.error("Cannot create time slot", {
        description: `${dayName} is not configured as an active business day. Please check your operational hours settings.`,
      });
      return;
    }

    // Create start and end Date objects for validation
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const startDateTime = new Date(selectedDate);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(selectedDate);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    // Validate the time slot against operational hours
    const validation = validateTimeSlot(startDateTime, endDateTime);
    if (!validation.isValid) {
      toast.error("Invalid time slot", {
        description: validation.message,
      });
      return;
    }

    onBookingSubmit({
      date: selectedDate,
      startTime,
      endTime,
      rinkId,
      maxStudents,
    });
  };

  const canSubmit = selectedDate && startTime && endTime && rinkId && !isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Create Time Slot
          </DialogTitle>
          <DialogDescription>
            {selectedDate ? (
              <>
                Creating slot for <strong>{format(selectedDate, "EEEE, MMMM d, yyyy")}</strong>
              </>
            ) : (
              "Create a new time slot for lessons"
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="start-time">Start Time</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger id="start-time">
                <SelectValue placeholder="Select start time" />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                {timeSlots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <Label htmlFor="end-time">End Time</Label>
            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger id="end-time">
                <SelectValue placeholder="Select end time" />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                {timeSlots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rink */}
          <div className="space-y-2">
            <Label htmlFor="rink">Rink</Label>
            <Select value={rinkId} onValueChange={setRinkId}>
              <SelectTrigger id="rink">
                <SelectValue placeholder="Select rink" />
              </SelectTrigger>
              <SelectContent>
                {rinks.map((rink) => (
                  <SelectItem key={rink.id} value={rink.id}>
                    {rink.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max Students */}
          <div className="space-y-2">
            <Label htmlFor="max-students">Max Students</Label>
            <Input
              id="max-students"
              type="number"
              min="1"
              max="20"
              value={maxStudents}
              onChange={(e) => setMaxStudents(Number.parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isLoading ? "Creating..." : "Create Time Slot"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
