// features/admin/components/students/shared/NewStudentDialog.tsx
"use client";
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Level } from '@prisma/client';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Plus } from 'lucide-react';

const newStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  level: z.nativeEnum(Level),
  phone: z.string().optional(),
  maxLessonsPerWeek: z.coerce.number().min(1, 'Minimum 1 lesson per week'),
  sendEmail: z.boolean().default(true)
});

type NewStudentFormData = z.infer<typeof newStudentSchema>;

export const NewStudentDialog = () => {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const form = useForm<NewStudentFormData>({
    resolver: zodResolver(newStudentSchema),
    defaultValues: { maxLessonsPerWeek: 1, sendEmail: true, level: Level.PRE_PRELIMINARY }
  });
  const createStudent = api.admin.createStudent.useMutation({
    onSuccess: (data) => {
      toast({ title: "Success", description: "Student created successfully. Confirmation email sent." });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
  const onSubmit = (data: NewStudentFormData) => {
    createStudent.mutate(data);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Create a new student account. An email invitation will be sent if enabled.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Student name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="student@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="level" render={({ field }) => (
              <FormItem>
                <FormLabel>Level</FormLabel>
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
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Phone number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="maxLessonsPerWeek" render={({ field }) => (
              <FormItem>
                <FormLabel>Max Lessons per Week</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createStudent.isLoading}>
                {createStudent.isLoading ? "Creating..." : "Create Student"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
