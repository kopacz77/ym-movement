// src/features/admin/components/scheduling/ScheduleHeader.tsx
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import { UndoBulkCreationButton } from "./UndoBulkCreationButton";
  import { FC } from "react";
  
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Rinks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_rinks">All Rinks</SelectItem>
              {rinks?.map((rink: Rink) => (
                <SelectItem key={rink.id} value={rink.id}>
                  {rink.name} ({rink.timezone.split('/').pop()?.replace('_', ' ')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };