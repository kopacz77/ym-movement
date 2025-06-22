import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateTime } from "luxon";
// src/features/scheduling/components/forms/TimeSlotForm.tsx
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useTimeSlots } from "../../hooks/useTimeSlots";

// Simplified schema for time slot creation
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
  rinks: Array<{ id: string; name: string; timezone?: string }>;
  onSubmitAction?: () => void;
}

// Format the initial time preserving UTC - moved outside component
const formatInitialStartTime = (date: Date | null) => {
  if (!date) {
    return "";
  }

  // Format using the date's UTC components to preserve the exact time
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const TimeSlotForm = ({
  initialStartTime,
  initialEndTime,
  initialRinkId,
  rinks,
  onSubmitAction,
}: TimeSlotFormProps) => {
  // Use the hook-based approach
  const { createTimeSlot, validateTimeRange } = useTimeSlots();

  // Calculate initial duration
  const initialDuration =
    initialEndTime && initialStartTime
      ? Math.max(
          60,
          Math.round((initialEndTime.getTime() - initialStartTime.getTime()) / (1000 * 60)),
        )
      : 60;

  const form = useForm<TimeSlotFormValues>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: {
      rinkId: initialRinkId || "",
      startTime: initialStartTime ? formatInitialStartTime(initialStartTime) : "",
      duration: initialDuration,
      maxStudents: 1,
    },
  });

  // Debug initial values
  useEffect(() => {
    console.log("TimeSlotForm initial values:", {
      startTime: initialStartTime ? initialStartTime.toISOString() : null,
      formattedStartTime: initialStartTime ? formatInitialStartTime(initialStartTime) : null,
      endTime: initialEndTime ? initialEndTime.toISOString() : null,
      duration: initialDuration,
      rawHours: initialStartTime ? initialStartTime.getUTCHours() : null,
      rawMinutes: initialStartTime ? initialStartTime.getUTCMinutes() : null,
    });
  }, [initialStartTime, initialEndTime, initialDuration]);

  const handleSubmit = (values: TimeSlotFormValues) => {
    // Find the selected rink to get its timezone
    const selectedRink = rinks.find((rink) => rink.id === values.rinkId);
    const rinkTimezone = selectedRink?.timezone || "America/Los_Angeles";

    // Parse the datetime string into parts to work with
    const [datePart, timePart] = values.startTime.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);

    // Create a DateTime object in the rink's timezone
    const localRinkTime = DateTime.fromObject(
      {
        year,
        month,
        day,
        hour: hours,
        minute: minutes,
      },
      { zone: rinkTimezone },
    );

    // Convert to UTC for storage
    const utcStartTime = localRinkTime.toUTC().toJSDate();
    const utcEndTime = localRinkTime.plus({ minutes: values.duration }).toUTC().toJSDate();

    // Log the time values for debugging
    console.log("Creating time slot with:", {
      rinkId: values.rinkId,
      rinkTimezone,
      inputLocalTime: `${hours}:${minutes.toString().padStart(2, "0")}`,
      localRinkTime: localRinkTime.toString(),
      utcStartTime: utcStartTime.toISOString(),
      utcEndTime: utcEndTime.toISOString(),
      durationMinutes: values.duration,
    });

    // Validate the time range
    const validationError = validateTimeRange({ startTime: utcStartTime, endTime: utcEndTime });
    if (validationError) {
      form.setError("startTime", { message: validationError });
      return;
    }

    // Create the time slot data
    const timeSlotData = {
      rinkId: values.rinkId,
      startTime: utcStartTime,
      endTime: utcEndTime,
      maxStudents: values.maxStudents,
      isActive: true,
    };

    // Submit using the hook's createTimeSlot mutation
    createTimeSlot.mutateAsync(timeSlotData).then(() => {
      if (onSubmitAction) {
        onSubmitAction();
      }
    });
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
                      {rink.name}{" "}
                      {rink.timezone
                        ? `(${rink.timezone.split("/").pop()?.replace("_", " ")})`
                        : ""}
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
              <FormDescription>Times will be interpreted as the rink's local time</FormDescription>
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
          <Button type="button" variant="outline" onClick={onSubmitAction}>
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
