// src/features/admin/components/students/profile/StudentProfile.tsx
"use client";
import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Pencil, Mail, Phone, Award } from "lucide-react";
import { format } from "date-fns";
import type { LessonStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

// Define types to replace 'any'
interface User {
  name: string | null;
  email: string;
}

interface Payment {
  id: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  referenceCode: string;
  createdAt: string | Date;
}

interface Lesson {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  type: string;
  status: LessonStatus;
  payment: Payment | null;
}

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface StudentData {
  user: User;
  phone: string | null;
  level: string;
  maxLessonsPerWeek: number;
  createdAt: string | Date;
  emergencyContact: EmergencyContact | null;
  notes: string | null;
  lessons: Lesson[];
}

interface StudentProfileProps {
  studentId: string;
  onEditAction: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ studentId, onEditAction }) => {
  const [activeTab, setActiveTab] = React.useState("overview");

  // Use student namespace for this API call
  const { data: student, isLoading, error } = api.admin.student.getStudent.useQuery({ studentId });

  // Added: Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast.error("Error loading student profile", {
        description: error.message,
      });
    }
  }, [error]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!student) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Student not found</p>
        </CardContent>
      </Card>
    );
  }

  const typedStudent = student as unknown as StudentData;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{typedStudent.user?.name}</CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {typedStudent.user?.email}
              </div>
              {student.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {student.phone}
                </div>
              )}
            </div>
          </div>
          <Button onClick={onEditAction} variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Level</p>
              <Badge className="mt-1">{student.level.replace("_", " ")}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium">Status</p>
              <Badge variant="default" className="mt-1">
                Active
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium">Max Lessons Per Week</p>
              <p className="mt-1">{student.maxLessonsPerWeek}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Member Since</p>
              <p className="mt-1">{format(new Date(student.createdAt), "PP")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              {typeof student.emergencyContact === "object" && student.emergencyContact && (
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Name:</span> {typedStudent.emergencyContact?.name}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span>{" "}
                    {typedStudent.emergencyContact?.phone}
                  </p>
                  <p>
                    <span className="font-medium">Relationship:</span>{" "}
                    {typedStudent.emergencyContact?.relationship}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {student.notes ? (
                <p>{student.notes}</p>
              ) : (
                <p className="text-muted-foreground">No notes available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lessons Tab */}
        <TabsContent value="lessons">
          <Card>
            <CardHeader>
              <CardTitle>Lesson History</CardTitle>
            </CardHeader>
            <CardContent>
              {student.lessons && student.lessons.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.lessons.map((lesson) => (
                      <TableRow key={lesson.id}>
                        <TableCell>{format(new Date(lesson.startTime), "PP")}</TableCell>
                        <TableCell>
                          {format(new Date(lesson.startTime), "p")} -{" "}
                          {format(new Date(lesson.endTime), "p")}
                        </TableCell>
                        <TableCell>{lesson.type.replace("_", " ")}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              lesson.status === "COMPLETED"
                                ? "default"
                                : lesson.status === "CANCELLED"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {lesson.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lesson.payment ? (
                            <Badge
                              variant={
                                lesson.payment.status === "COMPLETED" ? "default" : "outline"
                              }
                            >
                              {lesson.payment.status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">No payment</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No lesson history available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle>Student Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Level Progress</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">
                          Current Level: {student.level.replace("_", " ")}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: "70%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Skills Mastered</span>
                        <span className="text-sm font-medium">8/12</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: "66%" }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Recent Achievements</h3>
                  <div className="border rounded-lg divide-y">
                    <div className="p-3 flex items-center">
                      <div className="bg-blue-100 text-blue-800 p-2 rounded-full mr-3">
                        <Award className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">Completed Basic Jumps</p>
                        <p className="text-sm text-muted-foreground">2 weeks ago</p>
                      </div>
                    </div>
                    <div className="p-3 flex items-center">
                      <div className="bg-green-100 text-green-800 p-2 rounded-full mr-3">
                        <Award className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">Mastered Forward Crossovers</p>
                        <p className="text-sm text-muted-foreground">1 month ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {student.lessons?.some((lesson) => lesson.payment) ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.lessons
                      .filter((lesson) => lesson.payment)
                      .map((lesson) => (
                        <TableRow key={lesson.payment?.id}>
                          <TableCell>
                            {format(new Date(lesson.payment?.createdAt || lesson.startTime), "PP")}
                          </TableCell>
                          <TableCell>${lesson.payment?.amount?.toFixed(2) || "0.00"}</TableCell>
                          <TableCell>{lesson.payment?.method || "N/A"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                lesson.payment?.status === "COMPLETED" ? "default" : "outline"
                              }
                            >
                              {lesson.payment?.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{lesson.payment?.referenceCode || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No payment history available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
