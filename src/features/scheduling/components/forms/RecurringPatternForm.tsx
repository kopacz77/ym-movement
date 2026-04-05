import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, differenceInDays, isAfter, parse } from "date-fns";
// src/features/scheduling/components/forms/RecurringPatternForm.tsx
import type React from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { api } from "@/lib/api";

// Define a constant for days of week
const daysOfWeek = [
  { id: 0, label: "Sunday" },
  { id: 1, label: "Monday" },
  { id: 2, label: "Tuesday" },
  { id: 3, label: "Wednesday" },
  { id: 4, label: "Thursday" },
  { id: 5, label: "Friday" },
  { id: 6, label: "Saturday" },
];

// Define form schema with validation but without 30-day limit
const formSchema = z
  .object({
    rinkId: z.string().min(1, "Please select a rink"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    startTime: z.string().min(1, "Start time is required"),
    duration: z.coerce.number().min(30, "Minimum duration is 30 minutes"),
    maxStudents: z.coerce.number().min(1, "At least 1 student required"),
    daysOfWeek: z.array(z.number()).min(1, "Select at least one day"),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) {
        return true; // Let the required validation handle empty values
      }

      try {
        const start = parse(data.startDate, "yyyy-MM-dd", new Date());
        const end = parse(data.endDate, "yyyy-MM-dd", new Date());

        // Ensure end date is not before start date
        return !isAfter(start, end);
      } catch (_) {
        return false;
      }
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

interface RecurringPatternFormProps {
  rinks: Array<{ id: string; name: string }>;
  onSubmitAction?: () => void;
}

export const RecurringPatternForm: React.FC<RecurringPatternFormProps> = ({
  rinks,
  onSubmitAction,
}) => {
  const utils = api.useUtils();

  // Initialize react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rinkId: "",
      startDate: "",
      endDate: "",
      startTime: "09:00",
      duration: 60,
      maxStudents: 1,
      daysOfWeek: [],
    },
  });

  // Create recurring pattern mutation
  const createRecurringPattern = api.admin.schedule.createRecurringPattern.useMutation({
    onSuccess: (data) => {
      toast.success("Recurring pattern created successfully", {
        description: `Created ${data.slotsCreated} time slots`,
      });
      utils.admin.schedule.getTimeSlots.invalidate();
      if (onSubmitAction) {
        onSubmitAction();
      }
    },
    onError: (error) => {
      toast.error("Failed to create recurring pattern", {
        description: error.message,
      });
    },
  });

  // Suggest end date for convenience but don't enforce any limit
  const startDate = form.watch("startDate");
  useEffect(() => {
    if (startDate && !form.getValues("endDate")) {
      try {
        const start = parse(startDate, "yyyy-MM-dd", new Date());
        // Suggest 4 weeks forward as a reasonable default
        const suggestedEndDate = addDays(start, 28);
        // Format the date back to yyyy-MM-dd string
        const endDateString = suggestedEndDate.toISOString().split("T")[0];
        form.setValue("endDate", endDateString);
      } catch (_) {
        // Ignore parse errors
      }
    }
  }, [startDate, form]);

  const onSubmit = (data: FormValues) => {
    // Parse dates properly
    const startDate = parse(data.startDate, "yyyy-MM-dd", new Date());
    const endDate = parse(data.endDate, "yyyy-MM-dd", new Date());

    // Ensure dates are set to beginning/end of day to avoid timezone issues
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const formattedStartTime = data.startTime.split(":").slice(0, 2).join(":");

    // Count how many days and slots will be created for user feedback
    const dayDifference = differenceInDays(endDate, startDate) + 1;
    const daysCount = data.daysOfWeek.length;
    const estimatedSlots = Math.ceil((dayDifference / 7) * daysCount);

    toast.info("Creating recurring pattern", {
      description: `Creating approximately ${estimatedSlots} time slots across ${dayDifference} days`,
    });

    // Submit to API
    createRecurringPattern.mutate({
      rinkId: data.rinkId,
      daysOfWeek: data.daysOfWeek,
      startDate: startDate,
      endDate: endDate,
      startTime: formattedStartTime,
      duration: data.duration,
      maxStudents: data.maxStudents,
      isActive: true,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Recurring Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <SelectContent>
                      {rinks.map((rink) => (
                        <SelectItem key={rink.id} value={rink.id}>
                          {rink.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      Create a schedule spanning your selected date range
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormDescription>Time will be the same for all selected days</FormDescription>
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
                        min={30}
                        step={15}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="maxStudents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Students per Slot</FormLabel>
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

            <FormField
              control={form.control}
              name="daysOfWeek"
              render={() => (
                <FormItem>
                  <FormLabel>Days of Week</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    {daysOfWeek.map((day) => (
                      <FormField
                        key={`day-${day.id}`}
                        control={form.control}
                        name="daysOfWeek"
                        render={({ field }) => {
                          return (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`day-${day.id}`}
                                checked={field.value?.includes(day.id)}
                                onCheckedChange={(checked) => {
                                  const updatedValue = checked
                                    ? [...field.value, day.id]
                                    : field.value.filter((value: number) => value !== day.id);
                                  field.onChange(updatedValue);
                                }}
                              />
                              <label htmlFor={`day-${day.id}`}>{day.label}</label>
                            </div>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={onSubmitAction}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRecurringPattern.isPending}>
                {createRecurringPattern.isPending ? "Creating..." : "Create Recurring Pattern"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
