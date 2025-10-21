import { LessonType } from "@prisma/client";
import { Edit, X } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
// src/features/admin/components/scheduling/TimeSlotDialog.tsx
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatRinkTime } from "@/lib/timezone";
import { showDeleteConfirmation, showRemoveConfirmation } from "@/lib/toast-confirmations";
import { AdminAssignmentDialog } from "./AdminAssignmentDialog";
import { type Lesson, type TimeSlot } from "./calendarUtils";
import { EditLessonTypeDialog } from "./EditLessonTypeDialog";

// Define interfaces for the data structures
interface Rink {
  id: string;
  name: string;
  timezone: string;
}

interface Student {
  id: string;
  User: {
    name: string | null;
  };
}

// Lesson and TimeSlot interfaces now imported from calendarUtils

// Define our own event interface based on React Big Calendar's Event type
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  extendedProps: {
    Rink: Rink;
    currentStudents: number;
    maxStudents: number;
    Lesson: Lesson[];
  };
}

// Create a wrapper interface for Event Click in React Big Calendar
interface EventClickInfo {
  event: CalendarEvent;
}

interface TimeSlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  selectedEvent: EventClickInfo | null;
  selectedSlot: TimeSlot | null;
  students: Student[];
  onAssignStudent: (studentId: string) => void;
  onUnassignStudent: (lessonId: string) => void;
  isAssigning?: boolean;
  isUnassigning?: boolean;
}

