// src/features/scheduling/components/CreateTimeSlotDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TimeSlotForm } from "../forms/TimeSlotForm";

interface TimeSlotFormData {
  startTime: Date | null;
  endTime: Date | null;
  rinkId?: string;
}

interface CreateTimeSlotDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: TimeSlotFormData | null;
  rinks: Array<{ id: string; name: string; timezone: string }>;
  onSubmit: () => void;
}

export function CreateTimeSlotDialog({
  isOpen,
  onOpenChange,
  initialData,
  rinks,
  onSubmit,
}: CreateTimeSlotDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {initialData?.startTime ? "Create Time Slot for Selected Time" : "Create New Time Slot"}
          </DialogTitle>
        </DialogHeader>
        {initialData && (
          <TimeSlotForm
            initialStartTime={initialData.startTime}
            initialEndTime={initialData.endTime}
            initialRinkId={initialData.rinkId}
            rinks={rinks}
            onSubmitAction={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
