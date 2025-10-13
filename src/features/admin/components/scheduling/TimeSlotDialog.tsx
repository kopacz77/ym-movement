import { X } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { toast } from "sonner";
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

interface Lesson {
  id: string;
  Student: Student;
  // Add other properties if needed
}

interface TimeSlot {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  maxStudents: number;
  Lesson?: Lesson[];
  Rink: Rink;
}

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

  // Debug: Get student stats
  const { data: studentStats } = api.admin.student.getStudentStats.useQuery(undefined, {
    enabled: isOpen, // Only fetch when dialog is open
  });

  // Reset selection when dialog opens/closes or when assignment completes
  useEffect(() => {
    if (!isOpen) {
      setSelectedStudentId("");
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
              <div className="mb-4">
                <p className="font-medium">Assign Student</p>
              </div>
              <div className="flex gap-2">
                <Select
                  value={selectedStudentId}
                  onValueChange={setSelectedStudentId}
                  disabled={isAssigning}
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students && students.length > 0 ? (
                      students
                        .filter((student) => student?.id && student?.User?.name)
                        .map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.User.name}
                          </SelectItem>
                        ))
                    ) : (
                      <div className="px-2 py-1 text-sm text-gray-500">
                        No approved students available
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    if (selectedStudentId) {
                      onAssignStudent(selectedStudentId);
                      // Clear the selected student after assignment
                      setSelectedStudentId("");
                    }
                  }}
                  disabled={!selectedStudentId || isAssigning}
                  size="sm"
                >
                  {isAssigning ? "Assigning..." : "Assign"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Assigned Students</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {(() => {
                  const lessons =
                    (selectedEvent
                      ? selectedEvent.event.extendedProps.Lesson
                      : selectedSlot?.Lesson
                    )?.filter((lesson) => lesson?.id && lesson?.Student) || [];

                  return lessons.length > 0 ? (
                    lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <span>{lesson.Student?.User?.name || "Unnamed Student"}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isUnassigning}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("X button clicked - Lesson data:", lesson);
                            console.log("X button clicked - Lesson ID:", lesson.id);
                            console.log("X button clicked - onUnassignStudent type:", typeof onUnassignStudent);
                            showRemoveConfirmation("student from time slot", () => {
                              console.log("Remove confirmed - calling onUnassignStudent with:", lesson.id);
                              onUnassignStudent(lesson.id);
                            });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-4">
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
    </Dialog>
  );
};
