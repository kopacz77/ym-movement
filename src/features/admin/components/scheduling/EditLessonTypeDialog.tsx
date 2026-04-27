"use client";

import { LessonType } from "@prisma/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

interface EditLessonTypeDialogProps {
  lessonId: string;
  currentType: LessonType;
  currentPrice: number;
  currentNotes: string | null;
  studentId: string;
  studentName: string;
  durationMinutes: number;
  coachId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLessonTypeDialog({
  lessonId,
  currentType,
  currentPrice,
  currentNotes,
  studentId,
  studentName,
  durationMinutes,
  coachId,
  open,
  onOpenChange,
}: EditLessonTypeDialogProps) {
  const [lessonType, setLessonType] = useState<LessonType>(currentType);
  const [notes, setNotes] = useState(currentNotes || "");

  const utils = api.useUtils();

  // Reset form when dialog opens with new lesson data
  useEffect(() => {
    if (open) {
      setLessonType(currentType);
      setNotes(currentNotes || "");
    }
  }, [open, currentType, currentNotes]);

  // Fetch student pricing information
  // Server resolves the correct waterfall based on coach role:
  // - Admin coaches (Yura): student custom pricing wins
  // - Non-admin coaches (Renee): coach pricing wins
  const { data: studentPricing } = api.student.profile.getStudentPricing.useQuery(
    { studentId, coachId: coachId ?? undefined },
    { enabled: !!studentId && open },
  );

  const updateLessonType = api.admin.schedule.updateLessonType.useMutation({
    onSuccess: (updatedLesson) => {
      toast.success("Lesson Type Updated", {
        description: `Lesson updated to ${updatedLesson.type} for ${studentName}`,
      });
      // Invalidate relevant queries
      utils.admin.schedule.getTimeSlots.invalidate();
      utils.admin.schedule.getLessonsByDate.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Error Updating Lesson", {
        description: error.message,
      });
    },
  });

  const handleSubmit = () => {
    updateLessonType.mutate({
      lessonId,
      lessonType,
      notes: notes.trim() || undefined,
    });
  };

  // Get pro-rated price from server-resolved hourly rate
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
    return Math.round((hourlyRate / 60) * durationMinutes * 100) / 100;
  };

  const priceWillChange = lessonType !== currentType;
  const estimatedNewPrice = getProratedPrice(lessonType);
  const notesChanged = notes.trim() !== (currentNotes || "").trim();
  const hasChanges = lessonType !== currentType || notesChanged;

  // Format price for display (remove .00 if whole number)
  const formatPrice = (price: number) => {
    return price % 1 === 0 ? price.toString() : price.toFixed(2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Lesson Type</DialogTitle>
          <DialogDescription>
            Change the lesson type for {studentName}. This will update the pricing and Google
            Calendar event.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-type">Lesson Type</Label>
            <Select value={lessonType} onValueChange={(val) => setLessonType(val as LessonType)}>
              <SelectTrigger id="lesson-type">
                <SelectValue placeholder="Select lesson type" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
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

            {priceWillChange && (
              <p className="text-sm text-muted-foreground">
                Price will change from ${formatPrice(currentPrice)} to $
                {formatPrice(estimatedNewPrice)}
              </p>
            )}
            {studentPricing?.customPricingEnabled && (
              <p className="text-xs text-[#0891b2] font-medium">
                This student has custom pricing enabled
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this change..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateLessonType.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateLessonType.isPending || !hasChanges}>
            {updateLessonType.isPending ? "Updating..." : "Update Lesson Type"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
