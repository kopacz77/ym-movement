// src/features/admin/components/management/PendingApprovals.tsx
"use client";

import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/date-utils";

// Define the Student type
interface Student {
  id: string;
  createdAt: string | Date;
  user?: {
    name?: string;
    email?: string;
  };
}

export const PendingApprovals = () => {
  // Always call all hooks at the top level
  const _utils = api.useUtils();
  const queryClient = useQueryClient();
  const [isRefreshing, _setIsRefreshing] = React.useState(false);

  // Use the student namespace for pending approvals
  const { data, isLoading, error } = api.admin.student.getPendingApprovals.useQuery();
  const pendingStudents = data?.students || [];

  const approveStudent = api.admin.student.approveStudent.useMutation({
    onSuccess: () => {
      toast.success("Student approved successfully");

      // NUCLEAR: Clear ALL cache and force refetch
      queryClient.clear();

      // Force immediate page reload as last resort
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (err) => {
      toast.error("Failed to approve student", {
        description: err.message,
      });
    },
  });

  const rejectStudent = api.admin.student.rejectStudent.useMutation({
    onMutate: async ({ studentId }) => {
      await queryClient.cancelQueries();

      const cache = queryClient.getQueryCache();
      const allQueries = cache.getAll();

      allQueries.forEach((query) => {
        const data = query.state.data as any;
        if (data?.students && Array.isArray(data.students)) {
          const filtered = data.students.filter((student: any) => student.id !== studentId);
          queryClient.setQueryData(query.queryKey, {
            ...data,
            students: filtered,
          });
        }
      });

      return { studentId };
    },
    onSuccess: () => {
      toast.success("Application rejected");
      queryClient.invalidateQueries({ queryKey: ["admin", "student"] });
    },
    onError: (err) => {
      toast.error("Failed to reject application", {
        description: err.message,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "student"] });
    },
  });

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast.error("Error loading pending approvals", {
        description: error.message,
      });
    }
  }, [error]);

  const handleApprove = (studentId: string, studentName: string) => {
    toast("Processing", {
      description: `Approving student ${studentName}...`,
    });
    approveStudent.mutate({ studentId });
  };

  const handleReject = (studentId: string, studentName: string) => {
    toast("Processing", {
      description: `Rejecting student ${studentName}...`,
    });
    rejectStudent.mutate({ studentId });
  };

  // Loading state
  if (isLoading || isRefreshing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!pendingStudents || pendingStudents.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Badge className="bg-emerald-500 text-white">✓</Badge>
            </div>
            <span>Pending Approvals</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-4 bg-green-50 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-1">All caught up!</p>
            <p className="text-sm text-muted-foreground">No pending approvals at the moment.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Normal state with data
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Badge className="bg-amber-500 text-white">{pendingStudents.length}</Badge>
          </div>
          <span>Pending Approvals</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingStudents.map((student: Student) => (
            <div
              key={student.id}
              className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {(student.user?.name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">
                    {student.user?.name || "Unnamed"}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {student.user?.email || "No email"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 ml-12">
                <Badge
                  variant="secondary"
                  className="text-xs bg-orange-200 text-orange-800 shrink-0"
                >
                  New Registration
                </Badge>
                <p className="text-xs text-gray-500 truncate">
                  {formatDate(new Date(student.createdAt))}
                </p>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={() => handleApprove(student.id, student.user?.name || "Student")}
                  disabled={approveStudent.isPending || rejectStudent.isPending}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg flex-1"
                  size="sm"
                >
                  {approveStudent.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Approve</span>
                    </div>
                  )}
                </Button>
                <Button
                  onClick={() => handleReject(student.id, student.user?.name || "Student")}
                  disabled={approveStudent.isPending || rejectStudent.isPending}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                >
                  {rejectStudent.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    "Reject"
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
