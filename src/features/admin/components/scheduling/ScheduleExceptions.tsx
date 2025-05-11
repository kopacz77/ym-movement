import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React from "react";

export const ScheduleExceptions = () => {
  // Add state for the selected date
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Exceptions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <Label>Exception Date</Label>
            {/* Corrected to use proper Calendar props */}
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Exception Type</Label>
            <select className="w-full mt-1">
              <option>Cancel Session</option>
              <option>Change Time</option>
              <option>Change Location</option>
            </select>
          </div>
          <div>
            <Label>Reason</Label>
            <Input type="text" placeholder="Enter reason for exception" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>Add Exception</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
