import { Button } from "@/components/ui/button";
// src/features/scheduling/components/BreakInput.tsx
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { BulkTimeSlotFormValues } from "@/types/scheduling";
import { X } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

interface BreakInputProps {
  index: number;
  form: UseFormReturn<BulkTimeSlotFormValues>;
  onRemove: () => void;
  canRemove: boolean;
}

export function BreakInput({ index, form, onRemove, canRemove }: BreakInputProps) {
  return (
    <div className="grid grid-cols-[1fr,1fr,auto] gap-3 items-end">
      <FormField
        control={form.control}
        name={`breaks.${index}.startTime`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Break {index + 1} Start Time</FormLabel>
            <FormControl>
              <Input type="time" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`breaks.${index}.duration`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Duration (minutes)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={5}
                step={5}
                {...field}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  field.onChange(Number.isNaN(value) ? 0 : value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {canRemove && (
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="mb-2">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
