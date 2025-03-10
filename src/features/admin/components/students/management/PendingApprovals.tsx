// src/features/admin/components/students/management/PendingApprovals.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from "sonner";
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StudentForm } from '@/features/admin/components/students/profile/StudentForm';

export const PendingApprovals = () => {
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const utils = api.useUtils(); // Get tRPC utils for invalidation
  
  // Use the student namespace for pending approvals
  const { data: pendingStudents, isLoading, error } = api.admin.student.getPendingApprovals.useQuery(
    undefined,
  );
  
  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast.error("Error loading pending approvals", {
        description: error.message
      });
    }
  }, [error]);

  // Approval mutation
  const approveStudent = api.admin.student.approveStudent.useMutation({
    onSuccess: (data) => {
      toast("Success", {
        description: `Student ${data?.user?.name || 'unknown'} approved successfully`
      });
      // Invalidate the query to refresh the data
      utils.admin.student.getPendingApprovals.invalidate();
    },
    onError: (err) => {
      toast.error("Error", {
        description: err.message
      });
    },
  });

  const handleReview = (student: any) => {
    setSelectedStudent(student);
    setIsReviewDialogOpen(true);
  };

  const handleApprove = (studentId: string, studentName: string) => {
    toast("Processing", {
      description: `Approving student ${studentName}...`
    });
    
    approveStudent.mutate(
      { studentId },
      {
        onSuccess: () => {
          toast("Success", {
            description: `Student ${studentName} approved successfully`
          });
          
          // Force a refresh
          utils.admin.student.getPendingApprovals.invalidate();
        }
      }
    );
  };

  if (isLoading) {
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

  return (
    <>
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
                  <Button variant="outline" onClick={() => handleReview(student)}>
                    Review
                  </Button>
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

      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Review Student</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <StudentForm 
              student={selectedStudent}
              onSubmitAction={() => {
                setIsReviewDialogOpen(false);
                // Invalidate the query to refresh the data
                utils.admin.student.getPendingApprovals.invalidate();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};