// src/features/admin/components/scheduling/BulkTimeSlotForm.tsx
"use client";

import { BulkCreateConfirmation, type BulkCreateConfirmationData } from "@/components/bulk-create-confirmation";
import { BulkCreateTemplates, type ScheduleTemplate } from "@/components/bulk-create-templates";
import { CalendarPreview } from "@/components/calendar-preview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { Separator } from "@/components/ui/separator";
import { useBulkOperations } from "@/contexts/BulkOperationsContext";
import { useBulkCreateValidation } from "@/hooks/useBulkCreateValidation";
import { api } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { differenceInDays, isAfter, parse } from "date-fns";
import { AlertTriangle, ChevronDown, Plus, Settings, X } from "lucide-react";
import { FC, useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<BulkCreateConfirmationData | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

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
          operation: "create",
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

  // Real-time validation - watch specific fields to prevent infinite re-renders
  const watchedFields = form.watch(['rinkId', 'startDate', 'endDate', 'daysOfWeek', 'startTime', 'endTime', 'duration']);
  const formValues = useMemo(() => ({
    rinkId: watchedFields[0],
    startDate: watchedFields[1],
    endDate: watchedFields[2],
    daysOfWeek: watchedFields[3],
    startTime: watchedFields[4],
    endTime: watchedFields[5],
    duration: watchedFields[6]
  }), [watchedFields]);
  
  const validation = useBulkCreateValidation(formValues);
  const selectedRink = rinks.find(r => r.id === formValues.rinkId);

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
    // Prepare confirmation data
    const confirmData: BulkCreateConfirmationData = {
      rinkName: selectedRink?.name || "Unknown Rink",
      startDate: values.startDate,
      endDate: values.endDate,
      dailyStartTime: values.dailyStartTime,
      dailyEndTime: values.dailyEndTime,
      slotDuration: values.slotDuration,
      breaks: values.breaks,
      maxStudents: values.maxStudents,
      daysOfWeek: values.daysOfWeek,
      estimatedSlots: validation.estimatedSlots,
      conflicts: validation.conflicts,
      warnings: validation.warnings,
    };

    setConfirmationData(confirmData);
    setShowConfirmation(true);
  };

  const handleConfirmedSubmit = () => {
    if (!confirmationData) return;
    
    const values = {
      rinkId: formValues.rinkId,
      startDate: confirmationData.startDate,
      endDate: confirmationData.endDate,
      dailyStartTime: confirmationData.dailyStartTime,
      dailyEndTime: confirmationData.dailyEndTime,
      slotDuration: confirmationData.slotDuration,
      breaks: confirmationData.breaks,
      maxStudents: confirmationData.maxStudents,
      daysOfWeek: confirmationData.daysOfWeek,
    };

    toast.info("Creating slots", {
      description: `Creating ${confirmationData.estimatedSlots} slots from ${confirmationData.dailyStartTime} to ${confirmationData.dailyEndTime}`,
    });

    createBulkSlots.mutate(values);
    setShowConfirmation(false);
  };

  const handleTemplateSelect = (template: ScheduleTemplate) => {
    // Apply template values to form
    form.setValue("dailyStartTime", template.preset.dailyStartTime);
    form.setValue("dailyEndTime", template.preset.dailyEndTime);
    form.setValue("slotDuration", template.preset.slotDuration);
    form.setValue("daysOfWeek", template.preset.daysOfWeek);
    form.setValue("maxStudents", template.preset.maxStudents);
    form.setValue("breaks", template.preset.breaks);
    
    // Apply dates if available
    if ((template as any).preset.startDate) {
      form.setValue("startDate", (template as any).preset.startDate);
    }
    if ((template as any).preset.endDate) {
      form.setValue("endDate", (template as any).preset.endDate);
    }

    toast.success("Template Applied", {
      description: `"${template.name}" settings have been applied to the form.`,
    });
  };

  // Get the state of the mutation
  const isPending = createBulkSlots.isPending;

  // Rinks are now loading successfully

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pb-4">
          {/* Quick Templates */}
          <div className="flex justify-end">
            <BulkCreateTemplates onSelectTemplate={handleTemplateSelect} />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Debug: Show rinks data (development only) */}
            {process.env.NODE_ENV === 'development' && isClient && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                Debug: {rinks?.length || 0} rinks available: {rinks?.map(r => r.name).join(', ') || 'None'}
              </div>
            )}
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
                      {rinks.length === 0 ? (
                        <SelectItem value="no-rinks" disabled>
                          No rinks available - Please add a rink first
                        </SelectItem>
                      ) : (
                        rinks.map((rink) => (
                          <SelectItem key={rink.id} value={rink.id} className="w-full">
                            {rink.name}
                          </SelectItem>
                        ))
                      )}
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

            {/* Calendar Preview */}
            {process.env.NODE_ENV === 'development' && isClient && (
              <div className="text-xs text-muted-foreground bg-yellow-50 p-2 rounded">
                Preview Debug: startDate={formValues.startDate || 'empty'}, endDate={formValues.endDate || 'empty'}, daysOfWeek=[{formValues.daysOfWeek?.join(',') || 'none'}] ({formValues.daysOfWeek?.length || 0} selected)
              </div>
            )}
            {formValues.startDate && formValues.endDate && formValues.daysOfWeek && formValues.daysOfWeek.length > 0 ? (
              <div className="border rounded-lg p-4 bg-muted/20">
                <h3 className="font-medium mb-3">Preview</h3>
                <CalendarPreview
                  startDate={formValues.startDate}
                  endDate={formValues.endDate}
                  selectedDays={formValues.daysOfWeek}
                  startTime={formValues.dailyStartTime}
                  endTime={formValues.dailyEndTime}
                  slotDuration={formValues.slotDuration}
                  breaks={formValues.breaks}
                />
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-muted/10 text-center text-muted-foreground">
                <h3 className="font-medium mb-2">Calendar Preview</h3>
                <p className="text-sm">Fill in dates and select days of the week to see preview</p>
              </div>
            )}

            {/* Advanced Options */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Advanced Options</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
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
                                min={5}
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
              </CollapsibleContent>
            </Collapsible>

            {/* Real-time validation feedback */}
            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {validation.errors[0]} {validation.errors.length > 1 && `(+${validation.errors.length - 1} more required)`}
                </AlertDescription>
              </Alert>
            )}
            
            {validation.warnings.length > 0 && validation.errors.length === 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {validation.warnings[0]} {validation.warnings.length > 1 && `(+${validation.warnings.length - 1} more)`}
                </AlertDescription>
              </Alert>
            )}
            
            {validation.estimatedSlots > 0 && (
              <div className="text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">
                <strong>Estimated:</strong> {validation.estimatedSlots} time slots will be created
                {validation.conflicts && validation.conflicts.length > 0 && (
                  <span className="text-destructive ml-2">({validation.conflicts.length} conflicts detected)</span>
                )}
              </div>
            )}

            <Separator />
            
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={onSubmitAction}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending || !validation.isValid}
                className="min-w-[120px]"
                onClick={(e) => {
                  if (!validation.isValid) {
                    e.preventDefault();
                    // Show first validation error as toast
                    if (validation.errors.length > 0) {
                      toast.error("Form Validation Error", {
                        description: validation.errors[0],
                      });
                    }
                  }
                }}
              >
                {isPending ? "Creating..." : validation.estimatedSlots > 0 ? `Preview ${validation.estimatedSlots} Slots` : "Create Slots"}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* Enhanced Confirmation Dialog */}
      {confirmationData && (
        <BulkCreateConfirmation
          isOpen={showConfirmation}
          onOpenChange={setShowConfirmation}
          data={confirmationData}
          onConfirm={handleConfirmedSubmit}
          isLoading={isPending}
        />
      )}
    </>
  );
};