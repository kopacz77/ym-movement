// Updated BookingDialog.tsx with fixes for both errors

import { LessonType, PaymentMethod } from "@prisma/client";
import { format } from "date-fns";
import { Calendar, Clock, DollarSign, MapPin } from "lucide-react";
import { DateTime } from "luxon";
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

interface TimeSlot {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  rink: {
    id: string;
    name: string;
  };
}

interface BookingDialogProps {
  slot: TimeSlot;
  studentId: string;
  rinkTimezone: string; // ADDED: Timezone for proper time formatting
  onCloseAction: () => void;
}

export function BookingDialog({
  slot,
  studentId,
  rinkTimezone,
  onCloseAction,
}: BookingDialogProps) {
  const [lessonType, setLessonType] = useState<LessonType>(LessonType.PRIVATE);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.VENMO);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Fix Error 1: Use only the pricing endpoint and remove the unused studentProfile
  const { data: studentPricing } = api.student.profile.getStudentPricing.useQuery(
    { studentId },
    { enabled: !!studentId },
  );

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

  // Calculate slot duration in minutes
  const getSlotDurationMinutes = () => {
    const start =
      typeof slot.startTime === "string" ? new Date(slot.startTime) : slot.startTime;
    const end = typeof slot.endTime === "string" ? new Date(slot.endTime) : slot.endTime;
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  };

  const slotDurationMinutes = getSlotDurationMinutes();

  // Get hourly rate based on student's custom pricing if available
  const getHourlyRate = (type: LessonType) => {
    // Default hourly prices if no student profile is loaded yet
    const defaultPrices = {
      PRIVATE: 75,
      GROUP: 45,
      CHOREOGRAPHY: 90,
      COMPETITION_PREP: 95,
    };

    // If we have student pricing data with custom pricing
    if (studentPricing?.customPricingEnabled) {
      switch (type) {
        case LessonType.PRIVATE:
          return studentPricing.privateLessonPrice ?? defaultPrices.PRIVATE;
        case LessonType.CHOREOGRAPHY:
          return studentPricing.choreographyPrice ?? defaultPrices.CHOREOGRAPHY;
        default:
          return defaultPrices[type];
      }
    }

    return defaultPrices[type];
  };

  // Calculate pro-rated price based on slot duration
  const getLessonTypePrice = (type: LessonType) => {
    const hourlyRate = getHourlyRate(type);
    // Pro-rate: (hourlyRate / 60) * durationMinutes
    const proratedPrice = (hourlyRate / 60) * slotDurationMinutes;
    // Round to 2 decimal places
    return Math.round(proratedPrice * 100) / 100;
  };

  // Format price for display (remove .00 if whole number)
  const formatPrice = (price: number) => {
    return price % 1 === 0 ? price.toString() : price.toFixed(2);
  };

  // Convert UTC time to AM/PM format in the rink's timezone
  const formatAMPM = (dateStr: string | Date) => {
    try {
      const dateTime =
        typeof dateStr === "string"
          ? DateTime.fromISO(dateStr, { zone: "utc" }).setZone(rinkTimezone)
          : DateTime.fromJSDate(dateStr, { zone: "utc" }).setZone(rinkTimezone);

      if (!dateTime.isValid) {
        console.error("Invalid date in BookingDialog formatAMPM:", dateStr);
        return "Invalid time";
      }

      return dateTime.toFormat("h:mm a");
    } catch (error) {
      console.error("Error formatting time in BookingDialog:", error);
      return "Invalid time";
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCloseAction}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book a Lesson</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          {/* Time slot details */}
          <div className="bg-muted/50 p-4 rounded-lg flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(slot.startTime), "EEEE, MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatAMPM(slot.startTime)} - {formatAMPM(slot.endTime)} ({slotDurationMinutes} min)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{slot.rink.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Price: ${formatPrice(getLessonTypePrice(lessonType))}
              </span>
            </div>
          </div>

          {/* Booking options */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="lesson-type-select" className="text-sm font-medium">
                Lesson Type
              </label>
              <Select value={lessonType} onValueChange={(val) => setLessonType(val as LessonType)}>
                <SelectTrigger id="lesson-type-select" className="w-full">
                  <SelectValue placeholder="Select lesson type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LessonType.PRIVATE}>
                    Private Lesson - ${formatPrice(getLessonTypePrice(LessonType.PRIVATE))}
                  </SelectItem>
                  <SelectItem value={LessonType.CHOREOGRAPHY}>
                    Choreography - ${formatPrice(getLessonTypePrice(LessonType.CHOREOGRAPHY))}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="payment-method-select" className="text-sm font-medium">
                Payment Method
              </label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
              >
                <SelectTrigger id="payment-method-select" className="w-full">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethod.VENMO}>Venmo</SelectItem>
                  <SelectItem value={PaymentMethod.ZELLE}>Zelle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="booking-notes" className="text-sm font-medium">
                Additional Notes (Optional)
              </label>
              <Textarea
                id="booking-notes"
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
}
