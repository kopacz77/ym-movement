"use client";

import { LessonType, PaymentMethod } from "@prisma/client";
import { format } from "date-fns";
import { Calendar, Clock, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

// Format a UTC date string to display format
function formatTimeDisplay(dateStr: string) {
  const date = new Date(dateStr);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(
    2,
    "0",
  )}`;
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  rink: {
    name: string;
  };
}

interface BookingDialogProps {
  slot: TimeSlot;
  studentId: string;
  onCloseAction: () => void;
}

export const BookingDialog = ({ slot, studentId, onCloseAction }: BookingDialogProps) => {
  const [lessonType, setLessonType] = useState<LessonType>(LessonType.PRIVATE);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.VENMO);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const bookLesson = api.student.booking.bookLesson.useMutation();

  // Handle errors with useEffect
  useEffect(() => {
    if (bookLesson.error) {
      toast.error("Error booking lesson", {
        description: bookLesson.error.message,
      });
      setIsSubmitting(false);
    }
  }, [bookLesson.error]);

  // Handle success with useEffect
  useEffect(() => {
    if (bookLesson.isSuccess && bookLesson.data) {
      toast("Lesson booked successfully", {
        description: "Your lesson has been scheduled.",
      });
      router.push(`/student/schedule/${bookLesson.data.lesson.id}`);
      onCloseAction();
    }
  }, [bookLesson.isSuccess, bookLesson.data, router, onCloseAction]);

  const handleBooking = () => {
    setIsSubmitting(true);
    bookLesson.mutate({
      studentId,
      timeSlotId: slot.id,
      type: lessonType,
      paymentMethod,
      notes: notes.trim() || undefined,
    });
  };

  // Get lesson type price (in a real app, this would come from settings)
  const getLessonTypePrice = (type: LessonType) => {
    const prices = {
      PRIVATE: 75,
      GROUP: 45,
      CHOREOGRAPHY: 90,
      COMPETITION_PREP: 95,
      OFF_ICE_DANCE: 75,
    };
    return prices[type];
  };

  // Get formatted date from the slot
  const slotDate = new Date(slot.startTime);
  const dayStr = format(slotDate, "EEEE, MMMM d, yyyy");

  // Get formatted times (in UTC to match the stored time)
  const startTimeStr = formatTimeDisplay(slot.startTime);
  const endTimeStr = formatTimeDisplay(slot.endTime);

  return (
    <Dialog open={true} onOpenChange={onCloseAction}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book a Lesson</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          {/* Time slot details */}
          <div className="bg-gray-50 p-4 rounded-lg flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{dayStr}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {startTimeStr} - {endTimeStr}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{slot.rink.name}</span>
            </div>
          </div>

          {/* Booking options */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="lesson-type" className="text-sm font-medium">
                Lesson Type
              </label>
              <Select value={lessonType} onValueChange={(val) => setLessonType(val as LessonType)}>
                <SelectTrigger id="lesson-type" className="w-full">
                  <SelectValue placeholder="Select lesson type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LessonType.PRIVATE}>
                    Private Lesson - ${getLessonTypePrice(LessonType.PRIVATE)}
                  </SelectItem>
                  {/* Commenting out other options per request */}
                  {/*
                  <SelectItem value={LessonType.GROUP}>
                    Group Lesson - ${getLessonTypePrice(LessonType.GROUP)}
                  </SelectItem>
                  <SelectItem value={LessonType.COMPETITION_PREP}>
                    Competition Prep - ${getLessonTypePrice(LessonType.COMPETITION_PREP)}
                  </SelectItem>
                  */}
                  <SelectItem value={LessonType.CHOREOGRAPHY}>
                    Choreography - ${getLessonTypePrice(LessonType.CHOREOGRAPHY)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="payment-method" className="text-sm font-medium">
                Payment Method
              </label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
              >
                <SelectTrigger id="payment-method" className="w-full">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent className="min-w-[240px]">
                  <SelectItem value={PaymentMethod.VENMO}>Venmo</SelectItem>
                  <SelectItem value={PaymentMethod.ZELLE}>Zelle</SelectItem>
                  <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="lesson-notes" className="text-sm font-medium">
                Additional Notes (Optional)
              </label>
              <Textarea
                id="lesson-notes"
                placeholder="Any special requirements or notes for the instructor"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCloseAction} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleBooking} disabled={isSubmitting || bookLesson.isPending}>
              {isSubmitting || bookLesson.isPending ? "Booking..." : "Book Lesson"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
