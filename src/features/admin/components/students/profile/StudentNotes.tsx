// features/admin/components/students/profile/StudentNotes.tsx
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

interface StudentNotesProps {
  studentId: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: {
    name: string;
  };
  type: "ADMIN" | "INSTRUCTOR";
}

export const StudentNotes: React.FC<StudentNotesProps> = ({ studentId }) => {
  const [newNote, setNewNote] = React.useState("");
  const { sanitizeTextArea } = useSanitizedInput();

  // Using useEffect to handle errors instead of onError in the query options
  const { data: student, isLoading, error } = api.admin.student.getStudent.useQuery({ studentId });

  useEffect(() => {
    if (error) {
      toast.error("Error loading notes", {
        description: error.message,
      });
    }
  }, [error]);

  // Access notes directly from student
  const notes = React.useMemo(() => {
    if (!student?.notes) {
      return [];
    }

    // Convert the single notes field to an array of note objects
    return [
      {
        id: "1",
        content: student.notes,
        createdAt: student.createdAt,
        createdBy: { name: "System" },
        type: "ADMIN" as const,
      },
    ];
  }, [student]);

  const addNote = api.admin.student.addStudentNote.useMutation({
    onSuccess: () => {
      toast("Note added successfully");
      setNewNote("");
    },
    // Fixed: Use the correct type for the error parameter
    onError: (error) => {
      toast.error("Error adding note", {
        description: error.message,
      });
    },
  });

  const handleAddNote = () => {
    const sanitizedContent = sanitizeTextArea(newNote);
    if (!sanitizedContent.trim()) {
      toast.error("Note cannot be empty");
      return;
    }

    addNote.mutate({
      studentId,
      content: sanitizedContent,
      type: "ADMIN",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Add a new note..."
            value={newNote}
            onChange={(e) => setNewNote(sanitizeTextArea(e.target.value))}
            maxLength={10000}
          />
          <div className="flex justify-end">
            <Button onClick={handleAddNote} disabled={!newNote.trim() || addNote.isPending}>
              <Plus className="h-4 w-4 mr-2" /> Add Note
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading notes...</p>
          ) : notes?.length ? (
            notes.map((note: Note) => (
              <div key={note.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{note.createdBy.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(note.createdAt), "PPp")}
                    </p>
                  </div>
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">{note.type}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground">No notes yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
