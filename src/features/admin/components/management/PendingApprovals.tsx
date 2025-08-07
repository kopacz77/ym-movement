// src/features/admin/components/management/PendingApprovals.tsx
"use client";

import React, { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/date";

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
  const utils = api.useUtils();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Use the student namespace for pending approvals
  const { data, isLoading, error } = api.admin.student.getPendingApprovals.useQuery();
  const pendingStudents = data?.students || [];

  // NUCLEAR APPROVE - FORCE RELOAD EVERYTHING!
  const approveStudent = api.admin.student.approveStudent.useMutation({
    onSuccess: () => {
      console.log("🚨 NUCLEAR APPROVE: FORCING COMPLETE REFRESH!");
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

  // BULLETPROOF reject student mutation (for comparison)
  const rejectStudent = api.admin.student.rejectStudent.useMutation({
    onMutate: async ({ studentId }) => {
      console.log("🔄 REJECTING STUDENT:", studentId);

      // AGGRESSIVE: Cancel ALL queries
      await queryClient.cancelQueries();

      // BRUTE FORCE: Update ALL queries that contain students data
      const cache = queryClient.getQueryCache();
      const allQueries = cache.getAll();

      allQueries.forEach((query) => {
        const data = query.state.data as any;
        if (data?.students && Array.isArray(data.students)) {
          // Remove from ALL student lists (pending and main)
          const filtered = data.students.filter((student: any) => student.id !== studentId);
          queryClient.setQueryData(query.queryKey, {
            ...data,
            students: filtered,
          });
          console.log(
            `✂️ REJECT: Removed from ${query.queryKey.join(".")} - ${data.students.length} -> ${filtered.length}`,
          );
        }
      });

      return { studentId };
    },
    onSuccess: () => {
      console.log("✅ REJECT: Success, forcing cache refresh");
      toast.success("Application rejected");
      queryClient.invalidateQueries({ queryKey: ["admin", "student"] });
    },
    onError: (err) => {
      console.log("❌ REJECT: Failed, showing error");
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
      <Card className="bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/80 border-2 border-slate-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-slate-100/50 to-blue-50/50 rounded-t-lg border-b border-slate-200/50">
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
      <Card className="bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/80 border-2 border-slate-200 shadow-md">
        <CardHeader className="pb-4 bg-gradient-to-r from-slate-100/50 to-blue-50/50 rounded-t-lg border-b border-slate-200/50">
          <CardTitle className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Badge className="bg-green-500 text-white">✓</Badge>
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
    <Card className="bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/80 border-2 border-slate-200 shadow-md">
      <CardHeader className="pb-4 bg-gradient-to-r from-slate-100/50 to-blue-50/50 rounded-t-lg border-b border-slate-200/50">
        <CardTitle className="flex items-center space-x-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Badge className="bg-orange-500 text-white">{pendingStudents.length}</Badge>
          </div>
          <span>Pending Approvals</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingStudents.map((student: Student) => (
            <div
              key={student.id}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl hover:shadow-md transition-all duration-200"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {(student.user?.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{student.user?.name || "Unnamed"}</p>
                    <p className="text-sm text-gray-600">{student.user?.email || "No email"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-12">
                  <Badge variant="secondary" className="text-xs bg-orange-200 text-orange-800">
                    New Registration
                  </Badge>
                  <p className="text-xs text-gray-500">{formatDate(new Date(student.createdAt))}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(student.id, student.user?.name || "Student")}
                  disabled={approveStudent.isPending || rejectStudent.isPending}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg"
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
