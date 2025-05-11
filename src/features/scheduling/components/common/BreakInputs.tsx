import { Button } from "@/components/ui/button";
// src/features/scheduling/components/BreakInputs.tsx
import { FormLabel } from "@/components/ui/form";
import { Break, BulkTimeSlotFormValues } from "@/types/scheduling";
import { Plus } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { BreakInput } from "./BreakInput";

interface BreakInputsProps {
  breaks: Break[];
  form: UseFormReturn<BulkTimeSlotFormValues>;
  addBreak: () => void;
  removeBreak: (index: number) => void;
}

export function BreakInputs({ breaks, form, addBreak, removeBreak }: BreakInputsProps) {
  return (
    <div className="space-y-3 border rounded-md p-4">
      <div className="flex justify-between items-center">
        <FormLabel className="text-base">Breaks (Optional)</FormLabel>
        {breaks.length < 3 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBreak}
            disabled={breaks.length >= 3}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Break
          </Button>
        )}
      </div>

      {breaks.map((_, index) => (
        <BreakInput
          // Using a more unique key that combines position with values
          key={`break-${index}-${breaks[index]?.startTime || ""}-${breaks[index]?.duration || 0}`}
          index={index}
          form={form}
          onRemove={() => removeBreak(index)}
          canRemove={breaks.length > 1}
        />
      ))}
    </div>
  );
}
