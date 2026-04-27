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
import { Card, CardContent } from "@/components/ui/card";
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

const INITIALS_COLORS = ["bg-[#1a3a5c]", "bg-violet-600", "bg-slate-400", "bg-[#0891b2]"];

function getInitials(name: string | null): string {
  if (!name) {
    return "??";
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getInitialsColor(index: number): string {
  return INITIALS_COLORS[index % INITIALS_COLORS.length];
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
      PRE_PRELIMINARY: "bg-cyan-50 text-cyan-700",
      PRELIMINARY: "bg-emerald-50 text-emerald-700",
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
    <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] border-0">
      <CardContent className="p-0">
        {/* Card Header with Search */}
        <div className="px-6 pt-6 pb-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-[#1a3a5c]">All Students</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                {studentsData?.pagination?.total ?? students.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search students..."
                  className="pl-8 w-[200px] h-9 text-sm border-slate-200 focus:border-[#0891b2] focus:ring-[#0891b2]/20"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6">
                  Student
                </TableHead>
                <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 hidden sm:table-cell">
                  Level
                </TableHead>
                <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 hidden md:table-cell">
                  Status
                </TableHead>
                <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 hidden lg:table-cell">
                  Lessons
                </TableHead>
                <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 hidden lg:table-cell">
                  Rate
                </TableHead>
                <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 w-[60px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    Loading students...
                  </TableCell>
                </TableRow>
              ) : students?.length ? (
                students.map((student, index) => {
                  const isActive = student.isActive ?? true;

                  return (
                    <TableRow
                      key={student.id}
                      className={`hover:bg-slate-50/50 transition-colors duration-150 ${isActive ? "" : "opacity-60"}`}
                    >
                      {/* Student Name + Initials */}
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full ${getInitialsColor(index)} text-white flex items-center justify-center text-xs font-bold shrink-0`}
                          >
                            {getInitials(student.User.name)}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => onViewProfileAction(student.id)}
                              className="font-medium text-[#1a3a5c] hover:text-[#0891b2] transition-colors text-left truncate block"
                            >
                              {student.User.name}
                            </button>
                            <p className="text-xs text-slate-400 truncate max-w-[180px]">
                              {student.User.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Level */}
                      <TableCell className="px-6 py-4 hidden sm:table-cell">
                        <Badge className={getLevelColor(student.level)}>
                          {student.level.replace("_", " ")}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-6 py-4 hidden md:table-cell">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </TableCell>

                      {/* Lessons */}
                      <TableCell className="px-6 py-4 hidden lg:table-cell">
                        <span className="text-sm font-medium text-[#1a3a5c]">
                          {student._count?.Lesson || 0}
                        </span>
                        <span className="text-sm text-slate-400 ml-1">lessons</span>
                      </TableCell>

                      {/* Rate */}
                      <TableCell className="px-6 py-4 hidden lg:table-cell">
                        {student.customPricingEnabled && student.privateLessonPrice ? (
                          <span className="text-sm font-medium text-[#1a3a5c]">
                            ${Number(student.privateLessonPrice).toFixed(0)}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">Standard</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-6 py-4">
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
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    No students found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
