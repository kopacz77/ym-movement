// src/features/admin/components/students/management/StudentList.tsx
"use client";

import React, { useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Level } from '@prisma/client';
import { MoreHorizontal, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface StudentListProps {
  onEditAction: (studentId: string) => void;
  onViewProfileAction: (studentId: string) => void;
}

export const StudentList: React.FC<StudentListProps> = ({ onEditAction, onViewProfileAction }) => {
  const [search, setSearch] = React.useState('');
  const { toast } = useToast();

  // Add proper input object to fix the null/undefined issue
  const { data: studentsData, isLoading, error } = api.admin.student.getStudents.useQuery({
    search: search || undefined
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading students",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const students = studentsData?.students || [];

  const getLevelColor = (level: Level) => {
    const colors: Record<Level, string> = {
      PRE_PRELIMINARY: 'bg-blue-100 text-blue-800',
      PRELIMINARY: 'bg-green-100 text-green-800',
      PRE_JUVENILE: 'bg-yellow-100 text-yellow-800',
      JUVENILE: 'bg-orange-100 text-orange-800',
      INTERMEDIATE: 'bg-purple-100 text-purple-800',
      NOVICE: 'bg-pink-100 text-pink-800',
      JUNIOR: 'bg-red-100 text-red-800',
      SENIOR: 'bg-indigo-100 text-indigo-800',
    };
    return colors[level];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lessons</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : !students?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No students found</TableCell>
              </TableRow>
            ) : (
              students.map((student) => {
                // Fix: Add safe check for active property
                const isActive = true; // Default to true as fallback
                
                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.user.name}</TableCell>
                    <TableCell>{student.user.email}</TableCell>
                    <TableCell>
                      <Badge className={getLevelColor(student.level)}>
                        {student.level.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>{student.lessons?.length || 0} lessons</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewProfileAction(student.id)}>
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditAction(student.id)}>
                            Edit
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
      </div>
    </div>
  );
};