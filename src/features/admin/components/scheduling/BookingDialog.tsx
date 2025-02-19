import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookingValidation } from './BookingValidation';
import { StudentSelector } from './StudentSelector';

export const BookingDialog = ({ slot, onClose }: { slot: any; onClose: () => void }) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogTrigger asChild>
        <Button>Book Lesson</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book a Lesson</DialogTitle>
          <DialogDescription>
            Select a student and verify booking details
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <StudentSelector />
          <BookingValidation studentId="" timeSlotId="" validations={[
            { passed: true, message: "Student has available lesson slots" },
            { passed: true, message: "Time slot is available" },
            { passed: false, message: "Payment method required" }
          ]} />
          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>Confirm Booking</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
