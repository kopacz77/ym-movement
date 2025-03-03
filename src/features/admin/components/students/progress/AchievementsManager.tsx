// src/features/admin/components/students/progress/AchievementsManager.tsx
/*

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Medal, Trash } from 'lucide-react';
import { format } from 'date-fns';

const achievementSchema = z.object({
  achievementId: z.string(),
  notes: z.string().optional(),
});

type AchievementFormValues = z.infer<typeof achievementSchema>;

interface AchievementsManagerProps {
  studentId: string;
}

export const AchievementsManager: React.FC<AchievementsManagerProps> = ({ studentId }) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const { toast } = useToast();
  const utils = api.useUtils();

  const { data: allAchievements, isLoading: isLoadingAchievements } = api.admin.progress.getAchievements.useQuery();
  const { data: progress, isLoading: isLoadingProgress } = api.admin.progress.getStudentProgress.useQuery({
    studentId,
  });

  const addAchievement = api.admin.progress.addStudentAchievement.useMutation({
    onSuccess: () => {
      toast({
        title: 'Achievement added',
        description: 'The achievement has been added to the student record.',
      });
      utils.admin.progress.getStudentProgress.invalidate({ studentId });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeAchievement = api.admin.progress.removeStudentAchievement.useMutation({
    onSuccess: () => {
      toast({
        title: 'Achievement removed',
        description: 'The achievement has been removed from the student record.',
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

  const form = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementSchema),
    defaultValues: {
      achievementId: '',
      notes: '',
    },
  });

  const handleAddAchievement = (values: AchievementFormValues) => {
    addAchievement.mutate({
      studentId,
      achievementId: values.achievementId,
      notes: values.notes,
    });
  };

  // Get list of achievements the student doesn't already have
  const availableAchievements = React.useMemo(() => {
    if (!allAchievements || !progress) return [];
    const earnedAchievementIds = progress.achievements.map((a) => a.achievementId);
    return allAchievements.filter((achievement) => !earnedAchievementIds.includes(achievement.id));
  }, [allAchievements, progress]);

  if (isLoadingAchievements || isLoadingProgress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Achievements</CardTitle>
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
        <CardTitle>Achievements ({progress?.achievements.length || 0})</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Achievement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Achievement</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddAchievement)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="achievementId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Achievement</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an achievement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableAchievements.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">No achievements available</div>
                          ) : (
                            availableAchievements.map((achievement) => (
                              <SelectItem key={achievement.id} value={achievement.id}>
                                {achievement.name}
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
                    disabled={availableAchievements.length === 0 || addAchievement.isPending}
                  >
                    {addAchievement.isPending ? 'Adding...' : 'Add Achievement'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!progress?.achievements.length ? (
          <div className="text-center py-4 text-muted-foreground">No achievements yet</div>
        ) : (
          <div className="space-y-3">
            {progress.achievements.map((studentAchievement) => (
              <div key={studentAchievement.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-800 p-2 rounded-full">
                    <Medal className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{studentAchievement.achievement.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Awarded on {format(new Date(studentAchievement.awardedAt), 'PPP')}
                    </p>
                    {studentAchievement.notes && (
                      <p className="text-sm mt-1">{studentAchievement.notes}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAchievement.mutate({ id: studentAchievement.id })}
                  disabled={removeAchievement.isPending}
                >
                  <Trash className="h-4 w-4" />
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