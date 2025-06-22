import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React from "react";
import { ScheduleCalendarView } from "./ScheduleCalendarView";

export const ScheduleCalendar = () => {
  const [selectedRink, setSelectedRink] = React.useState("MAIN_RINK");

  const handleRinkChange = (value: string) => {
    setSelectedRink(value);
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Schedule Management</CardTitle>
        <div className="flex gap-2">
          <Select value={selectedRink} onValueChange={handleRinkChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Rink" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MAIN_RINK">Main Rink</SelectItem>
              <SelectItem value="PRACTICE_RINK">Practice Rink</SelectItem>
              <SelectItem value="DANCE_STUDIO">Dance Studio</SelectItem>
            </SelectContent>
          </Select>
          <Button>Create Time Slot</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[600px]">
          <ScheduleCalendarView />
        </div>
      </CardContent>
    </Card>
  );
};
