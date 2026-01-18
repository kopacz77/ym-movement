// src/features/admin/components/students/profile/StudentProfile.tsx
"use client";
import type { LessonStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Award, Loader2, Mail, Pencil, Phone, UserCheck, UserX } from "lucide-react";
import React, { useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { showStatusToggleConfirmation } from "@/lib/toast-confirmations";
import { StudentPricingForm } from "../StudentPricingForm";
import { StudentNotes } from "./StudentNotes";

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
  User: User; // Use PascalCase to match Prisma relation
  phone: string | null;
  level: string;
  maxLessonsPerWeek: number;
  createdAt: string | Date;
  emergencyContact: EmergencyContact | null;
  notes: string | null;
  lessons: Lesson[];
  customPricingEnabled: boolean;
  privateLessonPrice: number | null;
  groupLessonPrice: number | null;
  choreographyPrice: number | null;
  competitionPrepPrice: number | null;
  isActive: boolean;
  deactivatedAt: string | Date | null;
}

interface StudentProfileProps {
  studentId: string;
  onEditAction: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ studentId, onEditAction }) => {
  const [activeTab, setActiveTab] = React.useState("overview");
  const queryClient = useQueryClient();

  // Get student data
  const { data: student, isLoading, error } = api.admin.student.getStudent.useQuery({ studentId });

  // Add queries for pricing data (only fetch when pricing tab is active)
  const { data: defaultPricing, isLoading: isDefaultPricingLoading } =
    api.admin.student.getDefaultPricing.useQuery(undefined, { enabled: activeTab === "pricing" });

  // Toggle status mutation
  const toggleStatusMutation = api.admin.student.toggleStatus.useMutation({
    onSuccess: (data) => {
      const isNowActive = data.isActive;
      toast.success(isNowActive ? "Student reactivated" : "Student deactivated", {
        description: `${data.User.name}'s account has been ${isNowActive ? "reactivated" : "deactivated"}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "student"] });
    },
    onError: (error) => {
      toast.error("Failed to update student status", {
        description: error.message,
      });
    },
  });

  // Handle toggle status
  const handleToggleStatus = () => {
    if (!student) {
      return;
    }
    const isActive = student.isActive ?? true;
    const studentName = student.User?.name || "Student";

    showStatusToggleConfirmation(isActive ? "deactivate" : "reactivate", studentName, () => {
      toggleStatusMutation.mutate({ studentId, active: !isActive });
    });
  };

  // Handle errors with useEffect
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
            <CardTitle className="text-2xl">{typedStudent.User?.name}</CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {typedStudent.User?.email}
              </div>
              {student.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {student.phone}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onEditAction} variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button
              onClick={handleToggleStatus}
              variant="outline"
              size="sm"
              disabled={toggleStatusMutation.isPending}
              className={
                (student.isActive ?? true)
                  ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  : "text-green-600 hover:text-green-700 hover:bg-green-50"
              }
            >
              {(student.isActive ?? true) ? (
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
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Level</p>
              <Badge className="mt-1">{student.level.replace("_", " ")}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium">Status</p>
              <Badge
                variant={(student.isActive ?? true) ? "default" : "secondary"}
                className="mt-1"
              >
                {(student.isActive ?? true) ? "Active" : "Inactive"}
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
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
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
              {student.Lesson && student.Lesson.length > 0 ? (
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
                    {student.Lesson.map((lesson) => (
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
                          {lesson.Payment ? (
                            <Badge
                              variant={
                                lesson.Payment.status === "COMPLETED" ? "default" : "outline"
                              }
                            >
                              {lesson.Payment.status}
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

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <StudentNotes studentId={student.id} />
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
              {student.Lesson?.some((lesson) => lesson.Payment) ? (
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
                    {student.Lesson.filter((lesson) => lesson.Payment).map((lesson) => (
                      <TableRow key={lesson.Payment?.id}>
                        <TableCell>
                          {format(new Date(lesson.Payment?.createdAt || lesson.startTime), "PP")}
                        </TableCell>
                        <TableCell>${lesson.Payment?.amount?.toFixed(2) || "0.00"}</TableCell>
                        <TableCell>{lesson.Payment?.method || "N/A"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={lesson.Payment?.status === "COMPLETED" ? "default" : "outline"}
                          >
                            {lesson.Payment?.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{lesson.Payment?.referenceCode || "N/A"}</TableCell>
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

        {/* Pricing Tab - Added */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Custom Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              {activeTab === "pricing" && isDefaultPricingLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading pricing data...</span>
                </div>
              ) : defaultPricing ? (
                <StudentPricingForm
                  studentId={studentId}
                  initialData={{
                    customPricingEnabled: typedStudent.customPricingEnabled || false,
                    privateLessonPrice: typedStudent.privateLessonPrice,
                    groupLessonPrice: typedStudent.groupLessonPrice,
                    choreographyPrice: typedStudent.choreographyPrice,
                    competitionPrepPrice: typedStudent.competitionPrepPrice,
                  }}
                  defaultPrices={{
                    privateLessonPrice: defaultPricing.privateLessonPrice || 75,
                    groupLessonPrice: defaultPricing.groupLessonPrice || 45,
                    choreographyPrice: defaultPricing.choreographyPrice || 90,
                    competitionPrice: defaultPricing.competitionPrice || 95,
                  }}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Failed to load pricing data
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
