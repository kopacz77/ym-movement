import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const daysOfWeek = [
  { id: 0, label: 'Sunday' },
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
];

export const RecurringPatternForm = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Recurring Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <Form>
          <div className="space-y-6">
            <FormField
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
            <FormField
              name="daysOfWeek"
              render={() => (
                <FormItem>
                  <FormLabel>Days of Week</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    {daysOfWeek.map((day) => (
                      <div key={day.id} className="flex items-center space-x-2">
                        <Checkbox id={`day-${day.id}`} />
                        <label htmlFor={`day-${day.id}`}>{day.label}</label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Create Recurring Pattern</Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
};
