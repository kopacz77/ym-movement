// src/app/(protected)/student/schedule/[lessonId]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { LessonStatus } from '@prisma/client';
import { CancellationDialog } from '@/features/student/components/schedule/CancellationDialog';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface LessonDetailsPageProps {
  params: { lessonId: string };
}

export default function LessonDetailsPage({ params }: LessonDetailsPageProps) {
  const { lessonId } = params;
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { id: studentId } = useCurrentUser();
  const [isReady, setIsReady] = useState(false);

  // Only fetch data when studentId is available
  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);

  // Get lesson details
  const { data: lessons, isLoading, error, refetch } = api.student.profile.getStudentLessons.useQuery(
    { studentId },
    { enabled: isReady && !!studentId, retry: false }
  );

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading lesson",
        description: error.message,
        variant: "destructive",
      });
      router.push('/student/schedule');
    }
  }, [error, toast, router]);

  // Check if the requested lesson belongs to this student
  useEffect(() => {
    if (lessons && !lessons.some(l => l.id === lessonId)) {
      toast({
        title: "Lesson not found",
        description: "The requested lesson was not found or does not belong to you.",
        variant: "destructive",
      });
      router.push('/student/schedule');
    }
  }, [lessons, lessonId, toast, router]);

  // Find the current lesson
  const currentLesson = lessons?.find(l => l.id === lessonId);

  // Convert to proper type if found
  const typedLesson = currentLesson ? {
    ...currentLesson,
    // Convert null to undefined for notes if needed
    notes: currentLesson.notes === null ? undefined : currentLesson.notes
  } : null;

  const canCancel = typedLesson && 
    new Date(typedLesson.startTime) > new Date() && 
    typedLesson.status === LessonStatus.SCHEDULED;

  // Function to handle post-cancellation refresh
  const handleCancellationComplete = () => {
    setIsCancelling(false);
    // Explicitly refetch the data to update the UI
    refetch();
  };

  if (!isReady || isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <p>Loading lesson details...</p>
      </div>
    );
  }

  if (!typedLesson) {
    return (
      <div className="flex justify-center items-center h-96">
        <p>Lesson not found</p>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (typedLesson.status) {
      case LessonStatus.SCHEDULED:
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case LessonStatus.COMPLETED:
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case LessonStatus.CANCELLED:
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge>{typedLesson.status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Lesson Details</h1>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {canCancel && (
            <Button 
              variant="outline" 
              onClick={() => setIsCancelling(true)}
            >
              Cancel Lesson
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lesson Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Lesson Type</h3>
                <p>{typedLesson.type.replace('_', ' ')}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Duration</h3>
                <p>{typedLesson.duration} minutes</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Date</h3>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(typedLesson.startTime), 'EEEE, MMMM d, yyyy')}</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Time</h3>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(typedLesson.startTime), 'h:mm a')} - {format(new Date(typedLesson.endTime), 'h:mm a')}
                </span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{typedLesson.rink.name}</span>
                <p className="text-sm text-muted-foreground">{typedLesson.rink.address}</p>
              </div>
            </div>
            {typedLesson.notes && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
                <p className="mt-1">{typedLesson.notes}</p>
              </div>
            )}
            {typedLesson.status === LessonStatus.CANCELLED && typedLesson.cancellationReason && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-md">
                <h3 className="text-sm font-medium text-red-800">Cancellation Reason</h3>
                <p className="text-sm text-red-700 mt-1">{typedLesson.cancellationReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {typedLesson.payment ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Amount</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>${typedLesson.payment.amount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                    <p className="mt-1">
                      {typedLesson.payment.status === 'COMPLETED' ? 'Paid' : 'Pending'}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Payment Method</h3>
                  <p className="mt-1">{typedLesson.payment.method}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Reference Code</h3>
                  <p className="mt-1">{typedLesson.payment.referenceCode}</p>
                </div>
                {typedLesson.payment.status !== 'COMPLETED' && (
                  <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-md">
                    <h3 className="font-medium text-yellow-800">Payment Instructions</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Please make your payment via {typedLesson.payment.method} using the reference code above. 
                      Include the reference code in your payment notes.
                    </p>
                    <div className="mt-2">
                      {typedLesson.payment.method === 'VENMO' && (
                        <p className="text-sm font-medium">Venmo: @yura-min</p>
                      )}
                      {typedLesson.payment.method === 'ZELLE' && (
                        <p className="text-sm font-medium">Zelle: +1 (714) 743-7071</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No payment information available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {isCancelling && (
        <CancellationDialog
          lessonId={lessonId}
          open={isCancelling}
          onCloseAction={handleCancellationComplete}
        />
      )}
    </div>
  );
}