// src/app/(protected)/student/schedule/[lessonId]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { Loader2, Calendar, Clock, MapPin, CreditCard, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PaymentMethod, LessonStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TRPCClientError } from '@trpc/client';
import { Textarea } from '@/components/ui/textarea';

export default function LessonDetailsPage({ params }: { params: { lessonId: string } }) {
  const lessonId = params.lessonId;
  const [lessonData, setLessonData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  // Use the new API path for getting a lesson
  const { data, isLoading: apiLoading, error: apiError } = api.student.lessons.getLesson.useQuery(
    { id: lessonId },
    {
      enabled: !!lessonId,
      refetchOnWindowFocus: false,
      retry: 1 // Only retry once
    }
  );

  // Use the new API path for canceling a lesson
  const cancelLesson = api.student.lessons.cancelLesson.useMutation({
    onSuccess: () => {
      setIsCancelDialogOpen(false);
      toast({
        title: 'Lesson cancelled',
        description: 'Your lesson has been successfully cancelled.',
      });
      router.push('/student/schedule');
    },
    onError: (error) => { // Remove the explicit type here
      toast({
        title: 'Error cancelling lesson',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  });

  useEffect(() => {
    if (data) {
      setLessonData(data);
      setIsLoading(false);
    }
    if (apiError) {
      setError(apiError instanceof Error ? apiError.message : 'Failed to load lesson details');
      setIsLoading(false);
    }
  }, [data, apiError]);

  const handleCancelClick = () => {
    setIsCancelDialogOpen(true);
  };

  const handleCancellationSubmit = () => {
    cancelLesson.mutate({
      lessonId,
      reason: cancellationReason || 'No reason provided'
    });
  };

  // Simple Cancel Lesson Dialog implementation
  const CancelLessonDialog = () => (
    <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Lesson</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4">Are you sure you want to cancel this lesson? This action cannot be undone.</p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for cancellation (optional)</label>
            <Textarea 
              placeholder="Please provide a reason for cancellation" 
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
            Keep Lesson
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCancellationSubmit}
            disabled={cancelLesson.isPending} 
          >
            {cancelLesson.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isLoading || apiLoading) {
    return (
      <div className="flex justify-center items-center h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Lesson</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push('/student/schedule')}>
          Back to Schedule
        </Button>
      </div>
    );
  }

  if (!lessonData) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-center">
        <AlertCircle className="h-12 w-12 text-warning mb-4" />
        <h2 className="text-xl font-bold mb-2">Lesson Not Found</h2>
        <p className="text-muted-foreground mb-4">The requested lesson could not be found.</p>
        <Button onClick={() => router.push('/student/schedule')}>
          Back to Schedule
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: LessonStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge className="bg-green-500">Scheduled</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Payment Pending</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Payment Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Lesson Details</h1>
        <div className="flex space-x-2">
          {lessonData.status === 'SCHEDULED' && (
            <Button variant="destructive" onClick={handleCancelClick}>
              Cancel Lesson
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push('/student/schedule')}>
            Back to Schedule
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Lesson Information</span>
              {getStatusBadge(lessonData.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Date</p>
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <p>{format(new Date(lessonData.startTime), 'MMMM d, yyyy')}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Time</p>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <p>
                    {format(new Date(lessonData.startTime), 'h:mm a')} - {format(new Date(lessonData.endTime), 'h:mm a')}
                  </p>
                </div>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-sm text-muted-foreground">Location</p>
                <div className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                  <p>{lessonData.rink?.name || 'No location specified'}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Type</p>
                <p>{lessonData.type || 'Not specified'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Duration</p>
                <p>{lessonData.duration} minutes</p>
              </div>
            </div>
            {lessonData.notes && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p>{lessonData.notes}</p>
              </div>
            )}
            {lessonData.status === 'CANCELLED' && lessonData.cancellationReason && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-sm text-muted-foreground">Cancellation Reason</p>
                <p>{lessonData.cancellationReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Payment Information</span>
              {lessonData.payment && getPaymentStatusBadge(lessonData.payment.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lessonData.payment ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p>${lessonData.payment.amount.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Method</p>
                    <p>{lessonData.payment.method}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground">Reference Code</p>
                    <p className="font-mono">{lessonData.payment.referenceCode}</p>
                  </div>
                </div>
                {lessonData.payment.status === 'PENDING' && (
                  <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">Payment Pending</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Please complete your payment using {lessonData.payment.method === PaymentMethod.VENMO ? 'Venmo' : 'Zelle'}.
                          Include your reference code ({lessonData.payment.referenceCode}) when making the payment.
                        </p>
                        <div className="mt-3">
                          <Badge variant="outline" className="font-medium text-amber-700 border-amber-300 bg-amber-50">
                            {lessonData.payment.method === PaymentMethod.VENMO ? '@yura-min' : 'Zelle: 714-743-7071'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No payment information available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inline cancel dialog */}
      {isCancelDialogOpen && <CancelLessonDialog />}
    </div>
  );
}