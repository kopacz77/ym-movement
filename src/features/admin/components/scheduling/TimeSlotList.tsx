import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  maxStudents: number;
  bookedStudents: number;
  isRecurring: boolean;
}

export const TimeSlotList = () => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Time Slots</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {/* Sample time slot */}
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">3:00 PM - 4:00 PM</p>
                  <p className="text-sm text-gray-500">Main Rink</p>
                </div>
                {/* Fixed: Changed variant="success" to variant="default" with custom className */}
                <Badge 
                  variant={true ? "default" : "destructive"}
                  className={true ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
                >
                  {2}/4 Students
                </Badge>
              </div>
              <div className="flex gap-2">
                {/* Add actions */}
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};