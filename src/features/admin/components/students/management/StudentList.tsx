// src/features/admin/components/students/management/StudentList.tsx
"use client";
import type { Level } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  LockOpen,
  Mail,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import React, { useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { showDeleteConfirmation, showStatusToggleConfirmation } from "@/lib/toast-confirmations";

interface StudentListProps {
  onEditAction: (studentId: string) => void;
  onViewProfileAction: (studentId: string) => void;
  showInactive?: boolean;
}

export const StudentList: React.FC<StudentListProps> = ({
  onEditAction,
  onViewProfileAction,
  showInactive = false,
}) => {
  const [search, setSearch] = React.useState("");
  const queryClient = useQueryClient();

  const {
    data: studentsData,
    isLoading,
    error,
  } = api.admin.student.getStudents.useQuery({
    search: search || undefined,
    active: !showInactive,
  });

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

  const resendInvitationMutation = api.admin.student.resendInvitation.useMutation({
    onSuccess: (data) => {
      toast.success("Invitation resent", {
        description: `A new setup email was sent to ${data.email}.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to resend invitation", {
        description: error.message,
      });
    },
  });

  const unlockAccountMutation = api.admin.auth.unlockAccount.useMutation({
    onSuccess: () => {
      toast.success("Account unlocked", {
        description: "The student can now log in again.",
      });
    },
    onError: (error) => {
      toast.error("Failed to unlock account", {
        description: error.message,
      });
    },
  });

  const toggleStatusMutation = api.admin.student.toggleStatus.useMutation({
    onSuccess: (data) => {
      const isNowActive = data.isActive;
      toast.success(isNowActive ? "Student reactivated" : "Student deactivated", {
        description: `${data.User.name}'s account has been ${isNowActive ? "reactivated" : "deactivated"}.`,
      });

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["admin", "student"] });
    },
    onError: (error) => {
      toast.error("Failed to update student status", {
        description: error.message,
      });
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

  // Toggle status handler
  const handleToggleStatus = (studentId: string, studentName: string, currentlyActive: boolean) => {
    showStatusToggleConfirmation(currentlyActive ? "deactivate" : "reactivate", studentName, () => {
      toggleStatusMutation.mutate({ studentId, active: !currentlyActive });
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
                const isActive = student.isActive ?? true;

                return (
                  <TableRow key={student.id} className={isActive ? "" : "opacity-60"}>
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
                      <Badge variant={isActive ? "default" : "secondary"}>
                        {isActive ? "Active" : "Inactive"}
                      </Badge>
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
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onEditAction(student.id)}
                            className="w-full"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              resendInvitationMutation.mutate({ studentId: student.id })
                            }
                            disabled={resendInvitationMutation.isPending}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Resend Invitation
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              unlockAccountMutation.mutate({ email: student.User.email })
                            }
                            disabled={unlockAccountMutation.isPending}
                          >
                            <LockOpen className="h-4 w-4 mr-2" />
                            Unlock Account
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleStatus(
                                student.id,
                                student.User.name || "Student",
                                isActive,
                              )
                            }
                            className={`w-full ${isActive ? "text-orange-600 focus:text-orange-700 focus:bg-orange-50" : "text-green-600 focus:text-green-700 focus:bg-green-50"}`}
                            disabled={toggleStatusMutation.isPending}
                          >
                            {isActive ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Reactivate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleDeleteStudent(student.id, student.User.name || "Student")
                            }
                            className="w-full text-red-600 focus:text-red-700 focus:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
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
