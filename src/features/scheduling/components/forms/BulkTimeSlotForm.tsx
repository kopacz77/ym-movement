// src/features/admin/components/scheduling/BulkTimeSlotForm.tsx
"use client";

import { Button } from "@/components/ui/button";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { differenceInDays, isAfter, parse } from "date-fns";
import { Plus, X } from "lucide-react";
import { FC } from "react"; // Change to type import
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useBulkOperations } from "@/contexts/BulkOperationsContext";

// Create a custom validator for start and end dates
const dateRangeValidator = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) {
    return true; // Let the required validation handle empty values
  }

  try {
    const start = parse(startDate, "yyyy-MM-dd", new Date());
    const end = parse(endDate, "yyyy-MM-dd", new Date());

    // Ensure end date is not before start date
    if (isAfter(start, end)) {
      return false;
    }

    // Check if date range exceeds 30 days
    const dayDifference = differenceInDays(end, start);
    return dayDifference <= 30;
  } catch (_error) {
    return false;
  }
};

// Define a break schema
const breakSchema = z.object({
  startTime: z.string().min(1, "Required"),
  duration: z.coerce.number().min(1, "Required (mins)"),
});

// Updated bulk time slot schema with breaks array
const bulkTimeSlotSchema = z
  .object({
    rinkId: z.string().min(1, "Please select a rink"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    dailyStartTime: z.string().min(1, "Daily start time is required"),
    dailyEndTime: z.string().min(1, "Daily end time is required"),
    slotDuration: z.coerce.number().min(15, "Minimum duration is 15 minutes"),
    breaks: z.array(breakSchema).max(3, "Up to 3 breaks allowed"),
    maxStudents: z.coerce.number().min(1, "At least 1 student required"),
    daysOfWeek: z.array(z.number()).min(1, "Select at least one day"),
  })
  .refine((data) => dateRangeValidator(data.startDate, data.endDate), {
    path: ["endDate"], // Show the error on the end date field
  });

type BulkTimeSlotFormValues = z.infer<typeof bulkTimeSlotSchema>;

interface BulkTimeSlotFormProps {
  rinks: Array<{ id: string; name: string }>;
  onSubmitAction: () => void;
}

export const BulkTimeSlotForm: FC<BulkTimeSlotFormProps> = ({ rinks, onSubmitAction }) => {
  const utils = api.useUtils();
  const { setLastBulkCreation } = useBulkOperations();

  // Use the schedule namespace for bulk time slot creation.
  const createBulkSlots = api.admin.schedule.createBulkTimeSlots.useMutation({
    onSuccess: (data) => {
      toast("Success", {
        description: `${data.count} time slots created successfully`,
      });

      if (data.success && data.createdSlotIds?.length > 0) {
        setLastBulkCreation({
          timestamp: Date.now(),
          count: data.created || data.count,
          slotIds: data.createdSlotIds,
          operation: "create"
        });
      }
      // Invalidate the getTimeSlots query.
      utils.admin.schedule.getTimeSlots.invalidate();
      onSubmitAction();
    },
    onError: (error) => {
      // Remove the explicit type and let TypeScript infer it
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const form = useForm<BulkTimeSlotFormValues>({
    resolver: zodResolver(bulkTimeSlotSchema),
    defaultValues: {
      rinkId: "",
      startDate: "",
      endDate: "",
      dailyStartTime: "",
      dailyEndTime: "",
      slotDuration: 60,
      breaks: [{ startTime: "", duration: 0 }],
      maxStudents: 1,
      daysOfWeek: [],
    },
  });

  // Get the breaks array value
  const breaks = form.watch("breaks") || [];

  // Helper to add a new break
  const addBreak = () => {
    const currentBreaks = form.getValues("breaks") || [];
    if (currentBreaks.length < 3) {
      form.setValue("breaks", [...currentBreaks, { startTime: "", duration: 0 }]);
    }
  };

  // Helper to remove a break
  const removeBreak = (index: number) => {
    const currentBreaks = form.getValues("breaks") || [];
    form.setValue(
      "breaks",
      currentBreaks.filter((_, i) => i !== index),
    );
  };

  const handleSubmit = (values: BulkTimeSlotFormValues) => {
    // Show a summary of what will be created
    const selectedDays = values.daysOfWeek.length;
    const dateRangeInDays =
      differenceInDays(
        parse(values.endDate, "yyyy-MM-dd", new Date()),
        parse(values.startDate, "yyyy-MM-dd", new Date()),
      ) + 1;

    const estimatedSlots = Math.ceil(dateRangeInDays / 7) * selectedDays;

    toast.info("Creating slots", {
      description: `Creating ~${estimatedSlots} slots from ${values.dailyStartTime} to ${values.dailyEndTime} - EXACT times shown, no timezone conversion`,
    });

    createBulkSlots.mutate(values);
  };

  // Get the state of the mutation
  const isPending = createBulkSlots.isPending;

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
                <SelectContent>
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
                <FormLabel>
                  End Date <span className="text-sm text-muted-foreground" />
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dailyStartTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Daily Start Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormDescription>Exact time as shown - no timezone conversion</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dailyEndTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Daily End Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormDescription>Exact time as shown - no timezone conversion</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="slotDuration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slot Duration (minutes)</FormLabel>
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

        {/* Multiple Breaks Section */}
        <div className="space-y-3 border rounded-md p-4">
          <div className="flex justify-between items-center">
            <FormLabel className="text-base">Breaks (Optional)</FormLabel>
            {breaks.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBreak}
                disabled={breaks.length >= 3}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Break
              </Button>
            )}
          </div>

          {breaks.map((breakItem, index) => (
            <div
              key={`break-${index}-${breakItem.startTime || ""}-${breakItem.duration}`}
              className="grid grid-cols-[1fr,1fr,auto] gap-3 items-end"
            >
              <FormField
                control={form.control}
                name={`breaks.${index}.startTime`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Break {index + 1} Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`breaks.${index}.duration`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step={5}
                        {...field}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          field.onChange(Number.isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {breaks.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBreak(index)}
                  className="mb-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
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
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 0, label: "Sun" },
                  { value: 1, label: "Mon" },
                  { value: 2, label: "Tue" },
                  { value: 3, label: "Wed" },
                  { value: 4, label: "Thu" },
                  { value: 5, label: "Fri" },
                  { value: 6, label: "Sat" },
                ].map((day) => (
                  <FormField
                    key={day.value}
                    control={form.control}
                    name="daysOfWeek"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(day.value)}
                            onCheckedChange={(checked) => {
                              const currentValue = field.value || [];
                              const newValue = checked
                                ? [...currentValue, day.value]
                                : currentValue.filter((d) => d !== day.value);
                              field.onChange(newValue);
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">{day.label}</FormLabel>
                      </FormItem>
                    )}
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
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Slots"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
