// src/app/(protected)/student/schedule/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { LessonCard } from '@/features/student/components/schedule/LessonCard';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LessonWithDetails } from '@/features/student/types';

// Define an interface that matches the actual API response
interface LessonData {
  id: string;
  startTime: Date;
  endTime: Date;
  type: string;
  status: string;
  price: number;
  notes: string | null;
  rink: {
    id: string;
    name: string;
    address: string;
    timezone: string;
    maxCapacity: number | null;
    createdAt: Date;
    updatedAt: Date;
  };
  payment: {
    lessonId: string;
    id: string;
    status: string;
    amount: number;
    method: string;
    referenceCode: string;
    reminderSentAt: Date | null;
  } | null;
}

export default function StudentSchedulePage() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const { toast } = useToast();
  const { id: studentId } = useCurrentUser();

  // Get all student lessons
  const { data: lessons, isLoading, error } = api.student.profile.getStudentLessons.useQuery({
    studentId
  });

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading lessons",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Type-safe filtering using API response type
  const typedLessons = lessons as LessonData[] || [];

  // Filter lessons by status
  const upcomingLessons = typedLessons.filter(
    (lesson) => new Date(lesson.startTime) > new Date() && lesson.status === 'SCHEDULED'
  );
  
  const pastLessons = typedLessons.filter(
    (lesson) => new Date(lesson.startTime) <= new Date() || lesson.status !== 'SCHEDULED'
  );

  // Helper function to calculate duration in minutes and transform to the expected type
  const transformToLessonWithDetails = (lesson: LessonData): LessonWithDetails => {
    // Calculate duration in minutes
    const startTime = new Date(lesson.startTime);
    const endTime = new Date(lesson.endTime);
    const durationInMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    
    return {
      ...lesson,
      duration: durationInMinutes,
      notes: lesson.notes === null ? undefined : lesson.notes
    } as LessonWithDetails;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">My Schedule</h1>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcomingLessons.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastLessons.length})</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="upcoming" className="pt-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p>Loading lessons...</p>
            </div>
          ) : upcomingLessons.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">You don't have any upcoming lessons.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingLessons.map((lesson) => (
                <LessonCard 
                  key={lesson.id} 
                  lesson={transformToLessonWithDetails(lesson)} 
                />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="past" className="pt-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p>Loading lessons...</p>
            </div>
          ) : pastLessons.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">You don't have any past lessons.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastLessons.map((lesson) => (
                <LessonCard 
                  key={lesson.id} 
                  lesson={transformToLessonWithDetails(lesson)} 
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}