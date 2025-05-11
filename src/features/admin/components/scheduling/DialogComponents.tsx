// src/features/admin/components/scheduling/DialogComponents.tsx
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TimeSlotForm } from "@/features/scheduling/components/forms/TimeSlotForm";
import { BulkTimeSlotForm } from "../../../scheduling/components/forms/BulkTimeSlotForm";
import { Plus } from "lucide-react";
import { FC } from "react";

// Define a proper interface for the Rink type
interface Rink {
  id: string;
  name: string;
  timezone: string;
  address?: string;
}

interface TimeSlotFormData {
  startTime: Date | null;
  endTime: Date | null;
  rinkId?: string;
}

interface CreateTimeSlotDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  timeSlotFormData: TimeSlotFormData | null;
  onCreateClick: () => void;
  rinks: Rink[]; // Use the Rink interface instead of any[]
  onSubmitAction: () => void;
}

export const CreateTimeSlotDialog: FC<CreateTimeSlotDialogProps> = ({
  isOpen,
  onOpenChange,
  timeSlotFormData,
  onCreateClick,
  rinks,
  onSubmitAction,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={onCreateClick} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Create Time Slot
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {timeSlotFormData?.startTime
              ? "Create Time Slot for Selected Time"
              : "Create New Time Slot"}
          </DialogTitle>
        </DialogHeader>
        {timeSlotFormData && (
          <TimeSlotForm
            initialStartTime={timeSlotFormData.startTime}
            initialEndTime={timeSlotFormData.endTime}
            initialRinkId={timeSlotFormData.rinkId}
            rinks={rinks || []}
            onSubmitAction={onSubmitAction}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

interface BulkCreateSlotsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rinks: Rink[]; // Use the Rink interface instead of any[]
  onSubmitAction: () => void;
}

export const BulkCreateSlotsDialog: FC<BulkCreateSlotsDialogProps> = ({
  isOpen,
  onOpenChange,
  rinks,
  onSubmitAction,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Bulk Create Slots
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Create Time Slots</DialogTitle>
        </DialogHeader>
        <BulkTimeSlotForm
          rinks={rinks || []}
          onSubmitAction={onSubmitAction}
        />
      </DialogContent>
    </Dialog>
  );
};