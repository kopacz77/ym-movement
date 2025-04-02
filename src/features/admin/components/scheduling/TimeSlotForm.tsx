// src/features/admin/components/scheduling/TimeSlotForm.tsx
"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";

// Simplified schema without recurring pattern fields
const timeSlotSchema = z.object({
  rinkId: z.string().min(1, "Please select a rink"),
  startTime: z.string().min(1, "Start time is required"),
  duration: z.coerce.number().min(15, "Minimum duration is 15 minutes"),
  maxStudents: z.coerce.number().min(1, "At least 1 student required"),
});

type TimeSlotFormValues = z.infer<typeof timeSlotSchema>;

interface TimeSlotFormProps {
  initialStartTime: Date | null;
  initialEndTime: Date | null;
  initialRinkId?: string;
  rinks: Array<{ id: string; name: string }>;
  onSubmitAction?: () => void;
  onSubmit?: () => void; // Kept for compatibility
}

// Format the initial time preserving UTC - moved outside component
const formatInitialStartTime = (date: Date | null) => {
  if (!date) { return ""; }
  
  // Format using the date's UTC components to preserve the exact time
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const TimeSlotForm = ({
  initialStartTime,
  initialEndTime,
  initialRinkId,
  rinks,
  onSubmitAction,
  onSubmit,
}: TimeSlotFormProps) => {
  const utils = api.useUtils();

  // Use onSubmitAction if available, otherwise fallback to onSubmit
  const handleFormSubmitComplete = onSubmitAction || onSubmit || (() => {});

  const form = useForm<TimeSlotFormValues>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: {
      rinkId: initialRinkId || "",
      startTime: initialStartTime ? formatInitialStartTime(initialStartTime) : "",
      duration:
        initialEndTime && initialStartTime
          ? Math.max(
              60,
              Math.round((initialEndTime.getTime() - initialStartTime.getTime()) / (1000 * 60)),
            )
          : 60,
      maxStudents: 1,
    },
  });

  // Debug initial values
  useEffect(() => {
    console.log("TimeSlotForm initial values:", {
      startTime: initialStartTime ? initialStartTime.toISOString() : null,
      formattedStartTime: initialStartTime ? formatInitialStartTime(initialStartTime) : null,
      endTime: initialEndTime ? initialEndTime.toISOString() : null,
      duration:
        initialEndTime && initialStartTime
          ? Math.round((initialEndTime.getTime() - initialStartTime.getTime()) / (1000 * 60))
          : null,
      rawHours: initialStartTime ? initialStartTime.getUTCHours() : null,
      rawMinutes: initialStartTime ? initialStartTime.getUTCMinutes() : null,
    });
  }, [initialStartTime, initialEndTime]);

  const createTimeSlot = api.admin.schedule.createTimeSlot.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Time slot created successfully",
      });
      utils.admin.schedule.getTimeSlots.invalidate();
      handleFormSubmitComplete();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const handleSubmit = (values: TimeSlotFormValues) => {
    // Parse the datetime string into parts WITHOUT timezone adjustment
    const [datePart, timePart] = values.startTime.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);

    // Create date using UTC to preserve the exact time as entered
    const startTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    const endTime = new Date(
      Date.UTC(year, month - 1, day, hours, minutes, 0) + values.duration * 60000,
    );

    // Log the time values for debugging
    console.log("Creating single time slot with:", {
      rinkId: values.rinkId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes: values.duration,
      formInput: values.startTime,
      rawHours: hours,
      rawMinutes: minutes,
      exactTimeDisplay: `${hours}:${minutes.toString().padStart(2, "0")}`
    });

    // Simplified data object without recurring pattern
    const timeSlotData = {
      rinkId: values.rinkId,
      startTime,
      endTime,
      maxStudents: values.maxStudents,
      isActive: true,
    };

    // Display time as entered without timezone adjustment
    toast.info("Creating slot", {
      description: `${hours}:${minutes.toString().padStart(2, "0")} for ${
        values.duration
      } minutes - EXACT time as selected on calendar`,
    });

    createTimeSlot.mutate(timeSlotData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="rinkId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rink</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a rink" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="w-full min-w-[200px]">
                  {rinks.map((rink) => (
                    <SelectItem key={rink.id} value={rink.id} className="w-full">
                      {rink.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormDescription>
                Times will be used exactly as entered (no timezone conversion)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>Minimum duration is 15 minutes</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxStudents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Students</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={handleFormSubmitComplete}>
            Cancel
          </Button>
          <Button type="submit" disabled={createTimeSlot.isPending}>
            {createTimeSlot.isPending ? "Creating..." : "Create Time Slot"}
          </Button>
        </div>
      </form>
    </Form>
  );
};