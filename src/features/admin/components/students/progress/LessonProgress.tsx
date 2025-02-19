// features/admin/components/students/progress/LessonProgress.tsx
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { CheckCircle2, XCircle } from 'lucide-react';
import { LessonDetails } from '@/features/admin/types';

interface LessonProgressProps {
  studentId: string;
}

interface SkillProgress {
  id: string;
  name: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  completedAt?: Date;
  notes?: string;
}

interface LessonWithProgress {
  id: string;
  date: Date;
  instructor: { name: string; };
  skillsProgress: SkillProgress[];
  attendance: boolean;
  notes?: string;
}

export const LessonProgress: React.FC<LessonProgressProps> = ({ studentId }) => {
  const { toast } = useToast();
  const { data: lessonsProgress, isLoading } = api.admin.getStudentLessonProgress.useQuery(
    { studentId },
    {
      onError: (err) => {
        toast({ title: "Error loading lesson progress", description: err.message, variant: "destructive" });
      },
    }
  );

  const getStatusColor = (status: SkillProgress['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'NOT_STARTED':
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lesson Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading progress...</div>
        ) : !lessonsProgress?.length ? (
          <div className="text-center py-4 text-muted-foreground">No lesson progress recorded yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Skills Progress</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessonsProgress.map((lesson) => (
                <TableRow key={lesson.id}>
                  <TableCell>{format(new Date(lesson.date), 'PP')}</TableCell>
                  <TableCell>{lesson.instructor.name}</TableCell>
                  <TableCell>
                    {lesson.attendance ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {lesson.skillsProgress.map((skill) => (
                        <Badge key={skill.id} className={getStatusColor(skill.status)}>
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-muted-foreground truncate">{lesson.notes}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
