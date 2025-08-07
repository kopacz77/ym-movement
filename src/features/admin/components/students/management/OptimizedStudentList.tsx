// src/features/admin/components/students/management/OptimizedStudentList.tsx
"use client";

import type { Level } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Search } from "lucide-react";
import type React from "react";
import { memo, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { showDeleteConfirmation } from "@/lib/toast-confirmations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useTableColumns, VirtualizedTable } from "@/components/ui/virtualized-table";
import { api } from "@/lib/api";
import { useDebouncedState } from "@/lib/context-utils";

interface Student {
  id: string;
  level: Level;
  user: {
    name: string | null;
    email: string;
  };
  lessons?: unknown[];
}

interface OptimizedStudentListProps {
  onEditAction: (studentId: string) => void;
  onViewProfileAction: (studentId: string) => void;
}

const getLevelColor = (level: Level): string => {
  const colors: Record<Level, string> = {
    PRE_PRELIMINARY: "bg-blue-100 text-blue-800",
    PRELIMINARY: "bg-green-100 text-green-800",
    PRE_JUVENILE: "bg-yellow-100 text-yellow-800",
    JUVENILE: "bg-orange-100 text-orange-800",
    INTERMEDIATE: "bg-purple-100 text-purple-800",
    NOVICE: "bg-pink-100 text-pink-800",
    JUNIOR: "bg-red-100 text-red-800",
    SENIOR: "bg-indigo-100 text-indigo-800",
  };
  return colors[level];
};

// Memoized student row actions component
const StudentActions = memo(
  ({
    studentId,
    studentName,
    onEdit,
    onViewProfile,
    onDelete,
  }: {
    studentId: string;
    studentName: string;
    onEdit: (id: string) => void;
    onViewProfile: (id: string) => void;
    onDelete: (id: string, name: string) => void;
  }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onViewProfile(studentId)} className="w-full">
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(studentId)} className="w-full">
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDelete(studentId, studentName)}
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
);

StudentActions.displayName = "StudentActions";

