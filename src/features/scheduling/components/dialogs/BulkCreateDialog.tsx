// src/features/scheduling/components/BulkCreateDialog.tsx

import { ProductionErrorBoundary } from "@/components/production-error-boundary";
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
      <DialogContent className="sm:max-w-[800px] h-[90vh] max-h-[900px] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Bulk Create Time Slots</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <ProductionErrorBoundary>
            <BulkTimeSlotForm rinks={rinks} onSubmitAction={() => onOpenChange(false)} />
          </ProductionErrorBoundary>
        </div>
      </DialogContent>
    </Dialog>
  );
}
