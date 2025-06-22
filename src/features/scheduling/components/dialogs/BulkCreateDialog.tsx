// src/features/scheduling/components/BulkCreateDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BulkTimeSlotForm } from "@/features/scheduling/components/forms/BulkTimeSlotForm";

interface BulkCreateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rinks: Array<{ id: string; name: string; timezone: string }>;
}

export function BulkCreateDialog({ isOpen, onOpenChange, rinks }: BulkCreateDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Create Time Slots</DialogTitle>
        </DialogHeader>
        <BulkTimeSlotForm rinks={rinks} onSubmitAction={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
