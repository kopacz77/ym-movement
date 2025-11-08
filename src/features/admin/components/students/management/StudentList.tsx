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

  const deleteStudentMutation = api.admin.student.deleteStudent.useMutation({
    onSuccess: (data) => {
      toast.success("Student deleted successfully", {
        description: `${data.deletedStudent.name} has been removed from the system.`,
      });

      // Simple invalidation - let TRPC handle the rest
      queryClient.invalidateQueries({ queryKey: ["admin", "student"] });
    },
    onError: (error) => {
      toast.error("Failed to delete student", {
        description: error.message,
      });
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
                        <button
                          onClick={() => onViewProfileAction(student.id)}
                          className="font-medium truncate text-left hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                        >
                          {student.User.name}
                        </button>
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
                      {student._count?.Lesson || 0} Lesson
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
