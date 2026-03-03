// src/features/student/components/schedule/CancellationDialog.tsx
"use client";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

interface CancellationDialogProps {
  lessonId: string;
  open: boolean;
  onCloseAction: () => void;
  isLateCancellation?: boolean;
  lessonPrice?: number;
}

export function CancellationDialog({
  lessonId,
  open,
  onCloseAction,
  isLateCancellation = false,
  lessonPrice = 0,
}: CancellationDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feeAcknowledged, setFeeAcknowledged] = useState(false);
  const router = useRouter();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setReason("");
      setFeeAcknowledged(false);
      setIsSubmitting(false);
    }
  }, [open]);

  // Create mutation without onSuccess/onError callbacks
  const cancelLesson = api.student.booking.cancelLesson.useMutation();

  // Handle success and error states with useEffect
  useEffect(() => {
    if (cancelLesson.isSuccess) {
      toast("Lesson cancelled", {
        description: "Your lesson has been cancelled successfully.",
      });
      // Call the onCloseAction callback to trigger a refetch in the parent component
      onCloseAction();
      // Refresh the schedule page data
      router.refresh();
    }
  }, [cancelLesson.isSuccess, router, onCloseAction]);

  useEffect(() => {
    if (cancelLesson.error) {
      toast.error("Error cancelling lesson", {
        description: cancelLesson.error.message,
      });
      setIsSubmitting(false);
    }
  }, [cancelLesson.error]);

  const handleCancellation = () => {
    if (reason.trim() === "") {
      toast.error("Cancellation reason required", {
        description: "Please provide a reason for cancellation.",
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
          {isLateCancellation ? (
            <div className="flex items-start gap-2 p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="font-semibold text-red-800">
                  Late Cancellation — You Will Be Charged
                </p>
                <p className="text-sm text-red-700">
                  This lesson is within 24 hours. Per our cancellation policy, you are responsible
                  for the full lesson fee of{" "}
                  <span className="font-semibold">${lessonPrice.toFixed(2)}</span>.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-4 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Cancellation Policy</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Lessons must be cancelled at least 24 hours in advance. Late cancellations may
                  still be charged. Frequent cancellations may affect your booking privileges.
                </p>
              </div>
            </div>
          )}

          {isLateCancellation && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="fee-acknowledged"
                checked={feeAcknowledged}
                onCheckedChange={(checked) => setFeeAcknowledged(checked === true)}
              />
              <label
                htmlFor="fee-acknowledged"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                I understand I am responsible for the lesson fee of ${lessonPrice.toFixed(2)}
              </label>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="cancellation-reason" className="text-sm font-medium">
              Reason for Cancellation
            </label>
            <Textarea
              id="cancellation-reason"
              placeholder="Please provide a reason for cancelling this lesson"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onCloseAction}
              disabled={isSubmitting || cancelLesson.isPending}
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancellation}
              disabled={
                isSubmitting || cancelLesson.isPending || (isLateCancellation && !feeAcknowledged)
              }
            >
              {isSubmitting || cancelLesson.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
