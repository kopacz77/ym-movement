"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";

const bulkTimeSlotSchema = z.object({
  rinkId: z.string().min(1, "Please select a rink"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  dailyStartTime: z.string().min(1, "Daily start time is required"),
  dailyEndTime: z.string().min(1, "Daily end time is required"),
  slotDuration: z.coerce.number().min(15, "Minimum duration is 15 minutes"),
  breakStartTime: z.string().optional(),
  breakDuration: z.coerce.number().optional(),
  maxStudents: z.coerce.number().min(1, "At least 1 student required"),
  daysOfWeek: z.array(z.number()).min(1, "Select at least one day"),
});

type BulkTimeSlotFormValues = z.infer<typeof bulkTimeSlotSchema>;

interface BulkTimeSlotFormProps {
  rinks: Array<{ id: string; name: string }>;
  onSubmitAction: () => void; // renamed per recommendation
}

export const BulkTimeSlotForm: React.FC<BulkTimeSlotFormProps> = ({
  rinks,
  onSubmitAction,
}) => {
  const utils = api.useUtils();
  
  // Use the schedule namespace for bulk time slot creation.
  const createBulkSlots = api.admin.schedule.createBulkTimeSlots.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Time slots created successfully"
      });
      // Invalidate the getTimeSlots query.
      utils.admin.schedule.getTimeSlots.invalidate();
      onSubmitAction();
    },
    onError: (error: any) => {
      toast.error("Error", {
        description: error.message
      });
    },
  });

  const form = useForm<BulkTimeSlotFormValues>({
    resolver: zodResolver(bulkTimeSlotSchema),
    defaultValues: {
      rinkId: '',
      startDate: '',
      endDate: '',
      dailyStartTime: '',
      dailyEndTime: '',
      slotDuration: 60,
      breakStartTime: '',
      breakDuration: 0,
      maxStudents: 1,
      daysOfWeek: [],
    },
  });

  const handleSubmit = (values: BulkTimeSlotFormValues) => {
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
                <FormLabel>End Date</FormLabel>
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="breakStartTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Break Start Time (Optional)</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="breakDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Break Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
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
                        <FormLabel className="text-sm font-normal">
                          {day.label}
                        </FormLabel>
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
          {/* Fix: Change isLoading to isPending */}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Slots"}
          </Button>
        </div>
      </form>
    </Form>
  );
};