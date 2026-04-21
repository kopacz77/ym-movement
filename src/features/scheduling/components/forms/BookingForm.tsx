// src/features/scheduling/components/bookings/BookingForm.tsx
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { LessonType, RinkArea } from "@prisma/client";
import type React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useSanitizedInput } from "@/hooks/useSanitizedInput";
import { api } from "@/lib/api";
import type { CalendarSlot } from "../../types";

// Define a proper type for the student data from the API
interface StudentData {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface StudentsResponse {
  students?: StudentData[];
}

const bookingSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  type: z.nativeEnum(LessonType),
  area: z.nativeEnum(RinkArea),
  price: z.number().min(0),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  slot: CalendarSlot;
  open: boolean;
  onCloseAction: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({ slot, open, onCloseAction }) => {
  const { onError } = useErrorHandler();
  const { sanitizeInput } = useSanitizedInput();

  // Fetch students using the correct API namespace with enabled option only
  const { data: studentsData, isLoading } = api.admin.student.getStudents.useQuery(
    { active: true },
    { enabled: open },
  );

  // Create lesson mutation using the proper namespace and callbacks
  const createLesson = api.admin.schedule.createLesson.useMutation({
    onSuccess: () => {
      toast.success("Lesson booked successfully");
      onCloseAction();
    },
    onError: (error) => {
      // Use the more generic onError handler instead of the specific tRPC one
      onError(new Error(error.message));
    },
  });

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      type: LessonType.PRIVATE,
      area: slot.rinkArea,
      price: 0,
      notes: "",
    },
  });

  const onSubmit = (values: BookingFormValues) => {
    // Sanitize notes before submission
    const sanitizedValues = {
      ...values,
      notes: values.notes ? sanitizeInput(values.notes) : undefined,
    };
    createLesson.mutate({ ...sanitizedValues, timeSlotId: slot.id });
  };

  // Check if we have students data to display
  const students = (studentsData as unknown as StudentsResponse)?.students || [];

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book Lesson</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={isLoading ? "Loading students..." : "Select student"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading students...
                        </SelectItem>
                      ) : students.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No students found
                        </SelectItem>
                      ) : (
                        students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.user?.name ||
                              (student as any).User?.name ||
                              student.user?.email ||
                              (student as any).User?.email}
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lesson Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(LessonType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace("_", " ")}
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
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rink Area</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(RinkArea).map((area) => (
                        <SelectItem key={area} value={area}>
                          {area.replace("_", " ")}
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
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      {...field}
                      onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => field.onChange(sanitizeInput(e.target.value))}
                      maxLength={1000}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCloseAction}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLesson.isPending || isLoading}>
                {createLesson.isPending ? "Booking..." : "Book Lesson"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
