import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { ViewOptions } from './ViewOptions';
import { TimeSlotList } from './TimeSlotList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const ScheduleCalendarView = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <ViewOptions />
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Time Slot
        </Button>
      </div>
      <div className="flex-1 grid grid-cols-7 gap-4">
        <div className="col-span-5">
          <Calendar mode="week" />
        </div>
        <div className="col-span-2">
          <TimeSlotList />
        </div>
      </div>
    </div>
  );
};
