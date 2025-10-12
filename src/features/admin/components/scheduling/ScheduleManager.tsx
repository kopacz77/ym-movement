// src/features/admin/components/scheduling/ScheduleManager.tsx
"use client";

import { endOfDay, startOfDay } from "date-fns";
import { memo, useCallback, useMemo, useState } from "react";
import type { SlotInfo } from "react-big-calendar";
import type { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { Card, CardContent } from "@/components/ui/card";
import { useBulkOperations } from "@/contexts/BulkOperationsContext";
import { type ExtendedCalendarEvent, useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useScheduleActions } from "@/hooks/useScheduleActions";
import { useTimeSlots } from "@/hooks/useTimeSlots";
import { api } from "@/lib/api";
import { localizer } from "@/lib/calendar/calendarLocalizer";
import BlockedDateDialog from "./BlockedDateDialog";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { CompactTimeSlotDialog } from "./CompactTimeSlotDialog";
import { formatDateRange, type TimeSlot } from "./calendarUtils";
import { DateRangeFilter } from "./DateRangeFilter";
import { DesktopCalendarView } from "./DesktopCalendarView";
import { BulkCreateSlotsDialog } from "./DialogComponents";
import { MobileCalendarView } from "./MobileCalendarView";
import { ScheduleHeader } from "./ScheduleHeader";
// Import our components
import { TimeSlotDialogAdapter } from "./TimeSlotDialogAdapter";
import { WorkingBlockedDatesManager } from "./WorkingBlockedDatesManager";

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
  const [isBlockedDateDialogOpen, setIsBlockedDateDialogOpen] = useState(false);
  const [selectedBlockedRange, setSelectedBlockedRange] = useState<any>(null);

  // Selected data state
  const [timeSlotFormData, setTimeSlotFormData] = useState<TimeSlotFormData | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [selectedCalendarTime, setSelectedCalendarTime] = useState<string | null>(null);

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
  const {
    createTimeSlot,
    deleteTimeSlot,
    deleteBulkTimeSlots,
    assignStudent,
    unassignStudent,
    updateTimeSlot,
    utils,
  } = useScheduleActions();

  // Day detail view state
  const [dayDetailDate, setDayDetailDate] = useState<Date | null>(null);
  const [showDayDetail, setShowDayDetail] = useState(false);

  // Date range filter state
  const [dateRangeFrom, setDateRangeFrom] = useState<Date | undefined>();
  const [dateRangeTo, setDateRangeTo] = useState<Date | undefined>();

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

  // Fetch blocked date ranges from database
  const { data: blockedDateRanges = [] } = api.admin.schedule.getBlockedDates.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

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
      // Extract date and time from calendar click for compact form
      const clickedDate = slotInfo.start;
      const clickedTime = `${clickedDate.getHours().toString().padStart(2, "0")}:${clickedDate.getMinutes().toString().padStart(2, "0")}`;

      setSelectedCalendarDate(clickedDate);
      setSelectedCalendarTime(clickedTime);
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
    // Clear calendar context when using button (not clicking on calendar)
    setSelectedCalendarDate(null);
    setSelectedCalendarTime(null);
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
      console.log("Selected event:", typedEvent);

      // Check if this is a blocked date
      if ("isBlocked" in typedEvent.slot && typedEvent.slot.isBlocked) {
        console.log("Blocked date selected, showing blocked date dialog");
        setSelectedBlockedRange(
          "blockedRange" in typedEvent.slot ? typedEvent.slot.blockedRange : null,
        );
        setIsBlockedDateDialogOpen(true);
      } else {
        // Regular time slot
        setSelectedSlot(typedEvent.slot);
        setIsManageDialogOpen(true);
      }
    }
  }, []);

  const handleEventDrop = useCallback(
    (eventData: EventInteractionArgs<ExtendedCalendarEvent>) => {
      const { event, start, end } = eventData;

      // Prevent dragging blocked dates
      if (event.slot && "isBlocked" in event.slot && event.slot.isBlocked) {
        console.log("Cannot drag blocked dates - they are static periods");
        return;
      }

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
  const handleViewChange = useCallback(
    (newView: string) => {
      setCalendarView(newView);
      // Close day detail when changing views
      if (showDayDetail) {
        setShowDayDetail(false);
        setDayDetailDate(null);
      }
    },
    [showDayDetail],
  );

  // Handle date change (from enhanced header)
  const handleDateChange = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  // Handle day click for day detail view
  const handleDayClick = useCallback((clickedDate: Date) => {
    setDayDetailDate(clickedDate);
    setShowDayDetail(true);
  }, []);

  // Handle back to month from day detail
  const handleBackToMonth = useCallback(() => {
    setShowDayDetail(false);
    setDayDetailDate(null);
    setCalendarView("month");
  }, []);

  // Handle create slot from day detail
  const handleCreateSlotFromDay = useCallback(
    (date: Date) => {
      const startTime = new Date(date);
      startTime.setHours(9, 0, 0, 0); // Default to 9 AM
      const endTime = new Date(date);
      endTime.setHours(10, 0, 0, 0); // Default to 10 AM

      setTimeSlotFormData({
        startTime,
        endTime,
        rinkId: selectedRink,
      });
      setIsCreateDialogOpen(true);
    },
    [selectedRink],
  );

  // Handle edit slot from day detail
  const handleEditSlotFromDay = useCallback((slot: TimeSlot) => {
    setSelectedSlot(slot);
    setIsManageDialogOpen(true);
  }, []);

  // Handle delete slot from day detail
  const handleDeleteSlotFromDay = useCallback(
    (slotId: string) => {
      deleteTimeSlot.mutate({ id: slotId });
    },
    [deleteTimeSlot],
  );

  // Handle time slot click in mobile view
  const handleMobileSlotClick = useCallback((slot: TimeSlot) => {
    setSelectedSlot(slot);
    setIsManageDialogOpen(true);
  }, []);

  // Prepare data for the edit dialog
  const handleEditSlot = useCallback(() => {
    console.log(
      "handleEditSlot called with selectedEvent:",
      selectedEvent,
      "selectedSlot:",
      selectedSlot,
    );
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
          rinkId:
            selectedSlot?.Rink?.id ||
            (selectedSlot && "rinkId" in selectedSlot ? (selectedSlot as any).rinkId : "") ||
            "",
        };

    console.log("Generated slotData:", slotData);
    setTimeSlotFormData(slotData);
    setIsCreateDialogOpen(true);
    setIsManageDialogOpen(false);
  }, [selectedEvent, selectedSlot]);

  // Handle deleting a time slot
  const handleDeleteSlot = useCallback(() => {
    const slotId = selectedEvent ? selectedEvent.schedule.id : selectedSlot?.id || "";
    console.log(
      "handleDeleteSlot called with selectedEvent:",
      selectedEvent,
      "selectedSlot:",
      selectedSlot,
      "slotId:",
      slotId,
    );

    if (slotId) {
      console.log("Calling deleteTimeSlot.mutate with id:", slotId);
      deleteTimeSlot.mutate({ id: slotId });
    } else {
      console.error("No slotId found for deletion");
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

      // Find the student being assigned
      const student = students?.find((s: any) => s.id === studentId);
      if (!student) {
        console.error("Student not found");
        return;
      }

      // Immediately update the selected slot/event in the dialog
      if (selectedSlot) {
        const updatedSlot = {
          ...selectedSlot,
          Lesson: [
            ...(selectedSlot.Lesson || []),
            {
              id: `optimistic-${Date.now()}`,
              Student: student,
              timeSlotId: timeSlotId,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        };
        setSelectedSlot(updatedSlot);
      }

      if (selectedEvent) {
        const updatedEvent = {
          ...selectedEvent,
          schedule: {
            ...selectedEvent.schedule,
            raw: {
              ...selectedEvent.schedule.raw,
              lessons: [
                ...(selectedEvent.schedule.raw.lessons || []),
                {
                  id: `optimistic-${Date.now()}`,
                  Student: student,
                  timeSlotId: timeSlotId,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ],
            },
          },
        };
        setSelectedEvent(updatedEvent);
      }

      // The optimistic update will handle cache updates
      assignStudent.mutate({
        timeSlotId,
        studentId,
      });
    },
    [assignStudent, selectedEvent, selectedSlot, students, setSelectedSlot, setSelectedEvent],
  );

  // Handle enhanced booking dialog submission
  const handleEnhancedBookingSubmit = useCallback(
    (bookingData: {
      date: Date;
      startTime: string;
      endTime: string;
      rinkId: string;
      maxStudents: number;
    }) => {
      // Convert time strings to full Date objects
      const startDateTime = new Date(bookingData.date);
      const [startHours, startMinutes] = bookingData.startTime.split(":").map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(bookingData.date);
      const [endHours, endMinutes] = bookingData.endTime.split(":").map(Number);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      createTimeSlot.mutate({
        rinkId: bookingData.rinkId,
        startTime: startDateTime,
        endTime: endDateTime,
        maxStudents: bookingData.maxStudents,
        isActive: true,
      });
    },
    [createTimeSlot],
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

  const handleBlockedDateDialogClose = useCallback(() => {
    setSelectedBlockedRange(null);
    setIsBlockedDateDialogOpen(false);
  }, []);

  // Bulk selection handlers
  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    setSelectedSlotIds(new Set());
  }, []);

  const handleSlotSelection = useCallback((slotId: string, isSelected: boolean) => {
    setSelectedSlotIds((prev) => {
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
      const allSlotIds = timeSlots.map((slot) => slot.id);
      setSelectedSlotIds(new Set(allSlotIds));
    }
  }, [timeSlots]);

  const handleClearSelection = useCallback(() => {
    setSelectedSlotIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedSlotIds.size > 0) {
      deleteBulkTimeSlots.mutate({
        ids: Array.from(selectedSlotIds),
      });
      setSelectedSlotIds(new Set());
      setIsSelectionMode(false);
    }
  }, [selectedSlotIds, deleteBulkTimeSlots]);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header with controls */}
      <ScheduleHeader
        selectedRink={selectedRink}
        onRinkSelect={setSelectedRink}
        createTimeSlotButton={
          <CompactTimeSlotDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            selectedDate={selectedCalendarDate || undefined}
            selectedStartTime={selectedCalendarTime || undefined}
            selectedRinkId={selectedRink}
            onBookingSubmit={handleEnhancedBookingSubmit}
            rinks={rinks || []}
            isLoading={createTimeSlot.isPending}
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
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={handleToggleSelectionMode}
        dateRangeFilter={
          <DateRangeFilter
            dateFrom={dateRangeFrom}
            dateTo={dateRangeTo}
            onDateFromChange={setDateRangeFrom}
            onDateToChange={setDateRangeTo}
          />
        }
        travelDateBlocker={<WorkingBlockedDatesManager />}
      />

      {/* Timezone Information Banner */}
      {selectedRink && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-center text-amber-800 text-sm">
          <span className="mr-2">🌐</span>
          <span className="truncate" suppressHydrationWarning>
            All times shown in {rinkTimezone.split("/").pop()?.replace("_", " ")} local time
          </span>
        </div>
      )}

      {/* Bulk Actions Toolbar - Only show when in selection mode */}
      {isSelectionMode && (
        <BulkActionsToolbar
          isSelectionMode={isSelectionMode}
          selectedCount={selectedSlotIds.size}
          onToggleSelectionMode={handleToggleSelectionMode}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onBulkDelete={handleBulkDelete}
          isDeleting={deleteBulkTimeSlots.isPending}
        />
      )}

      {/* Time Slot Management Dialog - Using the adapter */}
      <TimeSlotDialogAdapter
        isOpen={isManageDialogOpen}
        onClose={handleManageDialogClose}
        onEdit={handleEditSlot}
        onDelete={handleDeleteSlot}
        selectedEvent={selectedEvent as any}
        selectedSlot={selectedSlot}
        students={students || []}
        onAssignStudent={handleAssignStudent}
        onUnassignStudent={(lessonId: string) => {
          if (lessonId) {
            // Immediately update the selected slot in the dialog
            if (selectedSlot) {
              const updatedSlot = {
                ...selectedSlot,
                Lesson: (selectedSlot.Lesson || []).filter((lesson: any) => lesson.id !== lessonId),
              };
              setSelectedSlot(updatedSlot);
            }

            // Note: selectedEvent is typically null when clicking from calendar
            // The dialog uses selectedSlot which is updated above

            // The optimistic update will handle cache updates
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
              rinkName={
                selectedRink ? rinks?.find((r: any) => r.id === selectedRink)?.name : undefined
              }
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
              rinkName={
                selectedRink ? rinks?.find((r: any) => r.id === selectedRink)?.name : undefined
              }
              isSelectionMode={isSelectionMode}
              selectedSlotIds={selectedSlotIds}
              onSlotSelection={handleSlotSelection}
              timeSlots={timeSlots}
              onDayClick={handleDayClick}
              onDateChange={handleDateChange}
              onCreateSlot={handleCreateSlotFromDay}
              onEditSlot={handleEditSlotFromDay}
              onDeleteSlot={handleDeleteSlotFromDay}
              useEnhancedHeader={true}
              blockedDateRanges={blockedDateRanges as any}
            />
          )}
        </CardContent>
      </Card>

      {/* Blocked Date Management Dialog */}
      <BlockedDateDialog
        isOpen={isBlockedDateDialogOpen}
        onClose={handleBlockedDateDialogClose}
        blockedRange={selectedBlockedRange}
      />
    </div>
  );
};

export const ScheduleManager = memo(ScheduleManagerComponent);
