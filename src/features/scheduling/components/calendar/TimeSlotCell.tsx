// src/features/scheduling/components/calendar/TimeSlotCell.tsx
import React from 'react';
import { CalendarSlot } from '../../types';
import { cn } from '@/lib/utils';

interface TimeSlotCellProps {
  slot?: CalendarSlot;
  onClick: () => void;
  onHover?: () => void;
}

export const TimeSlotCell: React.FC<TimeSlotCellProps> = ({ slot, onClick, onHover }) => {
  const getSlotColor = (slot?: CalendarSlot) => {
    if (!slot) return 'bg-gray-50';
    if (!slot.isActive) return 'bg-gray-100';
    switch (slot.status) {
      case 'booked':
        return 'bg-blue-100';
      case 'partial':
        return 'bg-yellow-100';
      case 'cancelled':
        return 'bg-red-100';
      default:
        return 'bg-green-100';
    }
  };

  return (
    <div
      className={cn(
        'h-12 border-b border-r relative transition-colors',
        getSlotColor(slot),
        slot?.isActive && 'hover:bg-opacity-80 cursor-pointer'
      )}
      onClick={onClick}
      onMouseEnter={onHover}
    >
      {slot && (
        <div className="absolute inset-0 p-1">
          <div className="text-xs">
            {slot.currentStudents}/{slot.maxStudents}
          </div>
          {slot.lessons && slot.lessons.length > 0 && (
            <div className="text-xs truncate">
              {slot.lessons.length} lesson{slot.lessons.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
