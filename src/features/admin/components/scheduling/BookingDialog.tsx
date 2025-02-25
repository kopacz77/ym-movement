"use client";
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Use absolute paths (adjust as needed) to import the components.
import { BookingValidation } from '@/features/admin/components/scheduling/BookingValidation';
import { StudentSelector } from '@/features/admin/components/scheduling/StudentSelector';
import { BookingForm } from '@/features/admin/components/scheduling/BookingForm';
import { LessonType } from '@prisma/client';

// Note: We use "onCloseAction" instead of "onClose" to meet serialization requirements.
interface BookingDialogProps {
  slot: any; // Replace with your CalendarSlot type if available
  onCloseAction: () => void;
}

export const BookingDialog: React.FC<BookingDialogProps> = ({ slot, onCloseAction }) => {
  return (
    <Dialog open={true} onOpenChange={onCloseAction}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book Lesson</DialogTitle>
          <DialogDescription>Fill in the booking details below</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Render student selector */}
          <StudentSelector />
          {/* Render booking validations - fix: change prop name */}
          <BookingValidation
            slot={slot}
            studentId=""
            lessonType={LessonType.PRIVATE}
            onValidationCompleteAction={(isValid: boolean) => {
              // Optionally handle validation result.
            }}
          />
          {/* Render booking form */}
          <BookingForm slot={slot} open={true} onCloseAction={onCloseAction} />
        </div>
      </DialogContent>
    </Dialog>
  );
};