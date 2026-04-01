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
import { getLessonTypePrice } from "@/lib/pricing-utils";

interface EditLessonTypeDialogProps {
  lessonId: string;
  currentType: LessonType;
  currentPrice: number;
  currentNotes: string | null;
  studentId: string;
  studentName: string;
  durationMinutes: number;
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
  const { data: studentPricing } = api.student.profile.getStudentPricing.useQuery(
    { studentId },
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

  const priceWillChange = lessonType !== currentType;
  const estimatedNewPrice = getLessonTypePrice(lessonType, studentPricing, durationMinutes);
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
                  Private Lesson - $
                  {formatPrice(
                    getLessonTypePrice(LessonType.PRIVATE, studentPricing, durationMinutes),
                  )}
                </SelectItem>
                <SelectItem value={LessonType.CHOREOGRAPHY}>
                  Choreography - $
                  {formatPrice(
                    getLessonTypePrice(LessonType.CHOREOGRAPHY, studentPricing, durationMinutes),
                  )}
                </SelectItem>
                <SelectItem value={LessonType.GROUP}>
                  Group Lesson - $
                  {formatPrice(
                    getLessonTypePrice(LessonType.GROUP, studentPricing, durationMinutes),
                  )}
                </SelectItem>
                <SelectItem value={LessonType.COMPETITION_PREP}>
                  Competition Prep - $
                  {formatPrice(
                    getLessonTypePrice(
                      LessonType.COMPETITION_PREP,
                      studentPricing,
                      durationMinutes,
                    ),
                  )}
                </SelectItem>
                <SelectItem value={LessonType.OFF_ICE_DANCE}>
                  Off-Ice Dance - $
                  {formatPrice(
                    getLessonTypePrice(
                      LessonType.OFF_ICE_DANCE,
                      studentPricing,
                      durationMinutes,
                    ),
                  )}
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
              <p className="text-xs text-blue-600 font-medium">
                ✓ This student has custom pricing enabled
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
