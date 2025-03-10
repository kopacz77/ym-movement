// src/features/admin/components/management/PendingApprovals.tsx
"use client";

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from "sonner";
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date';

export const PendingApprovals = () => {
  // Always call all hooks at the top level
  const utils = api.useUtils();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Use the student namespace for pending approvals
  const { data: pendingStudents, isLoading, error } = api.admin.student.getPendingApprovals.useQuery();

  // IMPORTANT: Always declare mutations at the top level, not conditionally
  const approveStudent = api.admin.student.approveStudent.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Student approved successfully"
      });
      // Invalidate the query to refresh the data
      utils.admin.student.getPendingApprovals.invalidate();
      setIsRefreshing(true);
      // Set a timer to turn off refreshing state
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    },
    onError: (err) => {
      toast.error("Error", {
        description: err.message
      });
    },
  });

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast.error("Error loading pending approvals", {
        description: error.message
      });
    }
  }, [error]);

  const handleApprove = (studentId: string, studentName: string) => {
    toast("Processing", {
      description: `Approving student ${studentName}...`
    });
    approveStudent.mutate({ studentId });
  };

  // Loading state
  if (isLoading || isRefreshing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!pendingStudents || pendingStudents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            No pending approvals
          </div>
        </CardContent>
      </Card>
    );
  }

  // Normal state with data
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingStudents.map((student) => (
            <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{student.user?.name || "Unnamed"}</p>
                  <Badge>New Registration</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{student.user?.email || "No email"}</p>
                <p className="text-sm text-muted-foreground">
                  Registered on {formatDate(new Date(student.createdAt))}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleApprove(student.id, student.user?.name || "Student")}
                  disabled={approveStudent.isPending}
                >
                  {approveStudent.isPending ? "Processing..." : "Approve"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};