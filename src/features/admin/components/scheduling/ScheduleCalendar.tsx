import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const ScheduleCalendar = () => {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Schedule Management</CardTitle>
        <div className="flex gap-2">
          <Select defaultValue="MAIN_RINK">
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
        <div className="flex h-[600px]">
          <Calendar />
        </div>
      </CardContent>
    </Card>
  );
};
