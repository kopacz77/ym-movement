import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  maxStudents: number;
  bookedStudents: number;
  isRecurring: boolean;
}

interface TimeSlotListProps {
  timeSlots?: TimeSlot[];
}

export const TimeSlotList: React.FC<TimeSlotListProps> = ({ timeSlots = [] }) => {
  // Sample time slot for demonstration
  const sampleTimeSlots: TimeSlot[] =
    timeSlots.length > 0
      ? timeSlots
      : [
          {
            id: "1",
            startTime: new Date(2025, 2, 22, 15, 0), // 3:00 PM
            endTime: new Date(2025, 2, 22, 16, 0), // 4:00 PM
            maxStudents: 4,
            bookedStudents: 2,
            isRecurring: true,
          },
        ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Time Slots</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {sampleTimeSlots.map((slot) => {
              const hasAvailability = slot.bookedStudents < slot.maxStudents;
              return (
                <div key={slot.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">
                        {slot.startTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -
                        {slot.endTime.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm text-gray-500">Main Rink</p>
                    </div>
                    <Badge
                      variant={hasAvailability ? "default" : "destructive"}
                      className={
                        hasAvailability ? "bg-green-100 text-green-800 hover:bg-green-200" : ""
                      }
                    >
                      {slot.bookedStudents}/{slot.maxStudents} Students
                    </Badge>
                  </div>
                  <div className="flex gap-2">{/* Add actions */}</div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
