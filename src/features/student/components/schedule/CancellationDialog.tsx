// src/features/student/components/schedule/CancellationDialog.tsx
"use client";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TRPCClientError } from '@trpc/client';

interface CancellationDialogProps {
  lessonId: string;
  open: boolean;
  onCloseAction: () => void;
}

export const CancellationDialog = ({ lessonId, open, onCloseAction }: CancellationDialogProps) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const router = useRouter();
  
  const cancelLesson = api.student.booking.cancelLesson.useMutation({
    onSuccess: () => {
      toast({
        title: "Lesson cancelled",
        description: "Your lesson has been cancelled successfully.",
      });
      router.push('/student/schedule');
      onCloseAction();
    },
    onError: (error: TRPCClientError<any>) => {
      toast({
        title: "Error cancelling lesson",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });
  
  const handleCancellation = () => {
    if (reason.trim() === "") {
      toast({
        title: "Cancellation reason required",
        description: "Please provide a reason for cancellation.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    cancelLesson.mutate({
      lessonId,
      reason,
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Lesson</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-4 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Cancellation Policy</p>
              <p className="text-sm text-yellow-700 mt-1">
                Lessons must be cancelled at least 24 hours in advance. Late cancellations
                may still be charged. Frequent cancellations may affect your booking privileges.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for Cancellation</label>
            <Textarea
              placeholder="Please provide a reason for cancelling this lesson"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onCloseAction}
              disabled={isSubmitting}
            >
              Go Back
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCancellation}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};