export const TimeSlotDialog: FC<TimeSlotDialogProps> = ({
  isOpen,
  onClose,
  onEdit,
  onDelete,
  selectedEvent,
  selectedSlot,
  students,
  onAssignStudent,
  onUnassignStudent,
  isAssigning = false,
  isUnassigning = false,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [showAdminAssignmentDialog, setShowAdminAssignmentDialog] = useState(false);
  const [showEditLessonTypeDialog, setShowEditLessonTypeDialog] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Debug: Get student stats (currently unused but kept for future features)
  const { data: _studentStats } = api.admin.student.getStudentStats.useQuery(undefined, {
    enabled: isOpen, // Only fetch when dialog is open
  });

  // Reset selection when dialog opens/closes or when assignment completes
  useEffect(() => {
    if (!isOpen) {
      setSelectedStudentId("");
      setShowAdminAssignmentDialog(false);
      setShowEditLessonTypeDialog(false);
      setSelectedLesson(null);
    }
  }, [isOpen]);

  // Reset selection after successful assignment (when isAssigning changes from true to false)
  const [wasAssigning, setWasAssigning] = useState(false);

  useEffect(() => {
    if (wasAssigning && !isAssigning) {
      // Assignment just completed, reset selection
      setSelectedStudentId("");
    }
    setWasAssigning(isAssigning);
  }, [isAssigning, wasAssigning]);

  // Convert slot to format needed by AdminAssignmentDialog
  const timeSlotForAssignment = selectedSlot
    ? {
        id: selectedSlot.id,
        startTime: new Date(selectedSlot.startTime),
        endTime: new Date(selectedSlot.endTime),
        rink: {
          id: selectedSlot.Rink.id,
          name: selectedSlot.Rink.name,
        },
      }
    : selectedEvent
      ? {
          id: selectedEvent.event.id,
          startTime: selectedEvent.event.start,
          endTime: selectedEvent.event.end,
          rink: {
            id: selectedEvent.event.extendedProps.Rink.id,
            name: selectedEvent.event.extendedProps.Rink.name,
          },
        }
      : null;

  const formatLessonType = (type: LessonType | undefined) => {
    if (!type) return "Private"; // Default fallback
    return type.replace(/_/g, " ");
  };

  const getLessonTypeBadgeColor = (type: LessonType | undefined) => {
    if (!type) return "bg-blue-100 text-blue-700 border-blue-300"; // Default to private styling

    switch (type) {
      case LessonType.CHOREOGRAPHY:
        return "bg-purple-100 text-purple-700 border-purple-300";
      case LessonType.PRIVATE:
        return "bg-blue-100 text-blue-700 border-blue-300";
      case LessonType.GROUP:
        return "bg-green-100 text-green-700 border-green-300";
      case LessonType.COMPETITION_PREP:
        return "bg-orange-100 text-orange-700 border-orange-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Time Slot</DialogTitle>
          <DialogDescription>
            View and manage time slot details, assign or remove students, and edit or delete the
            slot.
          </DialogDescription>
        </DialogHeader>
        {(selectedEvent || selectedSlot) && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Start Time</p>
                {selectedEvent ? (
                  <div className="flex items-center gap-1">
                    <span>
                      {selectedEvent.event.start &&
                        selectedEvent.event.extendedProps.Rink?.timezone &&
                        formatRinkTime(
                          selectedEvent.event.start,
                          selectedEvent.event.extendedProps.Rink.timezone,
                        )}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {selectedEvent.event.extendedProps.Rink?.timezone
                        ?.split("/")
                        ?.pop()
                        ?.replace("_", " ")}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span>
                      {selectedSlot?.Rink?.timezone &&
                        formatRinkTime(selectedSlot.startTime, selectedSlot.Rink.timezone)}
                    </span>
                    <Badge variant="outline" className="text-xs" suppressHydrationWarning>
                      {selectedSlot?.Rink?.timezone?.split("/")?.pop()?.replace("_", " ")}
                    </Badge>
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium">End Time</p>
                {selectedEvent ? (
                  <p>
                    {selectedEvent.event.end &&
                      selectedEvent.event.extendedProps.Rink?.timezone &&
                      formatRinkTime(
                        selectedEvent.event.end,
                        selectedEvent.event.extendedProps.Rink.timezone,
                      )}
                  </p>
                ) : (
                  <p>
                    {selectedSlot?.Rink?.timezone &&
                      formatRinkTime(selectedSlot.endTime, selectedSlot.Rink.timezone)}
                  </p>
                )}
              </div>
              <div>
                <p className="font-medium">Students</p>
                <p>
                  {selectedEvent
                    ? `${selectedEvent.event.extendedProps.currentStudents} / ${selectedEvent.event.extendedProps.maxStudents}`
                    : selectedSlot &&
                      `${selectedSlot.Lesson?.length || 0} / ${selectedSlot.maxStudents}`}
                </p>
              </div>
              <div>
                <p className="font-medium">Rink</p>
                <p>
                  {selectedEvent
                    ? selectedEvent.event.extendedProps.Rink?.name
                    : selectedSlot?.Rink?.name}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="mb-2">
                <p className="font-medium">Assign Student</p>
              </div>
              <Button
                onClick={() => setShowAdminAssignmentDialog(true)}
                variant="outline"
                className="w-full"
              >
                Assign Student with Lesson Type
              </Button>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Assigned Students</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(() => {
                  const rawLessons = selectedEvent
                    ? selectedEvent.event.extendedProps.Lesson
                    : selectedSlot?.Lesson;

                  const lessons = rawLessons?.filter((lesson) => lesson?.id && lesson?.Student) || [];

                  return lessons.length > 0 ? (
                    lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-start justify-between p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="font-medium">
                            {lesson.Student?.User?.name || "Unnamed Student"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={getLessonTypeBadgeColor(lesson.type)}
                            >
                              {formatLessonType(lesson.type)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              ${lesson.price?.toFixed(2) || "0.00"}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedLesson(lesson);
                              setShowEditLessonTypeDialog(true);
                            }}
                            title="Edit lesson type"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isUnassigning}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              showRemoveConfirmation("student from time slot", () => {
                                onUnassignStudent(lesson.id);
                              });
                            }}
                            title="Remove student"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                      No students assigned to this time slot
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-end gap-2 pt-4">
              <Button variant="outline" className="w-full md:w-auto" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="outline"
                className="w-full md:w-auto"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("Edit button clicked in TimeSlotDialog");
                  onEdit();
                }}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                className="w-full md:w-auto"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("Delete button clicked in TimeSlotDialog");
                  showDeleteConfirmation(
                    "time slot",
                    () => {
                      console.log("Delete action confirmed, calling onDelete");
                      onDelete();
                    },
                    () => {
                      console.log("Delete cancelled");
                    },
                  );
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Admin Assignment Dialog with Lesson Type */}
      {timeSlotForAssignment && (
        <AdminAssignmentDialog
          timeSlot={timeSlotForAssignment}
          open={showAdminAssignmentDialog}
          onOpenChange={setShowAdminAssignmentDialog}
        />
      )}

      {/* Edit Lesson Type Dialog */}
      {selectedLesson && (
        <EditLessonTypeDialog
          lessonId={selectedLesson.id}
          currentType={selectedLesson.type || LessonType.PRIVATE}
          currentPrice={selectedLesson.price || 0}
          studentId={selectedLesson.Student.id}
          studentName={selectedLesson.Student?.User?.name || "Student"}
          open={showEditLessonTypeDialog}
          onOpenChange={setShowEditLessonTypeDialog}
        />
      )}
    </Dialog>
  );
};
