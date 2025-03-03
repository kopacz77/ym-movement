// src/app/(protected)/student/dashboard/page.tsx
"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UpcomingLessons } from '@/features/student/components/dashboard/UpcomingLessons';
import { LessonSummary } from '@/features/student/components/dashboard/LessonSummary';
import Link from 'next/link';

// Temporarily using a static student ID
// In production, this would be taken from the authenticated user's session
const MOCK_STUDENT_ID = "student123";

export default function StudentDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Link href="/student/book">
          <Button>Book a Lesson</Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <UpcomingLessons studentId={MOCK_STUDENT_ID} />
        </div>
        <div className="md:col-span-4">
          <LessonSummary studentId={MOCK_STUDENT_ID} />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>
              We accept payments via Venmo and Zelle. Please make payments within 24 hours
              of booking your lesson to avoid automatic cancellation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium">Venmo</h3>
                <p className="text-sm mt-1">@yura-min</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-medium">Zelle</h3>
                <p className="text-sm mt-1">+1 (714) 743-7071</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}