import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const PendingApprovals = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* This will map over pending items */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">New Student Registration</p>
              <p className="text-sm text-gray-500">Sarah Smith</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Reject</Button>
              <Button size="sm">Approve</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
