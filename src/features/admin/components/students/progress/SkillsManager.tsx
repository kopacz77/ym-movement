// src/features/admin/components/students/progress/SkillsManager.tsx
/*

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Level } from '@prisma/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { toast } from "sonner";
import { Plus, Medal, Check, X } from 'lucide-react';
import { format } from 'date-fns';

const skillSchema = z.object({
  skillId: z.string(),
  notes: z.string().optional(),
});

type SkillFormValues = z.infer<typeof skillSchema>;

interface SkillsManagerProps {
  studentId: string;
}

export const SkillsManager: React.FC<SkillsManagerProps> = ({ studentId }) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const utils = api.useUtils();

  const { data: allSkills, isLoading: isLoadingSkills } = api.admin.progress.getSkills.useQuery();
  const { data: progress, isLoading: isLoadingProgress } = api.admin.progress.getStudentProgress.useQuery({
    studentId,
  });

  const addSkill = api.admin.progress.addStudentSkill.useMutation({
    onSuccess: () => {
      toast({
        title: 'Skill added',
        description: 'The skill has been added to the student record.',
      });
      utils.admin.progress.getStudentProgress.invalidate({ studentId });
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeSkill = api.admin.progress.removeStudentSkill.useMutation({
    onSuccess: () => {
      toast({
        title: 'Skill removed',
        description: 'The skill has been removed from the student record.',
      });
      utils.admin.progress.getStudentProgress.invalidate({ studentId });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const form = useForm<SkillFormValues>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      skillId: '',
      notes: '',
    },
  });

  const handleAddSkill = (values: SkillFormValues) => {
    addSkill.mutate({
      studentId,
      skillId: values.skillId,
      notes: values.notes,
    });
  };

  // Filter out skills that the student already has
  const availableSkills = React.useMemo(() => {
    if (!allSkills || !progress) return [];
    const masteredSkillIds = progress.skills.map((s) => s.skillId);
    return allSkills.filter((skill) => !masteredSkillIds.includes(skill.id));
  }, [allSkills, progress]);

  if (isLoadingSkills || isLoadingProgress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Skills Mastered</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Skills Mastered ({progress?.skills.length || 0})</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Skill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Skill</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddSkill)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="skillId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skill</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a skill" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSkills.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">No skills available</div>
                          ) : (
                            availableSkills.map((skill) => (
                              <SelectItem key={skill.id} value={skill.id}>
                                {skill.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={availableSkills.length === 0 || addSkill.isPending}
                  >
                    {addSkill.isPending ? 'Adding...' : 'Add Skill'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!progress?.skills.length ? (
          <div className="text-center py-4 text-muted-foreground">No skills mastered yet</div>
        ) : (
          <div className="space-y-3">
            {progress.skills.map((studentSkill) => (
              <div key={studentSkill.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">{studentSkill.skill.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Mastered on {format(new Date(studentSkill.masteredAt), 'PPP')}
                    </p>
                    {studentSkill.notes && (
                      <p className="text-sm mt-1">{studentSkill.notes}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSkill.mutate({ id: studentSkill.id })}
                  disabled={removeSkill.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

*/