// src/features/admin/components/scheduling/BookingForm.tsx
// Change the React import to separate runtime and type imports
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { LessonType, RinkArea } from "@prisma/client";
// Change to import type for CalendarSlot since it's only used as a type
import type { CalendarSlot } from "@/features/scheduling/types";

// Define the validation schema for the booking form.
const bookingSchema = z.object({
  studentId: z.string(),
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
  const createLesson = api.admin.schedule.createLesson.useMutation({
    onSuccess: () => {
      onCloseAction();
    },
  });
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      type: LessonType.PRIVATE,
      area: slot?.rinkArea,
      price: 0,
    },
  });
  const onSubmit = (values: BookingFormValues) => {
    createLesson.mutate({
      ...values,
      timeSlotId: slot.id,
    });
  };

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
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* For now, we add placeholder items. In a real app, query your students list. */}
                      <SelectItem value="student1">Student 1</SelectItem>
                      <SelectItem value="student2">Student 2</SelectItem>
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
                    <Input type="number" min={0} step={0.01} {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCloseAction}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLesson.isPending}>
                {createLesson.isPending ? "Booking..." : "Book Lesson"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
