// features/admin/components/students/progress/LessonProgress.tsx
"use client";

import { format } from "date-fns";
import { CheckCircle2, XCircle } from "lucide-react";
import React, { useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";

interface LessonProgressProps {
  studentId: string;
}

// Use type instead of interface to better match the API return type
type LessonStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

// Unused type - kept for future use
/*
type APILesson = {
  id: string;
  startTime: Date;
  endTime: Date;
  type: string;
  status: LessonStatus;
  notes: string | null;
  duration: number;
  rink: {
    id: string;
    name: string;
    timezone: string;
    address: string;
    maxCapacity: number | null;
    createdAt: Date;
    updatedAt: Date;
  };
  student: {
    user: {
      id: string;
      name: string | null;
      email: string;
      createdAt: Date;
      updatedAt: Date;
      emailVerified: Date | null;
    };
  };
  payment: {
    id: string;
    amount: number;
    status: string;
  } | null;
};
*/

export const LessonProgress: React.FC<LessonProgressProps> = ({ studentId }) => {
  // Use a consistent query pattern for React 19
  const {
    data: lessons,
    isLoading,
    error,
  } = api.admin.schedule.getLessonsByDate.useQuery({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date(),
  });

  // Filter lessons for the specific student
  const studentLessons = React.useMemo(() => {
    if (!lessons) {
      return [];
    }
    return lessons.filter(
      (lesson) => lesson.Student?.User?.id === studentId && lesson.status !== "CANCELLED",
    );
  }, [lessons, studentId]);

  // Using useEffect for error handling is more React 19 friendly
  useEffect(() => {
    if (error) {
      toast.error("Error loading lesson progress", {
        description: error.message,
      });
    }
  }, [error]);

  const getStatusColor = (status: LessonStatus) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
        ) : studentLessons?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentLessons.map((lesson: any) => (
                <TableRow key={lesson.id}>
                  <TableCell>{format(new Date(lesson.startTime), "PP")}</TableCell>
                  <TableCell>
                    {format(new Date(lesson.startTime), "p")} -{" "}
                    {format(new Date(lesson.endTime), "p")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {lesson.status === "COMPLETED" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <Badge variant="default" className={getStatusColor(lesson.status)}>
                        {lesson.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{lesson.type.replace("_", " ")}</TableCell>
                  <TableCell>{lesson.Rink?.name || lesson.rink?.name}</TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-muted-foreground truncate">{lesson.notes ?? "-"}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No lesson progress recorded yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};
