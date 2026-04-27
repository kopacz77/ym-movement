"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";

export function CoachStudentList() {
  const { data: students, isLoading } = api.coach.students.getMyStudents.useQuery();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Students</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : students?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Total Lessons</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name ?? "Unknown"}</TableCell>
                  <TableCell className="text-muted-foreground">{student.email ?? "N/A"}</TableCell>
                  <TableCell>{student.level ?? "Not set"}</TableCell>
                  <TableCell>{student.totalLessons}</TableCell>
                  <TableCell>
                    {student.isActive ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground border-border">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            No students have booked lessons with you yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