export const OptimizedStudentList: React.FC<OptimizedStudentListProps> = memo(
  ({ onEditAction, onViewProfileAction }) => {
    const queryClient = useQueryClient();

    // Use debounced search to reduce API calls
    const [immediateSearch, debouncedSearch, setSearch] = useDebouncedState("", 300);

    const {
      data: studentsData,
      isLoading,
      error,
    } = api.admin.student.getStudents.useQuery(
      {
        search: debouncedSearch || undefined,
        limit: 100, // Increase limit for better virtualization performance
      },
      {
        placeholderData: (previousData) => previousData, // Keep previous data while loading new search results
        staleTime: 1000 * 60 * 2, // 2 minutes cache
      },
    );

    // BULLETPROOF delete mutation - forces immediate UI update
    const deleteStudentMutation = api.admin.student.deleteStudent.useMutation({
      onMutate: async ({ studentId }) => {
        console.log("🔄 OPTIMIZED STUDENTLIST: Deleting student", studentId);

        // AGGRESSIVE: Cancel ALL queries
        await queryClient.cancelQueries();

        // Get ALL possible cache keys and clear them
        const possibleKeys = [
          ["admin", "student", "getStudents", { search: debouncedSearch || undefined, limit: 100 }],
          ["admin", "student", "getStudents", { search: debouncedSearch || undefined }],
          ["admin", "student", "getStudents", {}],
          ["admin", "student", "getStudents"],
          ["admin", "student", "getPendingApprovals"],
        ];

        console.log("🔍 OPTIMIZED: Checking all cache keys for student data...");

        // Update ALL possible cache variations
        possibleKeys.forEach((key) => {
          const data = queryClient.getQueryData(key);
          if (data) {
            console.log(`📝 OPTIMIZED: Found data in key:`, key, data);
            queryClient.setQueryData(key, (old: any) => {
              if (old?.students) {
                const filtered = old.students.filter((student: any) => student.id !== studentId);
                console.log(
                  `✂️ OPTIMIZED: Filtered ${key.join(".")} from ${old.students.length} to ${filtered.length} students`,
                );
                return { ...old, students: filtered };
              }
              return old;
            });
          }
        });

        // NUCLEAR OPTION: Force component re-render
        setTimeout(() => {
          console.log("💥 OPTIMIZED NUCLEAR: Force invalidating all student queries");
          queryClient.invalidateQueries({ queryKey: ["admin", "student"] });
        }, 0);

        return { studentId };
      },
      onSuccess: (data) => {
        console.log("✅ OPTIMIZED: Delete successful, forcing cache refresh");
        toast.success("Student deleted successfully", {
          description: `${data.deletedStudent.name} has been removed from the system.`,
        });

        // IMMEDIATELY invalidate everything
        queryClient.invalidateQueries({ queryKey: ["admin", "student"] });

        // Force refetch the current query
        queryClient.refetchQueries({
          queryKey: ["admin", "student", "getStudents"],
          exact: false,
        });
      },
      onError: (error) => {
        console.log("❌ OPTIMIZED: Delete failed, showing error");
        toast.error("Failed to delete student", {
          description: error.message,
        });
        // Force refresh on error too
        queryClient.invalidateQueries({ queryKey: ["admin", "student"] });
      },
    });

    useEffect(() => {
      if (error) {
        toast.error("Error loading students", {
          description: error.message,
        });
      }
    }, [error]);

    const students = useMemo(() => studentsData?.students || [], [studentsData?.students]);

    // Delete handler
    const handleDeleteStudent = (studentId: string, studentName: string) => {
      showDeleteConfirmation(`student "${studentName}"`, () => {
        deleteStudentMutation.mutate({ studentId });
      });
    };

    // Memoized table columns configuration
    const columns = useTableColumns<Student>([
      {
        key: "name",
        header: "Name",
        minWidth: 150,
        render: (student) => <div className="font-medium">{student.User.name}</div>,
      },
      {
        key: "email",
        header: "Email",
        minWidth: 200,
        render: (student) => (
          <div className="text-sm text-muted-foreground">{student.User.email}</div>
        ),
      },
      {
        key: "level",
        header: "Level",
        minWidth: 120,
        render: (student) => (
          <Badge className={getLevelColor(student.level)}>{student.level.replace("_", " ")}</Badge>
        ),
      },
      {
        key: "status",
        header: "Status",
        minWidth: 100,
        render: () => <Badge variant="default">Active</Badge>,
      },
      {
        key: "lessons",
        header: "Lessons",
        minWidth: 100,
        render: (student) => <div className="text-sm">{student.lessons?.length || 0} lessons</div>,
      },
      {
        key: "actions",
        header: "Actions",
        width: 80,
        render: (student) => (
          <StudentActions
            studentId={student.id}
            studentName={student.User.name || "Student"}
            onEdit={onEditAction}
            onViewProfile={onViewProfileAction}
            onDelete={handleDeleteStudent}
          />
        ),
      },
    ]);

    // Show loading state
    if (isLoading && !students.length) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                className="pl-8"
                value={immediateSearch}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="rounded-md border p-8 text-center">
            <div className="text-muted-foreground">Loading students...</div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              className="pl-8"
              value={immediateSearch}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {debouncedSearch && (
            <div className="text-sm text-muted-foreground">
              {students.length} student{students.length !== 1 ? "s" : ""} found
            </div>
          )}
        </div>

        {students.length === 0 ? (
          <div className="rounded-md border p-8 text-center">
            <div className="text-muted-foreground">
              {debouncedSearch ? "No students found" : "No students"}
            </div>
          </div>
        ) : (
          <VirtualizedTable
            data={students}
            columns={columns}
            height={500}
            itemHeight={52}
            overscan={5}
            className="w-full"
          />
        )}
      </div>
    );
  },
);

OptimizedStudentList.displayName = "OptimizedStudentList";
