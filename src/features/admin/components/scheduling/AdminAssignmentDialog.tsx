"use client";

import { LessonType } from "@prisma/client";
import { format } from "date-fns";
import { Calendar, Clock, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  startTime: Date;
  endTime: Date;
  coachId?: string | null;
  rink: {
    id: string;
    name: string;
  };
}

interface AdminAssignmentDialogProps {
  timeSlot: TimeSlot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminAssignmentDialog({
  timeSlot,
  open,
  onOpenChange,
}: AdminAssignmentDialogProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [lessonType, setLessonType] = useState<LessonType>(LessonType.PRIVATE);
  const [notes, setNotes] = useState("");

  const utils = api.useUtils();

  // Fetch students
  const { data: studentsData, isLoading: studentsLoading } = api.admin.student.getStudents.useQuery(
    {
      limit: 100,
      approved: true,
    },
  );

  // Get student pricing for selected student
  // Server resolves the correct waterfall based on coach role:
  // - Admin coaches (Yura): student custom pricing wins
  // - Non-admin coaches (Renee): coach pricing wins
  const { data: studentPricing } = api.student.profile.getStudentPricing.useQuery(
    { studentId: selectedStudentId, coachId: timeSlot.coachId ?? undefined },
    { enabled: !!selectedStudentId },
  );

  // Assign student mutation
  const assignStudent = api.admin.schedule.assignStudentToTimeSlot.useMutation({
    onSuccess: () => {
      const student = studentsData?.students?.find((s) => s.id === selectedStudentId);
      toast.success("Student Assigned", {
        description: `${student?.User?.name || "Student"} assigned to ${lessonType} lesson`,
      });
      // Invalidate relevant queries
      utils.admin.schedule.getTimeSlots.invalidate();
      utils.admin.schedule.getLessonsByDate.invalidate();
      onOpenChange(false);
      // Reset form
      setSelectedStudentId("");
      setLessonType(LessonType.PRIVATE);
      setNotes("");
    },
    onError: (error) => {
      toast.error("Error Assigning Student", {
        description: error.message,
      });
    },
  });

  const handleAssign = () => {
    if (!selectedStudentId) {
      toast.error("Please select a student");
      return;
    }

    assignStudent.mutate({
      timeSlotId: timeSlot.id,
      studentId: selectedStudentId,
      lessonType,
      notes: notes.trim() || undefined,
    });
  };

  const selectedStudent = studentsData?.students?.find((s) => s.id === selectedStudentId);

  // Calculate slot duration in minutes for pro-rated pricing
  const slotDurationMinutes = Math.max(
    1,
    Math.round((timeSlot.endTime.getTime() - timeSlot.startTime.getTime()) / 60000),
  );

  // Get pro-rated price from server-resolved hourly rate
  // Server already applied the correct waterfall (coach vs student priority)
  const getProratedPrice = (type: LessonType): number => {
    if (!studentPricing) {
      return 0;
    }
    let hourlyRate: number;
    switch (type) {
      case LessonType.PRIVATE:
        hourlyRate = studentPricing.privateLessonPrice;
        break;
      case LessonType.CHOREOGRAPHY:
        hourlyRate = studentPricing.choreographyPrice;
        break;
      case LessonType.GROUP:
        hourlyRate = studentPricing.groupLessonPrice;
        break;
      case LessonType.COMPETITION_PREP:
        hourlyRate = studentPricing.competitionPrepPrice;
        break;
      case LessonType.OFF_ICE_DANCE:
        hourlyRate = studentPricing.offIceDancePrice;
        break;
      default:
        hourlyRate = studentPricing.privateLessonPrice;
    }
    return Math.round(((hourlyRate / 60) * slotDurationMinutes) * 100) / 100;
  };

  // Format price for display (remove .00 if whole number)
  const formatPrice = (price: number) => {
    return price % 1 === 0 ? price.toString() : price.toFixed(2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Assign Student to Time Slot</DialogTitle>
          <DialogDescription>Select a student and lesson type for this time slot</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Time slot details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(timeSlot.startTime, "EEEE, MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(timeSlot.startTime, "h:mm a")} - {format(timeSlot.endTime, "h:mm a")} (
                {slotDurationMinutes} min)
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{timeSlot.rink.name}</span>
            </div>
          </div>

          {/* Student selection */}
          <div className="space-y-2">
            <Label htmlFor="student-select">Student</Label>
            <Select
              value={selectedStudentId}
              onValueChange={setSelectedStudentId}
              disabled={studentsLoading}
            >
              <SelectTrigger id="student-select">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {studentsLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading students...
                  </SelectItem>
                ) : (
                  studentsData?.students?.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.User?.name || "Unnamed Student"}
                      {student.User?.email && ` (${student.User.email})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Lesson type selection */}
          <div className="space-y-2">
            <Label htmlFor="lesson-type-select">Lesson Type</Label>
            <Select
              value={lessonType}
              onValueChange={(val) => setLessonType(val as LessonType)}
              disabled={!selectedStudentId}
            >
              <SelectTrigger id="lesson-type-select">
                <SelectValue placeholder="Select lesson type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LessonType.PRIVATE}>
                  Private Lesson - ${formatPrice(getProratedPrice(LessonType.PRIVATE))}
                </SelectItem>
                <SelectItem value={LessonType.CHOREOGRAPHY}>
                  Choreography - ${formatPrice(getProratedPrice(LessonType.CHOREOGRAPHY))}
                </SelectItem>
                <SelectItem value={LessonType.GROUP}>
                  Group Lesson - ${formatPrice(getProratedPrice(LessonType.GROUP))}
                </SelectItem>
                <SelectItem value={LessonType.COMPETITION_PREP}>
                  Competition Prep - ${formatPrice(getProratedPrice(LessonType.COMPETITION_PREP))}
                </SelectItem>
                <SelectItem value={LessonType.OFF_ICE_DANCE}>
                  Off-Ice Dance - ${formatPrice(getProratedPrice(LessonType.OFF_ICE_DANCE))}
                </SelectItem>
              </SelectContent>
            </Select>
            {selectedStudent?.customPricingEnabled && (
              <p className="text-sm text-muted-foreground">
                This student has custom pricing enabled
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="assignment-notes">Notes (Optional)</Label>
            <Textarea
              id="assignment-notes"
              placeholder="Add any notes for this lesson..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignStudent.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedStudentId || assignStudent.isPending}>
            {assignStudent.isPending ? "Assigning..." : "Assign Student"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
