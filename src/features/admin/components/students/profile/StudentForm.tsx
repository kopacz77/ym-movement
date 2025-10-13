"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Level } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { formatEmail, formatPhoneNumber, toProperCase } from "@/lib/utils";

// Updated schema to match the API
const studentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  level: z.nativeEnum(Level),
  maxLessonsPerWeek: z.coerce.number().min(1, "Minimum 1 lesson per week"),
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

interface StudentFormProps {
  student?: { id: string };
  onSubmitAction?: () => void;
}

export const StudentForm: React.FC<StudentFormProps> = ({ student, onSubmitAction = () => {} }) => {
  const { sanitizeInput, sanitizeTextArea, validateEmail, validatePhone } = useSanitizedInput();
  const queryClient = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const utils = api.useUtils();
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load student data if editing
  const { data: studentData, isLoading } = api.admin.student.getStudent.useQuery(
    { studentId: student?.id || "" },
    { enabled: !!student?.id },
  );

  // Initialize form
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema) as any,
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

  // Update form when student data loads
  useEffect(() => {
    if (studentData && !isLoading && !isDataLoaded) {
      const emergencyContact = studentData.emergencyContact as any;

      const formValues = {
        name: studentData.User?.name || "",
        email: studentData.User?.email || "",
        phone: studentData.phone || "",
        maxLessonsPerWeek: studentData.maxLessonsPerWeek || 1,
        level: studentData.level || ("PRE_PRELIMINARY" as Level),
        emergencyContact: emergencyContact
          ? {
              name: emergencyContact.name || "",
              phone: emergencyContact.phone || "",
              relationship: emergencyContact.relationship || "",
            }
          : {
              name: "",
              phone: "",
              relationship: "",
            },
        notes: studentData.notes || "",
        dateOfBirth: studentData.dateOfBirth || "",
      };

      // Use setTimeout to ensure the form is fully initialized
      setTimeout(() => {
        form.reset(formValues);
        setIsDataLoaded(true);
      }, 0);
    }
  }, [studentData, isLoading, isDataLoaded, form.reset]);

  const updateStudent = api.admin.student.updateStudent.useMutation({
    onSuccess: async (_updatedStudent) => {
      // Invalidate the SPECIFIC getStudents query using TRPC utils
      await utils.admin.student.getStudents.invalidate();

      // Also invalidate all other student queries using predicate
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "admin" && query.queryKey[1] === "student",
      });

      toast("Success", {
        description: "Student updated successfully",
      });

      // Close dialog after a small delay to ensure refetch completes
      setTimeout(() => {
        onSubmitAction();
      }, 300);
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const createStudent = api.admin.student.createStudent.useMutation({
    onSuccess: async () => {
      // Invalidate the SPECIFIC getStudents query using TRPC utils
      await utils.admin.student.getStudents.invalidate();

      // Also invalidate all other student queries
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "admin" && query.queryKey[1] === "student",
      });

      toast("Success", {
        description: "Student created successfully",
      });

      setTimeout(() => {
        onSubmitAction();
      }, 300);
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const handleSubmit = async (values: StudentFormValues) => {
    // Validate that level is set
    if (!values.level) {
      toast.error("Validation Error", {
        description: "Please select a level",
      });
      return;
    }

    // Sanitize, format, and validate inputs
    const sanitizedValues = {
      ...values,
      name: toProperCase(sanitizeInput(values.name)),
      email: formatEmail(values.email),
      phone: values.phone ? formatPhoneNumber(sanitizeInput(values.phone)) : undefined,
      notes: values.notes ? sanitizeTextArea(values.notes) : undefined,
      emergencyContact:
        values.emergencyContact &&
        (values.emergencyContact.name ||
          values.emergencyContact.phone ||
          values.emergencyContact.relationship)
          ? {
              name: toProperCase(sanitizeInput(values.emergencyContact.name || "")),
              phone: formatPhoneNumber(sanitizeInput(values.emergencyContact.phone || "")),
              relationship: toProperCase(sanitizeInput(values.emergencyContact.relationship || "")),
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

    if (student?.id) {
      updateStudent.mutate({
        ...sanitizedValues,
        id: student.id,
      });
    } else {
      createStudent.mutate({
        ...sanitizedValues,
        sendEmail: true,
        sendInvite: false,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Loading student data...</p>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    onBlur={(e) => field.onChange(toProperCase(e.target.value))}
                    placeholder="John Doe"
                  />
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
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    value={field.value || ""}
                    onBlur={(e) => field.onChange(formatEmail(e.target.value))}
                    placeholder="john@example.com"
                  />
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
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    onBlur={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                    placeholder="(555) 123-4567"
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
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level *</FormLabel>
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level">
                        {field.value ? field.value.replace("_", " ") : "Select level"}
                      </SelectValue>
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
                <FormLabel>Max Lessons per Week *</FormLabel>
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
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-medium">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="emergencyContact.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      onBlur={(e) => field.onChange(toProperCase(e.target.value))}
                      placeholder="Jane Doe"
                    />
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
                    <Input
                      {...field}
                      value={field.value || ""}
                      onBlur={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                      placeholder="(555) 123-4567"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emergencyContact.relationship"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Relationship</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      onBlur={(e) => field.onChange(toProperCase(e.target.value))}
                      placeholder="Mother, Father, Guardian, etc."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className="border-t pt-4">
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  placeholder="Any additional notes about the student..."
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4 border-t pt-4">
          <Button type="button" variant="outline" onClick={onSubmitAction}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateStudent.isPending || createStudent.isPending}>
            {updateStudent.isPending || createStudent.isPending
              ? "Saving..."
              : student?.id
                ? "Update Student"
                : "Create Student"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
