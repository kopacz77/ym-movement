// app/(protected)/student/schedule/client.tsx
"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { LessonCard } from '@/features/student/components/schedule/LessonCard';
import { api } from '@/lib/api';
import { toast } from "sonner";
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Define the type that exactly matches what LessonCard expects
type LessonStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
type LessonType = 'PRIVATE' | 'GROUP' | 'CHOREOGRAPHY' | 'COMPETITION_PREP';
type RinkArea = 'MAIN_RINK' | 'PRACTICE_RINK' | 'DANCE_STUDIO';

// This is the raw data shape from the API
interface Lesson {
  id: string;
  studentId: string;
  rinkId: string;
  startTime: string | Date;
  endTime: string | Date;
  type: LessonType;
  area: RinkArea;
  status: LessonStatus;
  notes: string | null;
  price: number;
  rink: {
    name: string;
    address: string;
  };
  cancellationReason?: string;
  cancellationTime?: string | Date;
  [key: string]: any;
}

// This is what LessonCard expects - note the Date objects and optional notes
interface LessonWithDetails {
  id: string;
  studentId: string;
  rinkId: string;
  startTime: Date; // Must be Date object
  endTime: Date;   // Must be Date object
  duration: number;
  type: LessonType;
  area: RinkArea;
  status: LessonStatus;
  notes?: string;  // Optional string, not nullable
  price: number;
  rink: {
    name: string;
    address: string;
  };
  cancellationReason?: string;
  cancellationTime?: Date;
}

export default function StudentScheduleClient() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const { id: studentId } = useCurrentUser();
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);

  const { 
    data: lessons = [], 
    isLoading, 
    error 
  } = api.student.profile.getStudentLessons.useQuery(
    { studentId: studentId || '' }, 
    { 
      enabled: isReady && Boolean(studentId),
      retry: false
    }
  );

  useEffect(() => {
    if (error) {
      toast.error("Error loading lessons", {
        description: error.message || "Failed to load lessons"
      });
    }
  }, [error, toast]);

  // Cast the raw API data to our Lesson type
  const typedLessons = (lessons || []) as Lesson[];

  // Filter lessons by status
  const upcomingLessons = typedLessons.filter(
    (lesson) => new Date(lesson.startTime) > new Date() && lesson.status === 'SCHEDULED'
  );
  
  const pastLessons = typedLessons.filter(
    (lesson) => new Date(lesson.startTime) <= new Date() || lesson.status !== 'SCHEDULED'
  );

  // Convert the API Lesson to the expected LessonWithDetails format
  const transformToLessonWithDetails = (lesson: Lesson): LessonWithDetails => {
    // Create proper Date objects
    const startTime = new Date(lesson.startTime);
    const endTime = new Date(lesson.endTime);
    const durationInMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    
    // Create a new object with the correct types, explicitly mapping each property
    const result: LessonWithDetails = {
      id: lesson.id,
      studentId: lesson.studentId,
      rinkId: lesson.rinkId,
      startTime, // Date object
      endTime,   // Date object
      duration: durationInMinutes,
      type: lesson.type,
      area: lesson.area,
      status: lesson.status,
      price: lesson.price,
      rink: lesson.rink,
    };
    
    // Add optional properties only if they exist and aren't null
    if (lesson.notes !== null && lesson.notes !== undefined) {
      result.notes = lesson.notes;
    }
    
    if (lesson.cancellationReason) {
      result.cancellationReason = lesson.cancellationReason;
    }
    
    if (lesson.cancellationTime) {
      result.cancellationTime = new Date(lesson.cancellationTime);
    }
    
    return result;
  };

  const showLoading = !isReady || isLoading || !studentId;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">My Schedule</h1>
      </div>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upcoming' | 'past')}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcomingLessons.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastLessons.length})</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="upcoming" className="pt-4">
          {showLoading ? (
            <div className="flex justify-center items-center h-32">
              <p>Loading lessons...</p>
            </div>
          ) : upcomingLessons.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">You don&apos;t have any upcoming lessons.</p>
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
          {showLoading ? (
            <div className="flex justify-center items-center h-32">
              <p>Loading lessons...</p>
            </div>
          ) : pastLessons.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">You don&apos;t have any past lessons.</p>
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