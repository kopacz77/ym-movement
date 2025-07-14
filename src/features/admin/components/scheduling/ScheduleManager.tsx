// src/features/admin/components/scheduling/ScheduleManager.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useBulkOperations } from "@/contexts/BulkOperationsContext";
import { ExtendedCalendarEvent, useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useScheduleActions } from "@/hooks/useScheduleActions";
import { useTimeSlots } from "@/hooks/useTimeSlots";
import { localizer } from "@/lib/calendar/calendarLocalizer";
import { endOfDay, startOfDay } from "date-fns";
import { useCallback, useMemo, useState, memo } from "react";
import { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";

import { SlotInfo } from "react-big-calendar";
import { DesktopCalendarView } from "./DesktopCalendarView";
import { BulkCreateSlotsDialog, CreateTimeSlotDialog } from "./DialogComponents";
import { MobileCalendarView } from "./MobileCalendarView";
import { ScheduleHeader } from "./ScheduleHeader";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
// Import our components
import { TimeSlotDialogAdapter } from "./TimeSlotDialogAdapter";
import { type TimeSlot, formatDateRange } from "./calendarUtils";

// Define types for form data
interface TimeSlotFormData {
  startTime: Date | null;
  endTime: Date | null;
  rinkId?: string;
}

// Calendar schedule event type
interface ScheduleEvent {
  schedule: {
    id: string;
    start: Date;
    end: Date;
    raw: {
      rinkId: string;
      rink: {
        id: string;
        name: string;
        timezone: string;
      };
      maxStudents: number;
      isActive: boolean;
      lessons: unknown[];
      timeDisplay: string;
      timezone: string;
    };
  };
}

const ScheduleManagerComponent = () => {
  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);

  // Selected data state
  const [timeSlotFormData, setTimeSlotFormData] = useState<TimeSlotFormData | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  
  // Bulk selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set());

  // Media query hook
  const isMobile = useIsMobile();

  // Calendar state
  const initialDate = useMemo(() => new Date(), []);
  const [date, setDate] = useState(initialDate);
  const [calendarView, setCalendarView] = useState("week");
  const [selectedRink, setSelectedRink] = useState<string | undefined>(undefined);

  // Access bulk operations context
  useBulkOperations();

  // Use schedule actions hook for mutations
  const { deleteTimeSlot, deleteBulkTimeSlots, assignStudent, unassignStudent, updateTimeSlot } = useScheduleActions();

  // Calculate date range for fetching data
  const dateRange = useMemo(() => {
    const year = date.getFullYear();
    const month = date.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);

    return {
      start: startOfDay(firstDay),
      end: endOfDay(lastDay),
    };
  }, [date]);

  // Use the timeSlots hook to fetch data
  const { rinks, students, timeSlots } = useTimeSlots(dateRange, selectedRink);

  // Get current rink timezone
  const rinkTimezone = useMemo(() => {
    if (selectedRink && rinks) {
      const selectedRinkData = rinks.find(
        (rink: { id: string; timezone: string }) => rink.id === selectedRink,
      );
      return selectedRinkData?.timezone || "America/Los_Angeles";
    }
    // Default timezone if no rink is selected
    return "America/Los_Angeles";
  }, [selectedRink, rinks]);

  // Use calendar events hook
  const { events, processedEvents } = useCalendarEvents(timeSlots);

  // Handle user interactions
  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      setTimeSlotFormData({
        startTime: slotInfo.start,
        endTime: slotInfo.end,
        rinkId: selectedRink,
      });
      setIsCreateDialogOpen(true);
    },
    [selectedRink],
  );

  const handleCreateTimeSlotClick = useCallback(() => {
    setTimeSlotFormData({
      startTime: null,
      endTime: null,
      rinkId: selectedRink,
    });
    setIsCreateDialogOpen(true);
  }, [selectedRink]);

  const handleSelectEvent = useCallback((event: object) => {
    const typedEvent = event as ExtendedCalendarEvent;
    if (typedEvent.slot) {
      setSelectedSlot(typedEvent.slot);
      setIsManageDialogOpen(true);
    }
  }, []);

  const handleEventDrop = useCallback(
    (eventData: EventInteractionArgs<ExtendedCalendarEvent>) => {
      const { event, start, end } = eventData;
      if (event.id && start && end) {
        updateTimeSlot.mutate({
          id: event.id.toString(),
          startTime: new Date(start),
          endTime: new Date(end),
        });
      }
    },
    [updateTimeSlot],
  );

  // Navigation callbacks
  const goToPrev = useCallback(() => {
    setDate((prev) => {
      const newDate = new Date(prev);
      if (calendarView === "month") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (calendarView === "week") {
        newDate.setDate(newDate.getDate() - 7);
      } else if (calendarView === "day") {
        newDate.setDate(newDate.getDate() - 1);
      }
      return newDate;
    });
  }, [calendarView]);

  const goToNext = useCallback(() => {
    setDate((prev) => {
      const newDate = new Date(prev);
      if (calendarView === "month") {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (calendarView === "week") {
        newDate.setDate(newDate.getDate() + 7);
      } else if (calendarView === "day") {
        newDate.setDate(newDate.getDate() + 1);
      }
      return newDate;
    });
  }, [calendarView]);

  const goToToday = useCallback(() => {
    setDate(new Date());
  }, []);

  // Format the date range text for display
  const dateRangeText = useMemo(() => {
    return formatDateRange(date, calendarView);
  }, [date, calendarView]);

  // Handle view change
  const handleViewChange = useCallback((newView: string) => {
    setCalendarView(newView);
  }, []);

  // Handle time slot click in mobile view
  const handleMobileSlotClick = useCallback((slot: TimeSlot) => {
    setSelectedSlot(slot);
    setIsManageDialogOpen(true);
  }, []);

  // Prepare data for the edit dialog
  const handleEditSlot = useCallback(() => {
    const slotData = selectedEvent
      ? {
          startTime: selectedEvent.schedule.start || new Date(),
          endTime: selectedEvent.schedule.end || new Date(),
          rinkId: selectedEvent.schedule.raw.rinkId,
        }
      : {
          startTime: selectedSlot
            ? typeof selectedSlot.startTime === "string"
              ? new Date(selectedSlot.startTime)
              : new Date()
            : new Date(),
          endTime: selectedSlot
            ? typeof selectedSlot.endTime === "string"
              ? new Date(selectedSlot.endTime)
              : new Date()
            : new Date(),
          rinkId: selectedSlot?.Rink.id || "",
        };

    setTimeSlotFormData(slotData);
    setIsCreateDialogOpen(true);
    setIsManageDialogOpen(false);
  }, [selectedEvent, selectedSlot]);

  // Handle deleting a time slot
  const handleDeleteSlot = useCallback(() => {
    const slotId = selectedEvent ? selectedEvent.schedule.id : selectedSlot?.id || "";

    if (slotId) {
      deleteTimeSlot.mutate({ id: slotId });
    }
  }, [deleteTimeSlot, selectedEvent, selectedSlot]);

  // Handle assigning a student
  const handleAssignStudent = useCallback(
    (studentId: string) => {
      const timeSlotId = selectedEvent ? selectedEvent.schedule.id : selectedSlot?.id || "";

      console.log("Frontend assignment:", { timeSlotId, studentId, selectedEvent, selectedSlot });

      if (!timeSlotId) {
        console.error("No timeSlotId available for assignment");
        return;
      }

      if (!studentId) {
        console.error("No studentId provided for assignment");
        return;
      }

      assignStudent.mutate({
        timeSlotId,
        studentId,
      });
    },
    [assignStudent, selectedEvent, selectedSlot],
  );

  // Handle dialog close actions
  const handleCreateDialogClose = useCallback(() => {
    setIsCreateDialogOpen(false);
    setTimeSlotFormData(null);
  }, []);

  const handleBulkCreateClose = useCallback(() => {
    setIsBulkCreateOpen(false);
  }, []);

  const handleManageDialogClose = useCallback(() => {
    setSelectedEvent(null);
    setSelectedSlot(null);
    setIsManageDialogOpen(false);
  }, []);

  // Bulk selection handlers
  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => !prev);
    setSelectedSlotIds(new Set());
  }, []);

  const handleSlotSelection = useCallback((slotId: string, isSelected: boolean) => {
    setSelectedSlotIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(slotId);
      } else {
        newSet.delete(slotId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (timeSlots) {
      const allSlotIds = timeSlots.map(slot => slot.id);
      setSelectedSlotIds(new Set(allSlotIds));
    }
  }, [timeSlots]);

  const handleClearSelection = useCallback(() => {
    setSelectedSlotIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedSlotIds.size > 0) {
      deleteBulkTimeSlots.mutate({ 
        ids: Array.from(selectedSlotIds) 
      });
      setSelectedSlotIds(new Set());
      setIsSelectionMode(false);
    }
  }, [selectedSlotIds, deleteBulkTimeSlots]);

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <ScheduleHeader
        selectedRink={selectedRink}
        onRinkSelect={setSelectedRink}
        createTimeSlotButton={
          <CreateTimeSlotDialog
            isOpen={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            timeSlotFormData={timeSlotFormData}
            onCreateClick={handleCreateTimeSlotClick}
            rinks={rinks || []}
            onSubmitAction={handleCreateDialogClose}
          />
        }
        bulkCreateButton={
          <BulkCreateSlotsDialog
            isOpen={isBulkCreateOpen}
            onOpenChange={setIsBulkCreateOpen}
            rinks={rinks || []}
            onSubmitAction={handleBulkCreateClose}
          />
        }
        rinks={rinks || []}
      />

      {/* Timezone Information Banner */}
      {selectedRink && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-center text-amber-800">
          <span className="mr-2">🌐</span>
          <span>
            All times shown in {rinkTimezone.split("/").pop()?.replace("_", " ")} local time
          </span>
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        isSelectionMode={isSelectionMode}
        selectedCount={selectedSlotIds.size}
        onToggleSelectionMode={handleToggleSelectionMode}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkDelete={handleBulkDelete}
        isDeleting={deleteBulkTimeSlots.isPending}
      />

      {/* Time Slot Management Dialog - Using the adapter */}
      <TimeSlotDialogAdapter
        isOpen={isManageDialogOpen}
        onClose={handleManageDialogClose}
        onEdit={handleEditSlot}
        onDelete={handleDeleteSlot}
        selectedEvent={selectedEvent}
        selectedSlot={selectedSlot}
        students={students || []}
        onAssignStudent={handleAssignStudent}
        onUnassignStudent={(lessonId: string) => {
          if (lessonId) {
            unassignStudent.mutate({ lessonId });
          }
        }}
        isAssigning={assignStudent.isPending}
        isUnassigning={unassignStudent.isPending}
      />

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isMobile ? (
            // Mobile calendar view
            <MobileCalendarView
              dateRangeText={dateRangeText}
              calendarView={calendarView}
              onViewChangeAction={handleViewChange}
              onPrevAction={goToPrev}
              onNextAction={goToNext}
              onTodayAction={goToToday}
              groupedSlots={processedEvents}
              onSlotClickAction={handleMobileSlotClick}
              rinkTimezone={rinkTimezone}
              rinkName={selectedRink ? rinks?.find((r: any) => r.id === selectedRink)?.name : undefined}
              isSelectionMode={isSelectionMode}
              selectedSlotIds={selectedSlotIds}
              onSlotSelection={handleSlotSelection}
            />
          ) : (
            // Desktop calendar view - now a separate component
            <DesktopCalendarView
              localizer={localizer}
              events={events}
              date={date}
              calendarView={calendarView}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              onEventDrop={handleEventDrop}
              dateRangeText={dateRangeText}
              onViewChange={handleViewChange}
              onPrev={goToPrev}
              onNext={goToNext}
              onToday={goToToday}
              rinkTimezone={rinkTimezone}
              rinkName={selectedRink ? rinks?.find((r: any) => r.id === selectedRink)?.name : undefined}
              isSelectionMode={isSelectionMode}
              selectedSlotIds={selectedSlotIds}
              onSlotSelection={handleSlotSelection}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const ScheduleManager = memo(ScheduleManagerComponent);
