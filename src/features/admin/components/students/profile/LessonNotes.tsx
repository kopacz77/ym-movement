// features/admin/components/students/profile/LessonNotes.tsx
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { LessonNote } from '../types';

interface LessonNotesProps {
  lessonId: string;
  studentId: string;
}

export const LessonNotes: React.FC<LessonNotesProps> = ({ lessonId, studentId }) => {
  const [note, setNote] = React.useState('');
  const { toast } = useToast();
  const { data: lesson, isLoading } = api.admin.getLessonDetails.useQuery(
    { lessonId },
    {
      onError: (err) => {
        toast({
          title: "Error loading lesson details",
          description: err.message,
          variant: "destructive",
        });
      },
    }
  );

  const addNote = api.admin.addLessonNote.useMutation({
    onSuccess: () => {
      toast({ title: "Note added successfully" });
      setNote('');
    },
    onError: (err) => {
      toast({ title: "Error adding note", description: err.message, variant: "destructive" });
    },
  });

  const handleAddNote = () => {
    if (!note.trim()) return;
    addNote.mutate({ lessonId, studentId, content: note });
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
              <label className="text-sm font-medium">Add Note</label>
              <Textarea placeholder="Add notes about the lesson..." value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={handleAddNote} disabled={!note.trim() || addNote.isLoading}>
                  <Plus className="h-4 w-4 mr-2" /> Add Note
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {lesson?.notes?.length === 0 ? (
                <p className="text-center text-muted-foreground">No notes for this lesson</p>
              ) : (
                lesson?.notes?.map((note, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{note.createdBy.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(note.createdAt), 'PPp')}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))
              )}
            </div>
            {lesson && (
              <div className="mt-6 border-t pt-4">
                <h4 className="font-medium mb-2">Lesson Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-muted-foreground">
                      {format(new Date(lesson.startTime), 'PPp')}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Duration</p>
                    <p className="text-muted-foreground">{lesson.duration} minutes</p>
                  </div>
                  <div>
                    <p className="font-medium">Type</p>
                    <p className="text-muted-foreground">{lesson.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="font-medium">Status</p>
                    <p className="text-muted-foreground">{lesson.status}</p>
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
