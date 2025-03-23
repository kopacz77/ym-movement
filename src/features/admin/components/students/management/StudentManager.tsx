// src/features/admin/components/students/management/StudentManager.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StudentForm } from "@/features/admin/components/students/profile/StudentForm";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreHorizontal, Edit, Trash, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Level } from "@prisma/client";

// Define types for the emergency contact
interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

// Define interface for the Student data from the API
interface StudentFormData {
  id: string;
  user?: {
    name?: string;
    email?: string;
  };
  level?: Level;
  maxLessonsPerWeek?: number;
  phone?: string;
  notes?: string;
  emergencyContact?: EmergencyContact | null;
}

// Define a type for the student data we get from the API
interface StudentData {
  id: string;
  user: {
    name: string | null;
    email: string;
    [key: string]: unknown;
  };
  level: string;
  maxLessonsPerWeek: number;
  phone: string | null;
  notes: string | null;
  active?: boolean;
  emergencyContact?: unknown;
  [key: string]: unknown;
}

export const StudentManager = () => {
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Fetch students from the student namespace using the search query
  const {
    data: studentsData,
    isLoading,
    refetch,
    error,
  } = api.admin.student.getStudents.useQuery({ search });

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error("Error loading students", {
        description: error.message,
      });
    }
  }, [error]);

  // Extract students array (fallback to empty array)
  const students = studentsData?.students || [];

  // Toggle student status mutation for activating/deactivating
  const toggleStudentStatus = api.admin.student.toggleStatus.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Student status updated successfully",
      });
      refetch();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const handleEdit = (student: StudentData) => {
    setSelectedStudent(student);
    setIsFormOpen(true);
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (window.confirm("Are you sure you want to deactivate this student?")) {
      toggleStudentStatus.mutate({
        studentId,
        active: false,
      });
    }
  };

  const handleStatusChange = (studentId: string, active: boolean) => {
    toggleStudentStatus.mutate({ studentId, active });
  };

  // Safe conversion function for emergency contact
  const convertEmergencyContact = (contact: unknown): EmergencyContact | null => {
    if (!contact || typeof contact !== "object") {
      return null;
    }

    // Use type assertion only after runtime check
    const typedContact = contact as Record<string, unknown>;

    if ("name" in typedContact && "phone" in typedContact && "relationship" in typedContact) {
      return {
        name: String(typedContact.name || ""),
        phone: String(typedContact.phone || ""),
        relationship: String(typedContact.relationship || ""),
      };
    }

    return null;
  };

  // Function to convert StudentData to StudentFormData
  const convertToFormStudent = (student: StudentData): StudentFormData => {
    return {
      id: student.id,
      user: {
        name: student.user?.name || undefined,
        email: student.user?.email,
      },
      level: student.level as Level,
      maxLessonsPerWeek: student.maxLessonsPerWeek,
      phone: student.phone || undefined,
      notes: student.notes || undefined,
      emergencyContact: convertEmergencyContact(student.emergencyContact),
    };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Students</CardTitle>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{selectedStudent ? "Edit Student" : "Add New Student"}</DialogTitle>
              </DialogHeader>
              <StudentForm
                student={selectedStudent ? convertToFormStudent(selectedStudent) : undefined}
                onSubmitAction={() => {
                  setIsFormOpen(false);
                  setSelectedStudent(null);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Weekly Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No students found
                </TableCell>
              </TableRow>
            ) : (
              students.map((student: StudentData) => {
                const isActive = "active" in student ? Boolean(student.active) : true;

                return (
                  <TableRow key={student.id}>
                    <TableCell>{student.user?.name || "N/A"}</TableCell>
                    <TableCell>{student.user?.email || "N/A"}</TableCell>
                    <TableCell>
                      {typeof student.level === "string" ? student.level.replace("_", " ") : "N/A"}
                    </TableCell>
                    <TableCell>{student.maxLessonsPerWeek || 0} lessons</TableCell>
                    <TableCell>
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className={isActive ? "bg-green-100 text-green-800" : ""}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(student)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(student.id, !isActive)}
                          >
                            {isActive ? (
                              <>
                                <XCircle className="mr-2 h-4 w-4" /> Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" /> Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteStudent(student.id)}
                          >
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
