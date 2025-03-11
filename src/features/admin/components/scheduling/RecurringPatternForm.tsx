// src/features/admin/components/scheduling/RecurringPatternForm.tsx
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Form, 
  FormControl, 
  FormDescription,
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, differenceInDays, isAfter, parse } from 'date-fns';
import { toast } from 'sonner';

const daysOfWeek = [
  { id: 0, label: 'Sunday' },
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
];

// Define form schema with validation for 30-day limit
const formSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  daysOfWeek: z.array(z.number()).min(1, "Select at least one day")
}).refine((data) => {
  if (!data.startDate || !data.endDate) return true; // Let the required validation handle empty values
  
  try {
    const start = parse(data.startDate, 'yyyy-MM-dd', new Date());
    const end = parse(data.endDate, 'yyyy-MM-dd', new Date());
    
    // Ensure end date is not before start date
    if (isAfter(start, end)) {
      return false;
    }
    
    // Check if date range exceeds 30 days
    const dayDifference = differenceInDays(end, start);
    return dayDifference <= 30;
  } catch (error) {
    return false;
  }
}, {
  message: "Date range cannot exceed 30 days",
  path: ["endDate"],
});

type FormValues = z.infer<typeof formSchema>;

export const RecurringPatternForm = () => {
  // Initialize react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: '',
      endDate: '',
      daysOfWeek: []
    }
  });

  // Auto-update end date when start date changes
  const startDate = form.watch('startDate');
  useEffect(() => {
    if (startDate) {
      try {
        const start = parse(startDate, 'yyyy-MM-dd', new Date());
        const suggestedEndDate = addDays(start, 30);
        // Format the date back to yyyy-MM-dd string
        const endDateString = suggestedEndDate.toISOString().split('T')[0];
        
        // Only set the end date if it's empty or the current range exceeds 30 days
        const currentEndDate = form.getValues('endDate');
        if (!currentEndDate) {
          form.setValue('endDate', endDateString);
        } else {
          try {
            const end = parse(currentEndDate, 'yyyy-MM-dd', new Date());
            const dayDifference = differenceInDays(end, start);
            if (dayDifference > 30) {
              form.setValue('endDate', endDateString);
            }
          } catch (error) {
            // Ignore parse errors
          }
        }
      } catch (error) {
        // Ignore parse errors
      }
    }
  }, [startDate, form]);

  const onSubmit = (data: FormValues) => {
    console.log('Form submitted:', data);
    // Handle submission logic here
    toast.success("Recurring pattern created successfully");
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
                  <FormLabel>End Date <span className="text-sm text-muted-foreground">(Max 30 days)</span></FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    Date range cannot exceed 30 days
                  </FormDescription>
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
                        key={day.id}
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
            
            <Button type="submit">Create Recurring Pattern</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};