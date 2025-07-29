// src/features/admin/components/payments/PaymentNoteForm.tsx

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";

const noteSchema = z.object({
  content: z.string().min(3, "Note must be at least 3 characters"),
});

type NoteFormValues = z.infer<typeof noteSchema>;

interface PaymentNoteFormProps {
  onSubmit: (note: string) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

export const PaymentNoteForm: React.FC<PaymentNoteFormProps> = ({
  onSubmit,
  isSubmitting,
  onCancel,
}) => {
  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      content: "",
    },
  });

  const handleSubmit = (values: NoteFormValues) => {
    onSubmit(values.content);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter payment notes here..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Note"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
