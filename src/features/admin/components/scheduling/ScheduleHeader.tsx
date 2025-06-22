// src/features/admin/components/scheduling/ScheduleHeader.tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FC } from "react";
import { UndoBulkCreationButton } from "./UndoBulkCreationButton";

// Define a type for the rink object
interface Rink {
  id: string;
  name: string;
  timezone: string;
}

interface ScheduleHeaderProps {
  selectedRink: string | undefined;
  onRinkSelect: (rinkId: string | undefined) => void;
  createTimeSlotButton: React.ReactNode;
  bulkCreateButton: React.ReactNode;
  rinks: Rink[];
}

export const ScheduleHeader: FC<ScheduleHeaderProps> = ({
  selectedRink,
  onRinkSelect,
  createTimeSlotButton,
  bulkCreateButton,
  rinks,
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <h1 className="text-2xl font-bold">Schedule Management</h1>
      <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
        {/* Always show UndoBulkCreationButton */}
        <UndoBulkCreationButton />

        {/* Create Time Slot Dialog Button */}
        {createTimeSlotButton}

        {/* Bulk Create Slots Dialog Button */}
        {bulkCreateButton}

        {/* Rink Selector */}
        <Select
          value={selectedRink}
          onValueChange={(value) => onRinkSelect(value === "all_rinks" ? undefined : value)}
        >
          <SelectTrigger className="w-full md:w-auto md:min-w-[240px] max-w-xs">
            <SelectValue placeholder="All Rinks" />
          </SelectTrigger>
          <SelectContent className="max-w-sm">
            <SelectItem value="all_rinks">All Rinks</SelectItem>
            {rinks?.map((rink: Rink) => (
              <SelectItem key={rink.id} value={rink.id} className="whitespace-normal">
                <span className="block">
                  {rink.name} ({rink.timezone.split("/").pop()?.replace("_", " ")})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
