import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, User } from "lucide-react";

export const ExistingBookings = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Sarah Smith</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>Monday, Feb 15</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>3:00 PM - 4:00 PM</span>
                  </div>
                </div>
                <Badge>Confirmed</Badge>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline">
                  Reschedule
                </Button>
                <Button size="sm" variant="destructive">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
