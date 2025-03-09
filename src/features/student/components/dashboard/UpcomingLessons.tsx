"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from "sonner";
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export const UpcomingLessons = () => {
  const { id: studentId } = useCurrentUser();
  const [isReady, setIsReady] = useState(false);
  
  // Only fetch data when studentId is available
  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);
  
  // Use useMemo to create a stable date reference
  const currentDate = useMemo(() => new Date(), []);
  
  // Fetch upcoming lessons for the student
  const { data: lessons, isLoading, error } = api.student.profile.getStudentLessons.useQuery(
    { 
      studentId, 
      status: 'SCHEDULED', 
      startDate: currentDate 
    }, 
    { 
      enabled: isReady && !!studentId, 
      retry: false 
    }
  );
  
  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error("Error loading lessons", {
        description: error.message
      });
    }
  }, [error, toast]);
  
  // Only show the next 3 lessons
  const upcomingLessons = lessons?.slice(0, 3);
  
  // Show loading state when either:
  // 1. We don't have a studentId yet
  // 2. We're fetching the data
  const showLoading = !isReady || isLoading || !studentId;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Upcoming Lessons</CardTitle>
        <Link href="/student/schedule">
          <Button variant="ghost" size="sm">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {showLoading ? (
          <div className="flex justify-center items-center h-48">
            <p>Loading lessons...</p>
          </div>
        ) : !upcomingLessons?.length ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-muted-foreground mb-4">You don&apos;t have any upcoming lessons</p>
            <Link href="/student/book">
              <Button>Book a Lesson</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingLessons.map((lesson) => (
              <div key={lesson.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{lesson.type.replace('_', ' ')} Lesson</h3>
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {format(new Date(lesson.startTime), 'EEE, MMM d')}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(lesson.startTime), 'h:mm a')} - {format(new Date(lesson.endTime), 'h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{lesson.rink.name}</span>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Link href={`/student/schedule/${lesson.id}`}>
                    <Button variant="outline" size="sm">View Details</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
