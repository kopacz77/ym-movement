// features/admin/components/students/profile/StudentProfile.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Pencil, Mail, Phone } from 'lucide-react';
import { StudentForm } from './StudentForm';
import { format } from 'date-fns';
import { Student, StudentStats } from '../types';

interface StudentProfileProps {
  studentId: string;
  onEditAction: () => void; // renamed to follow convention
}

export const StudentProfile: React.FC<StudentProfileProps> = ({
  studentId,
  onEditAction, // Fixed: renamed to match the interface
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState('overview');

  // Use student namespace for this API call
  // Fixed: removed onError and will handle errors with useEffect
  const { data: student, isLoading, error } = api.admin.student.getStudent.useQuery(
    { studentId }
  );

  // Added: Handle errors with useEffect
  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error loading student profile",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{(student as any).user?.name}</CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {/* Fixed: Access user.email with type assertion */}
                {(student as any).user?.email}
              </div>
              {student.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {student.phone}
                </div>
              )}
            </div>
          </div>
          {/* Fixed: Use onEditAction instead of onEdit */}
          <Button onClick={onEditAction} variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" /> Edit Profile
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Level</p>
              <Badge className="mt-1">{student.level.replace('_', ' ')}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium">Status</p>
              <Badge variant={(student as any).active ? 'default' : 'secondary'} className="mt-1">
                {(student as any).active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium">Max Lessons Per Week</p>
              <p className="mt-1">{student.maxLessonsPerWeek}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Member Since</p>
              <p className="mt-1">{format(new Date(student.createdAt), 'PP')}</p>
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
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              {typeof student.emergencyContact === 'object' && student.emergencyContact && (
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Name:</span> {(student.emergencyContact as any).name}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span> {(student.emergencyContact as any).phone}
                  </p>
                  <p>
                    <span className="font-medium">Relationship:</span> {(student.emergencyContact as any).relationship}
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
        <TabsContent value="lessons">
          {/* Lesson history will go here */}
        </TabsContent>
        <TabsContent value="progress">
          {/* Progress tracking will go here */}
        </TabsContent>
        <TabsContent value="payments">
          {/* Payment history will go here */}
        </TabsContent>
      </Tabs>
    </div>
  );
};