// features/admin/components/students/profile/LessonNotes.tsx
"use client";

import { format } from "date-fns";
import { Plus } from "lucide-react";
import React, { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useSanitizedInput } from "@/hooks/useSanitizedInput";
import { api } from "@/lib/api";

interface LessonNotesProps {
  lessonId: string;
  studentId: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: {
    name: string;
  };
}

export const LessonNotes: React.FC<LessonNotesProps> = ({ lessonId, studentId }) => {
  const [note, setNote] = React.useState("");
  const [notes, setNotes] = React.useState<Note[]>([]);
  const { sanitizeTextArea } = useSanitizedInput();

  // Updated to use correct namespace and removed onError option
  const {
    data: lessons,
    isLoading,
    error,
  } = api.admin.schedule.getLessonsByDate.useQuery({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
  });

  // Also fetch student notes separately
  const { data: student } = api.admin.student.getStudent.useQuery(
    { studentId },
    { enabled: !!studentId },
  );

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast.error("Error loading lesson details", {
        description: error.message,
      });
    }
  }, [error]);

  // Find the specific lesson by ID
  const currentLesson = lessons?.find((l) => l.id === lessonId);

  // Prepare notes data when lesson or student data changes
  useEffect(() => {
    // If we have a lesson with notes property, use it
    if (currentLesson?.notes) {
      setNotes([
        {
          id: "lesson-note",
          content: currentLesson.notes,
          createdAt: currentLesson.createdAt,
          createdBy: { name: "Instructor" },
        },
      ]);
    }
    // Otherwise, if we have student notes, use those related to this lesson
    else if (student?.notes) {
      setNotes([
        {
          id: "student-note",
          content: student.notes,
          createdAt: student.createdAt,
          createdBy: { name: "System" },
        },
      ]);
    } else {
      setNotes([]);
    }
  }, [currentLesson, student]);

  // Updated to use correct namespace for adding notes
  const addNote = api.admin.student.addStudentNote.useMutation({
    onSuccess: () => {
      toast("Note added successfully");
      setNote("");
      // Optimistically add the new note to the display
      setNotes((prevNotes) => [
        ...prevNotes,
        {
          id: `new-${Date.now()}`,
          content: note,
          createdAt: new Date(),
          createdBy: { name: "You" },
        },
      ]);
    },
    onError: (error) => {
      toast.error("Error adding note", {
        description: error.message,
      });
    },
  });

  const handleAddNote = () => {
    const sanitizedContent = sanitizeTextArea(note);
    if (!sanitizedContent.trim()) {
      return;
    }

    // Using studentNote since we don't have a specific lessonNote API
    addNote.mutate({
      studentId,
      content: sanitizedContent,
      type: "INSTRUCTOR",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lesson Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="space-y-2">
              <label htmlFor="lesson-note-textarea" className="text-sm font-medium">
                Add Note
              </label>
              <Textarea
                id="lesson-note-textarea"
                placeholder="Add notes about the lesson..."
                value={note}
                onChange={(e) => setNote(sanitizeTextArea(e.target.value))}
                maxLength={10000}
              />
              <div className="flex justify-end">
                <Button onClick={handleAddNote} disabled={!note.trim() || addNote.isPending}>
                  <Plus className="h-4 w-4 mr-2" /> Add Note
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {notes.length === 0 ? (
                <p className="text-center text-muted-foreground">No notes for this lesson</p>
              ) : (
                notes.map((noteItem: Note, index: number) => (
                  <div key={noteItem.id || index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">
                          {noteItem.createdBy?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(noteItem.createdAt), "PPp")}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{noteItem.content}</p>
                  </div>
                ))
              )}
            </div>
            {currentLesson && (
              <div className="mt-6 border-t pt-4">
                <h4 className="font-medium mb-2">Lesson Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-muted-foreground">
                      {format(new Date(currentLesson.startTime), "PPp")}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Duration</p>
                    <p className="text-muted-foreground">{currentLesson.duration} minutes</p>
                  </div>
                  <div>
                    <p className="font-medium">Type</p>
                    <p className="text-muted-foreground">{currentLesson.type.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="font-medium">Status</p>
                    <p className="text-muted-foreground">{currentLesson.status}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
