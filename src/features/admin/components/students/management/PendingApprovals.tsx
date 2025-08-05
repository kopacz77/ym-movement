// src/features/admin/components/students/management/PendingApprovals.tsx
"use client";
import { useQueryClient } from "@tanstack/react-query";
import type { TRPCClientErrorLike } from "@trpc/client";
import { format } from "date-fns";
import { AlertCircle, Check, Clock } from "lucide-react";
import type React from "react";
import { toast } from "sonner";
import { showDeleteConfirmation } from "@/lib/toast-confirmations";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { AppRouter } from "@/lib/root";

// Define proper types
type StudentStatus = "PENDING" | "APPROVED" | "REJECTED";

interface User {
  name: string | null;
  email: string;
}

interface StudentData {
  id: string;
  user: User;
  status: StudentStatus;
  createdAt: string | Date;
}

export const PendingApprovals: React.FC = () => {
  const queryClient = useQueryClient();
  const pendingApprovalKey = ["admin", "student", "getPendingApprovals"];

  // Fetch pending approvals from API
  const { data: pendingStudents, isLoading } = api.admin.student.getPendingApprovals.useQuery();

  // Define mutation for approving students
  const approveStudentMutation = api.admin.student.approveStudent.useMutation({
    onSuccess: () => {
      toast.success("Student approved successfully");
      // Invalidate query to refetch data
      queryClient.invalidateQueries({ queryKey: pendingApprovalKey });
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error("Failed to approve student", {
        description: error.message,
      });
    },
  });

  // Define mutation for rejecting students - FIXED to use rejectStudent instead of approveStudent
  const rejectStudentMutation = api.admin.student.rejectStudent.useMutation({
    onSuccess: () => {
      toast.success("Application rejected");
      // Invalidate query to refetch data
      queryClient.invalidateQueries({ queryKey: pendingApprovalKey });
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error("Failed to reject application", {
        description: error.message,
      });
    },
  });

  // Handlers
  const handleApprove = (studentId: string) => {
    approveStudentMutation.mutate({ studentId });
  };

  const handleReject = (studentId: string) => {
    showDeleteConfirmation("student application", () => {
      rejectStudentMutation.mutate({ studentId });
    });
  };

  // Format date for display
  const formatDate = (dateString: string | Date) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  // Status badge component
  const getStatusBadge = (status: StudentStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <div className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
            <Clock className="h-3.5 w-3.5" />
            <span>Pending</span>
          </div>
        );
      case "APPROVED":
        return (
          <div className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
            <Check className="h-3.5 w-3.5" />
            <span>Approved</span>
          </div>
        );
      case "REJECTED":
        return (
          <div className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Rejected</span>
          </div>
        );
      default:
        return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="text-center p-4">
        <p>Loading pending registrations...</p>
      </div>
    );
  }

  // Extract students array or create empty array if missing
  interface StudentsResponse {
    students: StudentData[];
  }

  function isStudentsResponse(data: unknown): data is StudentsResponse {
    return data !== null && typeof data === "object" && "students" in data;
  }

  const students = Array.isArray(pendingStudents)
    ? pendingStudents
    : isStudentsResponse(pendingStudents)
      ? pendingStudents.students
      : [];

  // No data state
  if (!students.length) {
    return (
      <div className="text-center p-4 border rounded-md">
        <p className="text-muted-foreground">No pending registrations at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Pending Student Registrations</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Registered On</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student: StudentData) => (
            <TableRow key={student.id}>
              <TableCell className="font-medium">{student.user.name}</TableCell>
              <TableCell>{student.user.email}</TableCell>
              <TableCell>{formatDate(student.createdAt)}</TableCell>
              <TableCell>{getStatusBadge(student.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApprove(student.id)}
                    disabled={student.status !== "PENDING" || approveStudentMutation.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleReject(student.id)}
                    disabled={student.status !== "PENDING" || rejectStudentMutation.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
