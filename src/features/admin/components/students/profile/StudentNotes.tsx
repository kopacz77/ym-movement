// features/admin/components/students/profile/StudentNotes.tsx
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { Save, Plus } from 'lucide-react';

interface StudentNotesProps {
  studentId: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: { name: string; };
  type: 'ADMIN' | 'INSTRUCTOR';
}

export const StudentNotes: React.FC<StudentNotesProps> = ({ studentId }) => {
  const [newNote, setNewNote] = React.useState('');
  const { toast } = useToast();
  const { data: notes, isLoading } = api.admin.getStudentNotes.useQuery(
    { studentId },
    {
      onError: (err) => {
        toast({
          title: "Error loading notes",
          description: err.message,
          variant: "destructive",
        });
      },
    }
  );

  const addNote = api.admin.addStudentNote.useMutation({
    onSuccess: () => {
      toast({ title: "Note added successfully" });
      setNewNote('');
    },
    onError: (err) => {
      toast({ title: "Error adding note", description: err.message, variant: "destructive" });
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote.mutate({ studentId, content: newNote, type: 'ADMIN' });
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
            onChange={(e) => setNewNote(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={handleAddNote} disabled={!newNote.trim() || addNote.isLoading}>
              <Plus className="h-4 w-4 mr-2" /> Add Note
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading notes...</p>
          ) : !notes?.length ? (
            <p className="text-center text-muted-foreground">No notes yet</p>
          ) : (
            notes.map((note: Note) => (
              <div key={note.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{note.createdBy.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(note.createdAt), 'PPp')}
                    </p>
                  </div>
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">{note.type}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
