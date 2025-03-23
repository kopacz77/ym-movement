import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface Conflict {
  id: string; // Added id property for key usage
  type: "OVERLAP" | "CAPACITY" | "STUDENT_LIMIT" | "INSTRUCTOR_UNAVAILABLE";
  description: string;
  affectedBookings: Array<{ id: string; text: string }>; // Changed to object with id
  possibleResolutions: Resolution[];
}

interface Resolution {
  id: string;
  description: string;
  impact: string;
  action: () => void;
}

export const ConflictResolution = () => {
  const [conflicts, setConflicts] = React.useState<Conflict[]>([]);
  const [selectedResolution, setSelectedResolution] = React.useState<string | null>(null);

  const handleResolveConflict = async (resolution: Resolution) => {
    // Implement resolution logic
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Conflicts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <AlertTitle>{conflict.type.replace("_", " ")}</AlertTitle>
                <AlertDescription>{conflict.description}</AlertDescription>
              </Alert>
              <div className="pl-4 border-l-2 border-yellow-500 space-y-2">
                <p className="font-medium">Affected Bookings:</p>
                {conflict.affectedBookings.map((booking) => (
                  <div key={booking.id} className="text-sm">
                    {booking.text}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="font-medium">Possible Resolutions:</p>
                {conflict.possibleResolutions.map((resolution) => (
                  <button
                    key={resolution.id}
                    type="button"
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer w-full text-left"
                    onClick={() => setSelectedResolution(resolution.id)}
                    aria-pressed={selectedResolution === resolution.id}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{resolution.description}</p>
                        <p className="text-sm text-gray-500">{resolution.impact}</p>
                      </div>
                      <Badge variant={selectedResolution === resolution.id ? "default" : "outline"}>
                        {selectedResolution === resolution.id ? "Selected" : "Select"}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Ignore</Button>
                <Button
                  disabled={!selectedResolution}
                  onClick={() => {
                    const resolution = conflict.possibleResolutions.find(
                      (r) => r.id === selectedResolution,
                    );
                    if (resolution) {
                      handleResolveConflict(resolution);
                    }
                  }}
                >
                  Apply Resolution
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
