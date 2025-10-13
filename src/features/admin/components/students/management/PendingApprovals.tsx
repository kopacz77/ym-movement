// src/features/admin/components/students/management/PendingApprovals.tsx
"use client";
import { useQueryClient } from "@tanstack/react-query";
import type { TRPCClientErrorLike } from "@trpc/client";
import { format } from "date-fns";
import { AlertCircle, Check, Clock } from "lucide-react";
import type React from "react";
import { toast } from "sonner";
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
import { showDeleteConfirmation } from "@/lib/toast-confirmations";

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
  const _pendingApprovalKey = ["admin", "student", "getPendingApprovals"];

  // Fetch pending approvals from API
  const { data: pendingStudents, isLoading } = api.admin.student.getPendingApprovals.useQuery();

  // 💰 $1000 CHALLENGE - ULTIMATE BULLETPROOF APPROVE 💰
  const approveStudentMutation = api.admin.student.approveStudent.useMutation({
    onMutate: async ({ studentId }) => {
      console.log("🚀💰 $1000 CHALLENGE: Ultimate approve fix starting for student:", studentId);

      // STEP 1: Cancel ALL queries aggressively
      await queryClient.cancelQueries();
      console.log("🔄 CANCELLED all queries");

      // STEP 2: Get complete cache state for debugging
      const cache = queryClient.getQueryCache();
      const allQueries = cache.getAll();

      console.log("🗂️ FULL CACHE STATE:");
      allQueries.forEach((query, index) => {
        const data = query.state.data as any;
        console.log(`Cache [${index}]:`, {
          key: query.queryKey,
          hasStudents: data?.students ? data.students.length : "no students",
          isEnabled: (query.options as any)?.enabled !== false,
          state: query.state.status,
        });
      });

      // STEP 3: Find the student we're approving
      let studentToApprove: any = null;
      let foundInQuery = "";

      for (const query of allQueries) {
        const data = query.state.data as any;
        if (data?.students && Array.isArray(data.students)) {
          const student = data.students.find((s: any) => s.id === studentId);
          if (student) {
            studentToApprove = student;
            foundInQuery = query.queryKey.join(".");
            console.log("🎯 FOUND STUDENT:", student.user?.name, "in query:", foundInQuery);
            break;
          }
        }
      }

      if (!studentToApprove) {
        console.error("❌ CRITICAL: Cannot find student to approve in any cache!");
        return { studentId };
      }

      // STEP 4: Transform to approved format with ALL needed fields
      const approvedStudent = {
        id: studentToApprove.id,
        userId: studentToApprove.userId || studentToApprove.user?.id,
        level: studentToApprove.level || "PRE_PRELIMINARY",
        maxLessonsPerWeek: studentToApprove.maxLessonsPerWeek,
        phone: studentToApprove.phone,
        notes: studentToApprove.notes,
        createdAt: studentToApprove.createdAt,
        updatedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        isApproved: true,
        status: "APPROVED",
        // User data - handle both formats
        User: {
          id: studentToApprove.user?.id || studentToApprove.User?.id,
          name: studentToApprove.user?.name || studentToApprove.User?.name,
          email: studentToApprove.user?.email || studentToApprove.User?.email,
          role: "STUDENT",
        },
        // Initialize empty arrays
        Lesson: [],
      };

      console.log("🔄 TRANSFORMED STUDENT:", approvedStudent);

      // STEP 5: Update ALL cache entries with surgical precision
      let pendingRemoved = false;
      let approvedAdded = false;

      allQueries.forEach((query) => {
        const data = query.state.data as any;
        if (!data?.students || !Array.isArray(data.students)) {
          return;
        }

        const queryKey = query.queryKey.join(".");

        // REMOVE from pending lists
        if (queryKey.includes("getPendingApprovals")) {
          const beforeCount = data.students.length;
          const filtered = data.students.filter((s: any) => s.id !== studentId);

          if (beforeCount !== filtered.length) {
            queryClient.setQueryData(query.queryKey, {
              ...data,
              students: filtered,
            });
            pendingRemoved = true;
            console.log(`✂️ REMOVED from ${queryKey}: ${beforeCount} -> ${filtered.length}`);
          }
        }

        // ADD to approved lists
        else if (queryKey.includes("getStudents")) {
          const exists = data.students.some((s: any) => s.id === studentId);
          if (!exists) {
            const updated = [approvedStudent, ...data.students]; // Add to front for visibility
            queryClient.setQueryData(query.queryKey, {
              ...data,
              students: updated,
              total: (data.total || 0) + 1,
              pagination: data.pagination
                ? {
                    ...data.pagination,
                    total: (data.pagination.total || 0) + 1,
                  }
                : undefined,
            });
            approvedAdded = true;
            console.log(`➕ ADDED to ${queryKey}: ${data.students.length} -> ${updated.length}`);
          }
        }
      });

      console.log(
        `🎯 CACHE UPDATE RESULTS: Pending removed: ${pendingRemoved}, Approved added: ${approvedAdded}`,
      );

      if (!pendingRemoved || !approvedAdded) {
        console.error("❌ CRITICAL: Cache update incomplete!");
      }

      return { studentId, approvedStudent, pendingRemoved, approvedAdded };
    },

    onSuccess: (_data, _variables, context) => {
      console.log("🎉💰 SUCCESS! Student approved - results:", {
        pendingRemoved: context?.pendingRemoved,
        approvedAdded: context?.approvedAdded,
      });

      toast.success("Student approved successfully! 🎉");

      // MINIMAL invalidation to sync with backend data
      setTimeout(() => {
        console.log("🔄 Syncing with backend...");
        queryClient.invalidateQueries({
          queryKey: ["admin", "student"],
          refetchType: "none", // Don't refetch, just mark stale
        });
      }, 100);
    },

    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      console.error("💥💰 APPROVE FAILED:", error.message);
      toast.error("Failed to approve student", {
        description: error.message,
      });

      // Force full refresh on error
      queryClient.invalidateQueries({ queryKey: ["admin", "student"] });
    },
  });

  // BULLETPROOF reject mutation - forces immediate UI update
  const rejectStudentMutation = api.admin.student.rejectStudent.useMutation({
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
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      console.log("❌ REJECT: Failed, showing error");
      toast.error("Failed to reject application", {
        description: error.message,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "student"] });
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
