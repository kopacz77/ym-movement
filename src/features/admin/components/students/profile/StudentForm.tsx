"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Level } from "@prisma/client";
import type React from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useSanitizedInput } from "@/hooks/useSanitizedInput";
import { api } from "@/lib/api";

// Updated schema to match the expected API types - making emergencyContact properties optional
const studentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  level: z.nativeEnum(Level),
  maxLessonsPerWeek: z.coerce.number().min(1, "Minimum 1 hour per week"),
  emergencyContact: z
    .object({
      name: z.string().optional().default(""),
      phone: z.string().optional().default(""),
      relationship: z.string().optional().default(""),
    })
    .optional(),
  notes: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

// Define Student type with proper typing for emergencyContact
interface Student {
  id?: string;
  user?: {
    name?: string;
    email?: string;
  };
  phone?: string;
  maxLessonsPerWeek?: number;
  level?: Level;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  } | null;
  notes?: string;
  dateOfBirth?: string;
}

// Type for API student data which might have a different structure
type ApiStudentData = {
  user: {
    name: string | null;
    email: string;
  };
  dateOfBirth?: string;
  [key: string]: unknown;
};

interface StudentFormProps {
  student?: Student;
  onSubmitAction?: () => void;
}

export const StudentForm: React.FC<StudentFormProps> = ({ student, onSubmitAction = () => {} }) => {
  const [formInitialized, setFormInitialized] = useState(false);
  const { sanitizeInput, sanitizeTextArea, validateEmail, validatePhone } = useSanitizedInput();

  // Load student data by ID if needed
  const { data: studentData, isLoading } = api.admin.student.getStudent.useQuery(
    { studentId: student?.id || "" },
    { enabled: !!student?.id && !student?.level },
  );

  // Initialize form with default values first
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      maxLessonsPerWeek: 1,
      level: "PRE_PRELIMINARY" as Level,
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
      const data = studentData ? (studentData as unknown as Student | ApiStudentData) : student;
      if (!data) return;

      const values = {
        name: data?.user?.name || "",
        email: data?.user?.email || "",
        phone: (data as Student)?.phone || "",
        maxLessonsPerWeek: (data as Student)?.maxLessonsPerWeek || 1,
        level: (data as Student)?.level || ("PRE_PRELIMINARY" as Level),
        emergencyContact: (data as Student)?.emergencyContact
          ? {
              name: ((data as Student).emergencyContact as { name?: string }).name || "",
              phone: ((data as Student).emergencyContact as { phone?: string }).phone || "",
              relationship:
                ((data as Student).emergencyContact as { relationship?: string }).relationship ||
                "",
            }
          : undefined,
        notes: (data as Student)?.notes || "",
        dateOfBirth: (data as ApiStudentData | Student)?.dateOfBirth || "",
      };

      form.reset(values);
      setFormInitialized(true);
    }
  }, [student, studentData, form, formInitialized]);

  const updateStudent = api.admin.student.updateStudent.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Student updated successfully",
      });
      onSubmitAction();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const createStudent = api.admin.student.createStudent.useMutation({
    onSuccess: () => {
      toast("Success", {
        description: "Student created successfully",
      });
      onSubmitAction();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const handleSubmit = (values: StudentFormValues) => {
    // Sanitize and validate inputs
    const sanitizedValues = {
      ...values,
      name: sanitizeInput(values.name),
      email: values.email, // Email is validated by schema
      phone: values.phone ? sanitizeInput(values.phone) : undefined,
      notes: values.notes ? sanitizeTextArea(values.notes) : undefined,
      emergencyContact: values.emergencyContact
        ? {
            name: sanitizeInput(values.emergencyContact.name || ""),
            phone: sanitizeInput(values.emergencyContact.phone || ""),
            relationship: sanitizeInput(values.emergencyContact.relationship || ""),
          }
        : undefined,
    };

    // Additional validation
    if (!validateEmail(sanitizedValues.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (sanitizedValues.phone && !validatePhone(sanitizedValues.phone)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    // Ensure emergencyContact is properly formatted with non-optional fields
    const formattedValues = {
      ...sanitizedValues,
      emergencyContact: sanitizedValues.emergencyContact
        ? {
            name: sanitizedValues.emergencyContact.name || "",
            phone: sanitizedValues.emergencyContact.phone || "",
            relationship: sanitizedValues.emergencyContact.relationship || "",
          }
        : undefined,
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
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
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
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxLessonsPerWeek"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Lessons per Week</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    value={field.value || 1}
                    onChange={(e) => field.onChange(Number.parseInt(e.target.value, 10) || 1)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Emergency Contact</h3>
          <FormField
            control={form.control}
            name="emergencyContact.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="emergencyContact.phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="emergencyContact.relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
          <Button type="button" variant="outline" onClick={onSubmitAction}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateStudent.isPending || createStudent.isPending}>
            {updateStudent.isPending || createStudent.isPending
              ? "Saving..."
              : student?.id
                ? "Update"
                : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
