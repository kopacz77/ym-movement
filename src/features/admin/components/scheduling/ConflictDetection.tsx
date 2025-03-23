// src/features/admin/components/scheduling/ConflictDetection.tsx
import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock } from "lucide-react";

interface Conflict {
  type: "OVERLAP" | "CAPACITY" | "INSTRUCTOR";
  description: string;
  timeRange: string;
  affectedBookings: number;
}

export const ConflictDetection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Conflicts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Changed from variant="warning" to variant="destructive" */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Time Slot Overlap Detected</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>This slot overlaps with existing bookings:</p>
              <div className="pl-4 border-l-2 border-yellow-500">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>3:00 PM - 4:00 PM (2 existing bookings)</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};
