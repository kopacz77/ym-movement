// src/features/admin/components/students/management/StudentManager.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Level } from "@prisma/client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { StudentList } from "./StudentList";

// Interface for student response with invitation flag
interface StudentWithInvite {
  id: string;
  userId: string;
  user: {
    name: string | null;
    email: string;
  };
  inviteSent?: boolean;
  [key: string]: unknown; // Using unknown instead of any for better type safety
}

const studentFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  level: z.nativeEnum(Level),
  maxLessonsPerWeek: z.coerce.number().min(1, "Minimum 1 lesson per week"),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    })
    .optional(),
  notes: z.string().optional(),
  // Add sendInvite field to control invitation email
  sendInvite: z.boolean(),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

// Empty event handlers for StudentList props
const handleEditClick = (id: string) => {
  console.log(`Edit student with ID: ${id}`);
};

const handleViewProfileClick = (id: string) => {
  console.log(`View profile for student with ID: ${id}`);
};

export function StudentManager() {
  const [isOpen, setIsOpen] = useState(false);

  const utils = api.useUtils();

  const createStudent = api.admin.student.createStudent.useMutation({
    onSuccess: (data) => {
      toast.success("Student created");

      // Cast data to our interface to safely check for inviteSent
      const studentData = data as StudentWithInvite;

      // Display invitation toast if invitation was sent
      if (studentData.inviteSent === true) {
        toast.success("Invitation sent", {
          description: `Invitation email sent to ${studentData.user.email}`,
        });
      }

      setIsOpen(false);
      form.reset();
      utils.admin.student.getStudents.invalidate();
    },
    onError: (error) => {
      toast.error("Error creating student", {
        description: error.message,
      });
    },
  });

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      level: Level.PRELIMINARY,
      maxLessonsPerWeek: 3,
      notes: "",
      sendInvite: true, // Default to sending invitations
    },
  });

  function onSubmit(values: StudentFormValues) {
    createStudent.mutate(values);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Student Management</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>Create Student</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Student</DialogTitle>
              <DialogDescription>
                Create a new student account. The student will receive an email invitation.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="(123) 456-7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skating Level</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value as Level)}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(Level).map((level) => (
                            <SelectItem key={level} value={level}>
                              {level.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxLessonsPerWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Lessons Per Week</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
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

                {/* New checkbox for sending invitation email */}
                <FormField
                  control={form.control}
                  name="sendInvite"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Send invitation email</FormLabel>
                        <FormDescription>
                          Send an email with a link to set up their account password
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={createStudent.isPending}>
                    {createStudent.isPending ? "Creating..." : "Create Student"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <StudentList onEditAction={handleEditClick} onViewProfileAction={handleViewProfileClick} />
    </div>
  );
}
