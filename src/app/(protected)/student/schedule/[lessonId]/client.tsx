"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CancellationDialog } from "@/features/student/components/schedule/CancellationDialog";

interface LessonCancelActionProps {
  lessonId: string;
  lessonPrice: number;
  lessonStartTime: string; // ISO string from server
  lessonStatus: string;
}

export function LessonCancelAction({
  lessonId,
  lessonPrice,
  lessonStartTime,
  lessonStatus,
}: LessonCancelActionProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Only show cancel button for scheduled lessons that haven't started
  if (lessonStatus !== "SCHEDULED") {
    return null;
  }
  const startTime = new Date(lessonStartTime);
  if (startTime < new Date()) {
    return null;
  }

  const hoursUntilLesson = (startTime.getTime() - Date.now()) / (1000 * 60 * 60);
  const isLateCancellation = hoursUntilLesson < 24;

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setCancelDialogOpen(true)}>
        Cancel Lesson
      </Button>

      <CancellationDialog
        lessonId={lessonId}
        open={cancelDialogOpen}
        onCloseAction={() => setCancelDialogOpen(false)}
        isLateCancellation={isLateCancellation}
        lessonPrice={lessonPrice}
      />
    </>
  );
}
