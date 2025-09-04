"use client";

import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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

interface EnhancedBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  onBookingSubmit: (bookingData: {
    date: Date;
    startTime: string;
    endTime: string;
    rinkId: string;
    maxStudents: number;
  }) => void;
  rinks: Array<{ id: string; name: string; timezone: string }>;
  bookedDates?: Date[];
  isLoading?: boolean;
}

export function EnhancedBookingDialog({
  open,
  onOpenChange,
  selectedDate,
  onBookingSubmit,
  rinks,
  bookedDates = [],
  isLoading = false,
}: EnhancedBookingDialogProps) {
  const [date, setDate] = React.useState<Date | undefined>(selectedDate);
  const [selectedStartTime, setSelectedStartTime] = React.useState<string>("");
  const [selectedEndTime, setSelectedEndTime] = React.useState<string>("");
  const [selectedRink, setSelectedRink] = React.useState<string>("");
  const [maxStudents, setMaxStudents] = React.useState<number>(1);

  // Generate time slots from 6 AM to 10 PM in 15-minute intervals
  const timeSlots = React.useMemo(() => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(timeString);
      }
    }
    return slots;
  }, []);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setDate(selectedDate);
      setSelectedStartTime("");
      setSelectedEndTime("");
      setSelectedRink(rinks[0]?.id || "");
      setMaxStudents(1);
    }
  }, [open, selectedDate, rinks]);

  const handleSubmit = () => {
    if (!date || !selectedStartTime || !selectedEndTime || !selectedRink) {
      return;
    }

    onBookingSubmit({
      date,
      startTime: selectedStartTime,
      endTime: selectedEndTime,
      rinkId: selectedRink,
      maxStudents,
    });

    onOpenChange(false);
  };

  const isFormValid = date && selectedStartTime && selectedEndTime && selectedRink;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Create Time Slot
          </DialogTitle>
          <DialogDescription>
            Select a date, time, and rink to create a new time slot for lessons.
          </DialogDescription>
        </DialogHeader>

        <Card className="gap-0 p-0">
          <CardContent className="relative p-0 lg:pr-80">
            {/* Left side: Calendar */}
            <div className="p-6">
              <Label className="text-sm font-medium mb-3 block">Select Date</Label>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                defaultMonth={date}
                disabled={bookedDates}
                showOutsideDays={false}
                modifiers={{
                  booked: bookedDates,
                }}
                modifiersClassNames={{
                  booked: "[&>button]:line-through opacity-100",
                }}
                className="bg-transparent p-0 [--cell-size:--spacing(10)] lg:[--cell-size:--spacing(12)]"
                formatters={{
                  formatWeekdayName: (date) => {
                    return date.toLocaleString("en-US", { weekday: "short" });
                  },
                }}
              />
            </div>

            {/* Right side: Time slots and settings */}
            <div className="no-scrollbar inset-y-0 right-0 flex max-h-96 w-full scroll-pb-6 flex-col gap-6 overflow-y-auto border-t p-6 lg:absolute lg:max-h-none lg:w-80 lg:border-t-0 lg:border-l">
              {/* Time Selection */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Time Range</Label>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="start-time" className="text-xs text-muted-foreground">
                      Start Time
                    </Label>
                    <Select value={selectedStartTime} onValueChange={setSelectedStartTime}>
                      <SelectTrigger id="start-time">
                        <SelectValue placeholder="Select start time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="end-time" className="text-xs text-muted-foreground">
                      End Time
                    </Label>
                    <Select value={selectedEndTime} onValueChange={setSelectedEndTime}>
                      <SelectTrigger id="end-time">
                        <SelectValue placeholder="Select end time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Rink Selection */}
              <div className="space-y-3">
                <Label htmlFor="rink" className="text-sm font-medium">
                  Rink
                </Label>
                <Select value={selectedRink} onValueChange={setSelectedRink}>
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
              <div className="space-y-3">
                <Label htmlFor="max-students" className="text-sm font-medium">
                  Max Students
                </Label>
                <Input
                  id="max-students"
                  type="number"
                  min="1"
                  max="20"
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(Number(e.target.value))}
                  placeholder="1"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 border-t px-6 py-5 lg:flex-row">
            <div className="text-sm flex-1">
              {isFormValid ? (
                <>
                  Creating time slot for{" "}
                  <span className="font-medium">
                    {date?.toLocaleDateString("en-US", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>{" "}
                  from <span className="font-medium">{selectedStartTime}</span> to{" "}
                  <span className="font-medium">{selectedEndTime}</span>
                </>
              ) : (
                <>Select a date, time range, and rink to create the time slot.</>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!isFormValid || isLoading}>
                {isLoading ? "Creating..." : "Create Time Slot"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
