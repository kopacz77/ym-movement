// src/features/admin/components/students/management/StudentList.tsx
"use client";
import type { Level } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Search } from "lucide-react";
import React, { useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { showDeleteConfirmation } from "@/lib/toast-confirmations";

interface StudentListProps {
  onEditAction: (studentId: string) => void;
  onViewProfileAction: (studentId: string) => void;
}

export const StudentList: React.FC<StudentListProps> = ({ onEditAction, onViewProfileAction }) => {
  const [search, setSearch] = React.useState("");
  const queryClient = useQueryClient();

  // Add proper input object to fix the null/undefined issue
  const {
    data: studentsData,
    isLoading,
    error,
  } = api.admin.student.getStudents.useQuery({ search: search || undefined });

  // BULLETPROOF delete mutation - forces immediate UI update
  const deleteStudentMutation = api.admin.student.deleteStudent.useMutation({
    onMutate: async ({ studentId }) => {
      console.log("🔄 REGULAR STUDENTLIST: Deleting student", studentId);

      // AGGRESSIVE: Cancel ALL queries, not just student ones
      await queryClient.cancelQueries();

      // Get ALL possible cache keys and clear them
      const possibleKeys = [
        ["admin", "student", "getStudents", { search: search || undefined }],
        ["admin", "student", "getStudents", {}],
        ["admin", "student", "getStudents"],
        ["admin", "student", "getPendingApprovals"],
      ];

      console.log("🔍 Checking all cache keys for student data...");

      // FIRST: Let's see what keys actually exist in the cache
      const cache = queryClient.getQueryCache();
      const allQueries = cache.getAll();
      console.log(
        "🗂️ ALL CACHE KEYS:",
        allQueries.map((q) => ({
          key: q.queryKey,
          hasData: !!q.state.data,
        })),
      );

      // Update ALL possible cache variations
      possibleKeys.forEach((key) => {
        const data = queryClient.getQueryData(key);
        console.log("🔍 Checking key:", key, "Data found:", !!data);
        if (data) {
          console.log("📝 Found data in key:", key, data);
          queryClient.setQueryData(key, (old: any) => {
            if (old?.students) {
              const filtered = old.students.filter((student: any) => student.id !== studentId);
              console.log(
                `✂️ Filtered ${key.join(".")} from ${old.students.length} to ${filtered.length} students`,
              );
              return { ...old, students: filtered };
            }
            return old;
          });
        }
      });

      // BRUTE FORCE: Update ALL queries that contain students data
      console.log("🔨 BRUTE FORCE: Updating all queries with students data...");
      allQueries.forEach((query) => {
        const data = query.state.data as any;
        if (data?.students && Array.isArray(data.students)) {
          console.log("🎯 BRUTE FORCE: Updating query with key:", query.queryKey);
          const filtered = data.students.filter((student: any) => student.id !== studentId);
          queryClient.setQueryData(query.queryKey, {
            ...data,
            students: filtered,
          });
          console.log(
            `✂️ BRUTE FORCE: Filtered from ${data.students.length} to ${filtered.length} students`,
          );
        }
      });

      // NUCLEAR OPTION: Force component re-render
      setTimeout(() => {
        console.log("💥 NUCLEAR: Force invalidating all student queries");
        queryClient.invalidateQueries({ queryKey: ["admin", "student"] });
      }, 0);

      return { studentId };
    },
    onSuccess: (data) => {
      console.log("✅ Delete successful, forcing cache refresh");
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
      console.log("❌ Delete failed, showing error");
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

  const students = studentsData?.students || [];

  // Delete handler
  const handleDeleteStudent = (studentId: string, studentName: string) => {
    showDeleteConfirmation(`student "${studentName}"`, () => {
      deleteStudentMutation.mutate({ studentId });
    });
  };

  const getLevelColor = (level: Level) => {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px] sticky left-0 bg-background">Name</TableHead>
              <TableHead className="min-w-[200px] hidden sm:table-cell">Email</TableHead>
              <TableHead className="min-w-[120px]">Level</TableHead>
              <TableHead className="min-w-[100px] hidden md:table-cell">Status</TableHead>
              <TableHead className="min-w-[100px] hidden lg:table-cell">Lessons</TableHead>
              <TableHead className="w-[80px] sticky right-0 bg-background">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : students?.length ? (
              students.map((student) => {
                // Fix: Add safe check for active property

                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium sticky left-0 bg-background">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{student.User.name}</div>
                        <div className="text-sm text-muted-foreground sm:hidden truncate">
                          {student.User.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{student.User.email}</TableCell>
                    <TableCell>
                      <Badge className={getLevelColor(student.level)}>
                        {student.level.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="default">Active</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {student.Lesson?.length || 0} Lesson
                    </TableCell>
                    <TableCell className="sticky right-0 bg-background">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onViewProfileAction(student.id)}
                            className="w-full"
                          >
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onEditAction(student.id)}
                            className="w-full"
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleDeleteStudent(student.id, student.User.name || "Student")
                            }
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No students found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
