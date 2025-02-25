import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface Conflict {
  type: 'OVERLAP' | 'CAPACITY' | 'STUDENT_LIMIT' | 'INSTRUCTOR_UNAVAILABLE';
  description: string;
  affectedBookings: string[];
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
          {conflicts.map((conflict, index) => (
            <div key={index} className="space-y-4">
              {/* Changed from variant="warning" to variant="destructive" */}
              <Alert variant="destructive">
                {/* Added AlertTriangle icon to maintain warning appearance */}
                <AlertTriangle className="h-4 w-4 mr-2" />
                <AlertTitle>
                  {conflict.type.replace('_', ' ')}
                </AlertTitle>
                <AlertDescription>
                  {conflict.description}
                </AlertDescription>
              </Alert>
              <div className="pl-4 border-l-2 border-yellow-500 space-y-2">
                <p className="font-medium">Affected Bookings:</p>
                {conflict.affectedBookings.map((booking, idx) => (
                  <div key={idx} className="text-sm">
                    {booking}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="font-medium">Possible Resolutions:</p>
                {conflict.possibleResolutions.map((resolution) => (
                  <div
                    key={resolution.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedResolution(resolution.id)}
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
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Ignore</Button>
                <Button
                  disabled={!selectedResolution}
                  onClick={() => {
                    const resolution = conflict.possibleResolutions.find(
                      r => r.id === selectedResolution
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