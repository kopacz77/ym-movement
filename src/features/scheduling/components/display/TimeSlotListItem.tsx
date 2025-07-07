// src/features/scheduling/components/TimeSlotListItem.tsx
import { formatRinkTime } from "@/lib/timezone";
import { type TimeSlot } from "@/types/scheduling";
import { format } from "date-fns";

interface TimeSlotListItemProps {
  slot: TimeSlot;
  onClick: (slot: TimeSlot) => void;
}

export function TimeSlotListItem({ slot, onClick }: TimeSlotListItemProps) {
  const studentCount = slot.Lesson?.length || 0;
  const studentNames = slot.Lesson
    ?.map((lesson) => lesson.Student.User.name || "Unnamed Student")
    .join(", ");

  // Determine if the slot is booked
  const isBooked = studentCount > 0;

  // Use formatRinkTime to display time in rink's timezone
  const startTimeFormatted = formatRinkTime(slot.startTime, slot.Rink.timezone);
  const endTimeFormatted = formatRinkTime(slot.endTime, slot.Rink.timezone);

  // Format the date for accessibility
  const dateFormatted = format(new Date(slot.startTime), "EEEE, MMMM d");

  return (
    <button
      type="button"
      className={`p-3 border-b last:border-0 cursor-pointer hover:bg-slate-50 w-full text-left ${
        isBooked ? "bg-emerald-50 hover:bg-emerald-100" : ""
      }`}
      onClick={() => onClick(slot)}
      aria-label={`Time slot on ${dateFormatted} from ${startTimeFormatted} to ${endTimeFormatted} with ${studentCount} of ${
        slot.maxStudents
      } students${studentNames ? `, assigned to ${studentNames}` : ""}`}
    >
      <div className="flex justify-between">
        <div className="font-medium">{`${startTimeFormatted} - ${endTimeFormatted}`}</div>
        <div>{`${studentCount}/${slot.maxStudents}`}</div>
      </div>
      <div className="text-sm text-gray-600 flex justify-between">
        <div className="break-words pr-2">{slot.Rink.name}</div>
        {studentNames && <div className="italic break-words">{studentNames}</div>}
      </div>
    </button>
  );
}
