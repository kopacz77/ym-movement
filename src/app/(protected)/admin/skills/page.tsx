// src/app/(protected)/admin/skills/page.tsx



"use client";

const PlaceholderPage = () => {
  return null;
};

export default PlaceholderPage;

/*
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useToast } from 'sonner';
import { Plus, Trash } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Level } from '@prisma/client';

const skillSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  level: z.nativeEnum(Level),
});

const achievementSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});

type SkillFormValues = z.infer<typeof skillSchema>;
type AchievementFormValues = z.infer<typeof achievementSchema>;

export default function SkillsManagementPage() {
  const [activeTab, setActiveTab] = React.useState('skills');
  const [isAddSkillOpen, setIsAddSkillOpen] = React.useState(false);
  const [isAddAchievementOpen, setIsAddAchievementOpen] = React.useState(false);
  const utils = api.useUtils();

  const { data: skills, isLoading: isLoadingSkills } = api.admin.progress.getSkills.useQuery();
  const { data: achievements, isLoading: isLoadingAchievements } = api.admin.progress.getAchievements.useQuery();

  const createSkill = api.admin.progress.createSkill.useMutation({
    onSuccess: () => {
      toast("Skill added", {
  description: "The new skill has been added successfully.",
});
      utils.admin.progress.getSkills.invalidate();
      setIsAddSkillOpen(false);
      skillForm.reset();
    },
    onError: (error) => {
      toast.error("Error", {
  description: "Failed to add skill: " + error.message,
});
    },
  });

  const createAchievement = api.admin.progress.createAchievement.useMutation({
    onSuccess: () => {
      toast({
        title: "Achievement created", 
        description: "The achievement has been added successfully",
      });
      utils.admin.progress.getAchievements.invalidate();
      setIsAddAchievementOpen(false);
      achievementForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const skillForm = useForm<SkillFormValues>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      name: '',
      description: '',
      level: Level.PRE_PRELIMINARY,
    },
  });

  const achievementForm = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const handleAddSkill = (values: SkillFormValues) => {
    createSkill.mutate(values);
  };

  const handleAddAchievement = (values: AchievementFormValues) => {
    createAchievement.mutate(values);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Skills & Achievements</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <div className="flex justify-end">
          {activeTab === 'skills' ? (
            <Dialog open={isAddSkillOpen} onOpenChange={setIsAddSkillOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Skill
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Skill</DialogTitle>
                </DialogHeader>
                <Form {...skillForm}>
                  <form onSubmit={skillForm.handleSubmit(handleAddSkill)} className="space-y-4">
                    <FormField
                      control={skillForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skill Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={skillForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={skillForm.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skill Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(Level).map((level) => (
                                <SelectItem key={level} value={level}>
                                  {level.replace('_', ' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddSkillOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createSkill.isPending}>
                        {createSkill.isPending ? "Adding..." : "Add Skill"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={isAddAchievementOpen} onOpenChange={setIsAddAchievementOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Achievement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Achievement</DialogTitle>
                </DialogHeader>
                <Form {...achievementForm}>
                  <form onSubmit={achievementForm.handleSubmit(handleAddAchievement)} className="space-y-4">
                    <FormField
                      control={achievementForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Achievement Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={achievementForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddAchievementOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createAchievement.isPending}>
                        {createAchievement.isPending ? "Adding..." : "Add Achievement"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="skills" className="space-y-4">
          {isLoadingSkills ? (
            <div className="flex items-center justify-center h-24">Loading skills...</div>
          ) : !skills || skills.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-24 text-muted-foreground">
                No skills created yet. Click "Add Skill" to create one.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {skills.map((skill) => (
                <Card key={skill.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{skill.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{skill.description || "No description"}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {skill.level.replace('_', ' ')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          {isLoadingAchievements ? (
            <div className="flex items-center justify-center h-24">Loading achievements...</div>
          ) : !achievements || achievements.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-24 text-muted-foreground">
                No achievements created yet. Click "Add Achievement" to create one.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement) => (
                <Card key={achievement.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{achievement.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {achievement.description || "No description"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

*/

