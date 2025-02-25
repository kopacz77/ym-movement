// src/features/admin/components/students/management/StudentManager.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// Import StudentForm from profile directory instead of local import
import { StudentForm } from '@/features/admin/components/students/profile/StudentForm';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Plus, MoreHorizontal, Edit, Trash, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TRPCClientError } from '@trpc/client';

interface Student {
  id: string;
  name: string;
  email: string;
  level: string;
  weeklyHours: number;
  active: boolean;
}

export const StudentManager = () => {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  // Fetch students - updated to use student namespace
  const { data: studentsData, isLoading, refetch, error } = api.admin.student.getStudents.useQuery(
    { search }
  );

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading students",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [error, toast]);
  
  // Extract students with proper typing
  const students = studentsData?.students || [];

  // Delete student mutation - using toggleStatus to deactivate instead
  const toggleStudentStatus = api.admin.student.toggleStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student status updated successfully"
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setIsFormOpen(true);
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (window.confirm('Are you sure you want to deactivate this student?')) {
      toggleStudentStatus.mutate({ 
        studentId,
        active: false 
      });
    }
  };

  const handleStatusChange = (studentId: string, active: boolean) => {
    toggleStudentStatus.mutate({ studentId, active });
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
                <DialogTitle>{selectedStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
              </DialogHeader>
              <StudentForm
                student={selectedStudent}
                onSubmit={() => {
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
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : students?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No students found</TableCell>
              </TableRow>
            ) : (
              students?.map((student: any) => (
                <TableRow key={student.id}>
                  <TableCell>{student.user?.name || 'N/A'}</TableCell>
                  <TableCell>{student.user?.email || 'N/A'}</TableCell>
                  <TableCell>{student.level || 'N/A'}</TableCell>
                  <TableCell>{student.maxLessonsPerWeek || 0} lessons</TableCell>
                  <TableCell>
                    {/* Fixed: Using default variant with custom styling instead of "success" */}
                    <Badge
                      variant={student.active ? "default" : "secondary"}
                      className={student.active ? "bg-green-100 text-green-800" : ""}
                    >
                      {student.active ? "Active" : "Inactive"}
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
                        <DropdownMenuItem onClick={() => handleStatusChange(student.id, !student.active)}>
                          {student.active ? (
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
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};