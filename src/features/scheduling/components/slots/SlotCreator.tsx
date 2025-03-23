// src/features/scheduling/components/slots/SlotCreator.tsx
import type React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTimeSlots } from "../../hooks/useTimeSlots";

const slotSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  maxStudents: z.number().min(1),
  rinkId: z.string(),
  isActive: z.boolean().default(true),
});

type SlotFormValues = z.infer<typeof slotSchema>;

interface SlotCreatorProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: Date;
  rinkId: string;
}

export const SlotCreator: React.FC<SlotCreatorProps> = ({ open, onClose, defaultDate, rinkId }) => {
  const { createTimeSlot, validateTimeRange } = useTimeSlots();
  const form = useForm<SlotFormValues>({
    resolver: zodResolver(slotSchema),
    defaultValues: {
      maxStudents: 1,
      rinkId,
      isActive: true,
      startTime: defaultDate ? defaultDate.toISOString().slice(0, 16) : "",
      endTime: defaultDate
        ? new Date(defaultDate.getTime() + 30 * 60000).toISOString().slice(0, 16)
        : "",
    },
  });

  const onSubmit = async (values: SlotFormValues) => {
    const startTime = new Date(values.startTime);
    const endTime = new Date(values.endTime);
    const validationError = validateTimeRange({ startTime, endTime });
    if (validationError) {
      form.setError("startTime", { message: validationError });
      return;
    }
    await createTimeSlot.mutateAsync({ ...values, startTime, endTime });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Time Slot</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxStudents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Students</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTimeSlot.isPending}>
                {createTimeSlot.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
