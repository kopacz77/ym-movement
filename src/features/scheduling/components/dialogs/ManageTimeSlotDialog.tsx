import { X } from "lucide-react";
import type { Event } from "react-big-calendar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
// src/features/scheduling/components/dialogs/ManageTimeSlotDialog.tsx
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
import { formatRinkTime } from "@/lib/timezone";
import { showDeleteConfirmation, showRemoveConfirmation } from "@/lib/toast-confirmations";
import type { TimeSlot } from "@/types/scheduling";

interface Student {
  id: string;
  User: {
    name: string | null;
  };
}

interface Lesson {
  id: string;
  Student: Student;
}

interface SlotData {
  startTime: Date;
  endTime: Date;
  rinkId: string;
}

// Replace FullCalendar's EventClickArg with React Big Calendar's Event with proper extensions
interface CalendarEvent extends Event {
  id: string;
  extendedProps: {
    rink: {
      name: string;
      timezone: string;
    };
    rinkId: string;
    maxStudents: number;
    currentStudents: number;
    lessons: Lesson[];
  };
}

interface ManageTimeSlotDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEvent: { event: CalendarEvent } | null;
  selectedSlot: TimeSlot | null;
  students?: Student[];
  onClose: () => void;
  onEdit: (data: SlotData) => void;
  onDelete: (id: string) => void;
  onAssignStudent: (data: { timeSlotId: string; studentId: string }) => void;
  onUnassignStudent: (data: { lessonId: string }) => void;
}

export function ManageTimeSlotDialog({
  isOpen,
  onOpenChange,
  selectedEvent,
  selectedSlot,
  students,
  onClose,
  onEdit,
  onDelete,
  onAssignStudent,
  onUnassignStudent,
}: ManageTimeSlotDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Time Slot</DialogTitle>
          <DialogDescription>
            View and manage time slot details, assign or remove students, and edit or delete the slot.
          </DialogDescription>
        </DialogHeader>
        {(selectedEvent || selectedSlot) && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Start Time</p>
                {selectedEvent ? (
                  <p>
                    {selectedEvent.event.start &&
                      selectedEvent.event.extendedProps.rink.timezone &&
                      formatRinkTime(
                        selectedEvent.event.start,
                        selectedEvent.event.extendedProps.rink.timezone,
                      )}
                  </p>
                ) : (
                  <p>
                    {selectedSlot?.Rink.timezone &&
                      formatRinkTime(selectedSlot.startTime, selectedSlot.Rink.timezone)}
                  </p>
                )}
              </div>
              <div>
                <p className="font-medium">End Time</p>
                {selectedEvent ? (
                  <p>
                    {selectedEvent.event.end &&
                      selectedEvent.event.extendedProps.rink.timezone &&
                      formatRinkTime(
                        selectedEvent.event.end,
                        selectedEvent.event.extendedProps.rink.timezone,
                      )}
                  </p>
                ) : (
                  <p>
                    {selectedSlot?.Rink.timezone &&
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
                    ? selectedEvent.event.extendedProps.rink?.name
                    : selectedSlot?.Rink?.name}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-medium">Assign Student</p>
              <div className="flex gap-2">
                <Select
                  onValueChange={(studentId: string) => {
                    onAssignStudent({
                      timeSlotId: selectedEvent ? selectedEvent.event.id : selectedSlot?.id || "",
                      studentId,
                    });
                  }}
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.User.name || "Unnamed Student"}
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
                  : selectedSlot?.Lesson
                )?.map((lesson: Lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span>{lesson.Student.User.name || "Unnamed Student"}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        showRemoveConfirmation("student from time slot", () => {
                          onUnassignStudent({ lessonId: lesson.id });
                        });
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
              <Button
                variant="outline"
                className="w-full md:w-auto"
                onClick={() => {
                  const slotData = selectedEvent
                    ? {
                        startTime: selectedEvent.event.start || new Date(),
                        endTime: selectedEvent.event.end || new Date(),
                        rinkId: selectedEvent.event.extendedProps.rinkId,
                      }
                    : {
                        startTime: selectedSlot ? new Date(selectedSlot.startTime) : new Date(),
                        endTime: selectedSlot ? new Date(selectedSlot.endTime) : new Date(),
                        rinkId: selectedSlot?.rinkId || "",
                      };

                  onEdit(slotData);
                }}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                className="w-full md:w-auto"
                onClick={() => {
                  const slotId = selectedEvent ? selectedEvent.event.id : selectedSlot?.id || "";
                  showDeleteConfirmation("time slot", () => {
                    onDelete(slotId);
                  });
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
}
