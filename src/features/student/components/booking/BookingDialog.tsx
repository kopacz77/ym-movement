// src/features/student/components/booking/BookingDialog.tsx
"use client";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { Check, Clock, Calendar, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { LessonType, PaymentMethod } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { TRPCClientError } from '@trpc/client';

interface BookingDialogProps {
  slot: any;
  studentId: string;
  onCloseAction: () => void;
}

export const BookingDialog = ({ slot, studentId, onCloseAction }: BookingDialogProps) => {
  const [lessonType, setLessonType] = useState<LessonType>(LessonType.PRIVATE);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.VENMO);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const router = useRouter();
  
  const bookLesson = api.student.booking.bookLesson.useMutation({
    onSuccess: (data: any) => {
      toast({
        title: "Lesson booked successfully",
        description: "Your lesson has been scheduled.",
      });
      router.push(`/student/schedule/${data.lesson.id}`);
      onCloseAction();
    },
    onError: (error: TRPCClientError<any>) => {
      toast({
        title: "Error booking lesson",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  });
  
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
    };
    
    return prices[type];
  };
  
  return (
    <Dialog open={true} onOpenChange={onCloseAction}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Book a Lesson</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Time slot details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(slot.startTime), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(slot.startTime), 'h:mm a')} - 
                {format(new Date(slot.endTime), 'h:mm a')}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{slot.rink.name}</span>
            </div>
          </div>
          
          {/* Booking options */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lesson Type</label>
              <Select 
                value={lessonType} 
                onValueChange={(val) => setLessonType(val as LessonType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lesson type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LessonType.PRIVATE}>
                    Private Lesson - ${getLessonTypePrice(LessonType.PRIVATE)}
                  </SelectItem>
                  <SelectItem value={LessonType.GROUP}>
                    Group Lesson - ${getLessonTypePrice(LessonType.GROUP)}
                  </SelectItem>
                  <SelectItem value={LessonType.CHOREOGRAPHY}>
                    Choreography - ${getLessonTypePrice(LessonType.CHOREOGRAPHY)}
                  </SelectItem>
                  <SelectItem value={LessonType.COMPETITION_PREP}>
                    Competition Prep - ${getLessonTypePrice(LessonType.COMPETITION_PREP)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select 
                value={paymentMethod} 
                onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethod.VENMO}>Venmo</SelectItem>
                  <SelectItem value={PaymentMethod.ZELLE}>Zelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Notes (Optional)</label>
              <Textarea 
                placeholder="Any special requirements or notes for the instructor"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={onCloseAction}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBooking}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Booking..." : "Book Lesson"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};