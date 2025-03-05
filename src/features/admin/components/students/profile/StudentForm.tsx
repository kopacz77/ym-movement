"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Level } from '@prisma/client';

// Updated schema to match the expected API types - making emergencyContact properties optional
const studentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  level: z.nativeEnum(Level),
  maxLessonsPerWeek: z.coerce.number().min(1, 'Minimum 1 hour per week'),
  emergencyContact: z.object({
    name: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    relationship: z.string().optional().default(""),
  }).optional(),
  notes: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentFormProps {
  student?: any;
  onSubmitAction?: () => void;
}

export const StudentForm: React.FC<StudentFormProps> = ({
  student,
  onSubmitAction = () => {},
}) => {
  const { toast } = useToast();
  const [formInitialized, setFormInitialized] = React.useState(false);

  // Load student data by ID if needed
  const { data: studentData, isLoading } = api.admin.student.getStudent.useQuery(
    { studentId: student?.id || "" },
    { enabled: !!student?.id && !student?.level }
  );

  // React 19 friendly form initialization
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      maxLessonsPerWeek: 1,
      level: 'PRE_PRELIMINARY' as Level,
      emergencyContact: {
        name: "",
        phone: "",
        relationship: "",
      },
      notes: "",
      dateOfBirth: "",
    },
  });

  // Update form values when data is loaded
  useEffect(() => {
    if ((student || studentData) && !formInitialized) {
      const data = studentData || student;
      
      // Safety checks for React 19 strict mode
      if (!data) return;
      
      const values = {
        name: data?.user?.name || "",
        email: data?.user?.email || "",
        phone: data?.phone || "",
        maxLessonsPerWeek: data?.maxLessonsPerWeek || 1,
        level: data?.level || 'PRE_PRELIMINARY' as Level,
        emergencyContact: data?.emergencyContact ? {
          name: data.emergencyContact.name || "",
          phone: data.emergencyContact.phone || "",
          relationship: data.emergencyContact.relationship || "",
        } : undefined,
        notes: data?.notes || "",
        dateOfBirth: data?.dateOfBirth || "",
      };
      
      form.reset(values);
      setFormInitialized(true);
    }
  }, [student, studentData, form, formInitialized]);

  const updateStudent = api.admin.student.updateStudent.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student updated successfully"
      });
      onSubmitAction();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const createStudent = api.admin.student.createStudent.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student created successfully"
      });
      onSubmitAction();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleSubmit = (values: StudentFormValues) => {
    // Ensure emergencyContact is properly formatted with non-optional fields
    const formattedValues = {
      ...values,
      emergencyContact: values.emergencyContact ? {
        name: values.emergencyContact.name || "",
        phone: values.emergencyContact.phone || "",
        relationship: values.emergencyContact.relationship || "",
      } : undefined
    };

    if (student?.id) {
      updateStudent.mutate({
        ...formattedValues,
        id: student.id,
      });
    } else {
      createStudent.mutate({
        ...formattedValues,
        sendEmail: true,
      });
    }
  };

  if (isLoading) {
    return <div>Loading student data...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} />
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
                  <Input {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Rest of form fields removed for brevity */}
        </div>
        
        {/* Emergency contact section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Emergency Contact</h3>
          {/* Emergency contact fields here */}
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  placeholder="Any additional notes about the student..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSubmitAction}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateStudent.isPending || createStudent.isPending}
          >
            {updateStudent.isPending || createStudent.isPending 
              ? "Saving..." 
              : (student?.id ? "Update" : "Create")}
          </Button>
        </div>
      </form>
    </Form>
  );
};