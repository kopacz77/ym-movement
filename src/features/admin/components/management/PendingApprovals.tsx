"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { StudentForm } from '@/features/admin/components/students/profile/StudentForm';
import { formatDate } from '@/lib/date';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';

export const PendingApprovals: React.FC = () => {
  const toast = useToast();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Use the student namespace for pending approvals.
  const { data: pendingStudents, isLoading, refetch, error } = 
    api.admin.student.getPendingApprovals.useQuery(undefined);

  // Handle errors in a useEffect (remove onError from query options)
  useEffect(() => {
    if (error) {
      // Explicitly type error as having a message string.
      const err = error as { message: string };
      toast.toast({
        title: "Error loading pending approvals",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

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

  // Mutation to approve student (assumed defined in your student router)
  const approveStudent = api.admin.student.approveStudent.useMutation({
    onSuccess: () => {
      toast.toast({
        title: "Success",
        description: "Student approved successfully",
      });
      refetch();
    },
    onError: (err: any) => {
      toast.toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingStudents.map((student: any) => (
            <div
              key={student.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {/* Assuming the student object has a nested user property */}
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
                  variant="outline"
                  onClick={() => {
                    setSelectedStudent(student);
                    setIsReviewOpen(true);
                  }}
                >
                  Review
                </Button>
                {/* If a rejectStudent procedure exists, uncomment the following:
                <Button variant="outline" onClick={() => rejectStudent.mutate({ studentId: student.id })}>
                  Reject
                </Button> */}
                <Button onClick={() => approveStudent.mutate({ studentId: student.id })}>
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Review Student Application</DialogTitle>
              <DialogDescription>
                Review and modify student details before approval.
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <StudentForm
                student={selectedStudent}
                onSubmit={() => {
                  setIsReviewOpen(false);
                  setSelectedStudent(null);
                  refetch();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};