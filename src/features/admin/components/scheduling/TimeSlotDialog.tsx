import { Badge } from "@/components/ui/badge";
// src/features/admin/components/scheduling/TimeSlotDialog.tsx
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRinkTime } from "@/lib/timezone";
import { X } from "lucide-react";
import { type FC } from "react";

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
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Time Slot</DialogTitle>
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
                    <Badge variant="outline" className="text-xs">
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
              <p className="font-medium">Assign Student</p>
              <div className="flex gap-2">
                <Select
                  onValueChange={(studentId: string) => {
                    onAssignStudent(studentId);
                  }}
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.user.name || "Unnamed Student"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Assigned Students</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {(selectedEvent
                  ? selectedEvent.event.extendedProps.lessons
                  : selectedSlot?.lessons
                )?.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span>{lesson.student.user.name || "Unnamed Student"}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Remove this student from the time slot?")) {
                          onUnassignStudent(lesson.id);
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-end gap-2 pt-4">
              <Button variant="outline" className="w-full md:w-auto" onClick={onClose}>
                Close
              </Button>
              <Button variant="outline" className="w-full md:w-auto" onClick={onEdit}>
                Edit
              </Button>
              <Button
                variant="destructive"
                className="w-full md:w-auto"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this time slot?")) {
                    onDelete();
                  }
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
