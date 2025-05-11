// src/features/admin/components/students/shared/StudentCard.tsx
"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Level } from "@prisma/client";
import { format } from "date-fns";
import { Calendar, Clock, Mail, Phone } from "lucide-react";
import type React from "react";
import { Student } from "../types";

interface StudentCardProps {
  student: {
    id: string;
    user: { name: string; email: string };
    level: Level;
    phone?: string | null;
    active: boolean;
    nextLesson?: Date;
    lastLesson?: Date;
    totalLessons?: number;
  };
  onViewProfileAction: (studentId: string) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({ student, onViewProfileAction }) => {
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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">{student.user.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Mail className="h-4 w-4" /> {student.user.email}
            </div>
            {student.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" /> {student.phone}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge className={getLevelColor(student.level)}>
              {student.level.replace("_", " ")}
            </Badge>
            <Badge variant={student.active ? "default" : "secondary"}>
              {student.active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {student.nextLesson && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Next Lesson: {format(new Date(student.nextLesson), "PPp")}</span>
            </div>
          )}
          {student.lastLesson && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Last Lesson: {format(new Date(student.lastLesson), "PP")}</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              Total Lessons: {student.totalLessons || 0}
            </span>
            <Button variant="outline" size="sm" onClick={() => onViewProfileAction(student.id)}>
              View Profile
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
