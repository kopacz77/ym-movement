// src/features/admin/components/scheduling/NewScheduleManager.tsx
"use client";

import { endOfDay, startOfDay } from "date-fns";
import { DateTime } from "luxon";
import { useCallback, useMemo, useState } from "react";
import { ScheduleCalendar } from "@/features/scheduling/components/calendar/ScheduleCalendar";
import {
  ScheduleProvider,
  useScheduleContext,
} from "@/features/scheduling/context/ScheduleContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useScheduleActions } from "@/hooks/useScheduleActions";
import { useTimeSlots } from "@/hooks/useTimeSlots";
import { api } from "@/lib/api";
import type { TimeSlot } from "@/types/scheduling";
import BlockedDateDialog from "./BlockedDateDialog";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { CompactTimeSlotDialog } from "./CompactTimeSlotDialog";
import { BulkCreateSlotsDialog } from "./DialogComponents";
import { TimeSlotDialogAdapter } from "./TimeSlotDialogAdapter";

function ScheduleDialogs() {
  const { state, dispatch } = useScheduleContext();
  const { createTimeSlot, deleteTimeSlot, deleteBulkTimeSlots, assignStudent, unassignStudent } =
    useScheduleActions();
  const { coachId: currentUserCoachId } = useCurrentUser();

  // Track the selected slot for the manage dialog (may update when unassigning)
  const [managedSlot, setManagedSlot] = useState<TimeSlot | null>(null);

  // Calculate date range for data fetching (same as ScheduleCalendar)
  const dateRange = useMemo(() => {
    const d = state.currentDate;
    if (state.view === "timeGridWeek") {
      const dt = DateTime.fromJSDate(d);
      const weekday = dt.weekday;
      const startOfWeek = dt.minus({ days: weekday === 1 ? 0 : weekday - 1 });
      return {
        start: startOfDay(startOfWeek.toJSDate()),
        end: endOfDay(startOfWeek.plus({ days: 6 }).toJSDate()),
      };
    }
    if (state.view === "timeGridDay") {
      return { start: startOfDay(d), end: endOfDay(d) };
    }
    const year = d.getFullYear();
    const month = d.getMonth();
    return {
      start: startOfDay(new Date(year, month, 1)),
      end: endOfDay(new Date(year, month + 1, 0)),
    };
  }, [state.currentDate, state.view]);

  const { rinks, students } = useTimeSlots(dateRange, state.selectedRinkId, state.selectedCoachId);
  const { data: coachesData } = api.admin.coach.management.getAllCoaches.useQuery();
  const activeCoaches = useMemo(
    () => coachesData?.coaches?.filter((c: any) => c.isApproved && c.isActive),
    [coachesData],
  );

  const closeDialog = useCallback(() => {
    dispatch({ type: "CLOSE_DIALOG" });
    setManagedSlot(null);
  }, [dispatch]);

  // Sync managedSlot when dialog opens
  const currentSlot = useMemo(() => {
    if (state.activeDialog.type === "manage") {
      return managedSlot || state.activeDialog.slot;
    }
    return null;
  }, [state.activeDialog, managedSlot]);

  // When manage dialog opens, track the slot
  useMemo(() => {
    if (state.activeDialog.type === "manage" && !managedSlot) {
      setManagedSlot(state.activeDialog.slot);
    }
  }, [state.activeDialog, managedSlot]);

  // Handler for creating time slot from CompactTimeSlotDialog
  const handleBookingSubmit = useCallback(
    (bookingData: {
      date: Date;
      startTime: string;
      endTime: string;
      rinkId: string;
      maxStudents: number;
      coachId?: string;
    }) => {
      // Build full Date objects from date + time strings (e.g. "09:00")
      const [startH, startM] = bookingData.startTime.split(":").map(Number);
      const [endH, endM] = bookingData.endTime.split(":").map(Number);
      const startDate = new Date(bookingData.date);
      startDate.setHours(startH, startM, 0, 0);
      const endDate = new Date(bookingData.date);
      endDate.setHours(endH, endM, 0, 0);

      createTimeSlot.mutate({
        rinkId: bookingData.rinkId,
        startTime: startDate,
        endTime: endDate,
        maxStudents: bookingData.maxStudents,
        coachId: bookingData.coachId,
      });
      closeDialog();
    },
    [createTimeSlot, closeDialog],
  );

  // Handler for editing a slot (opens create dialog with slot data)
  const handleEditSlot = useCallback(() => {
    if (!currentSlot) {
      return;
    }
    const startTime =
      typeof currentSlot.startTime === "string"
        ? new Date(currentSlot.startTime)
        : currentSlot.startTime;
    dispatch({
      type: "OPEN_CREATE_DIALOG",
      date: startTime,
      time: `${startTime.getHours().toString().padStart(2, "0")}:${startTime.getMinutes().toString().padStart(2, "0")}`,
      isBlockedDate: false,
    });
  }, [currentSlot, dispatch]);

  // Handler for deleting a slot
  const handleDeleteSlot = useCallback(() => {
    if (!currentSlot) {
      return;
    }
    deleteTimeSlot.mutate({ id: currentSlot.id });
    closeDialog();
  }, [currentSlot, deleteTimeSlot, closeDialog]);

  // Handler for assigning a student
  const handleAssignStudent = useCallback(
    (studentId: string) => {
      if (!currentSlot) {
        return;
      }
      assignStudent.mutate({ timeSlotId: currentSlot.id, studentId });
    },
    [currentSlot, assignStudent],
  );

  // Handler for unassigning a student
  const handleUnassignStudent = useCallback(
    (lessonId: string) => {
      if (!lessonId || !currentSlot) {
        return;
      }
      // Optimistically update the managed slot
      const currentLessons = Array.isArray(currentSlot.Lesson) ? currentSlot.Lesson : [];
      setManagedSlot({
        ...currentSlot,
        Lesson: currentLessons.filter((lesson) => lesson.id !== lessonId),
      });
      unassignStudent.mutate({ lessonId });
    },
    [currentSlot, unassignStudent],
  );

  return (
    <>
      {/* Create Time Slot Dialog */}
      {state.activeDialog.type === "create" && (
        <CompactTimeSlotDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              closeDialog();
            }
          }}
          selectedDate={state.activeDialog.date || undefined}
          selectedStartTime={state.activeDialog.time || undefined}
          selectedRinkId={state.selectedRinkId}
          selectedCoachId={state.selectedCoachId}
          onBookingSubmit={handleBookingSubmit}
          rinks={rinks || []}
          coaches={activeCoaches}
          currentUserCoachId={currentUserCoachId || undefined}
          isLoading={createTimeSlot.isPending}
          isBlockedDate={state.activeDialog.isBlockedDate}
        />
      )}

      {/* Manage Time Slot Dialog */}
      {state.activeDialog.type === "manage" && currentSlot && (
        <TimeSlotDialogAdapter
          isOpen={true}
          onClose={closeDialog}
          onEdit={handleEditSlot}
          onDelete={handleDeleteSlot}
          selectedEvent={null}
          selectedSlot={currentSlot as any}
          students={students || []}
          onAssignStudent={handleAssignStudent}
          onUnassignStudent={handleUnassignStudent}
          isAssigning={assignStudent.isPending}
          isUnassigning={unassignStudent.isPending}
        />
      )}

      {/* Bulk Create Dialog */}
      {state.activeDialog.type === "bulkCreate" && (
        <BulkCreateSlotsDialog
          isOpen={true}
          onOpenChange={(open) => {
            if (!open) {
              closeDialog();
            }
          }}
          rinks={rinks || []}
          onSubmitAction={closeDialog}
          coachId={state.selectedCoachId}
        />
      )}

      {/* Blocked Date Dialog */}
      {state.activeDialog.type === "blockedDate" && (
        <BlockedDateDialog
          isOpen={true}
          onClose={closeDialog}
          blockedRange={state.activeDialog.range}
        />
      )}

      {/* Bulk Actions (selection mode toolbar at bottom) */}
      {state.isSelectionMode && state.selectedSlotIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <BulkActionsToolbar
            isSelectionMode={true}
            selectedCount={state.selectedSlotIds.size}
            onToggleSelectionMode={() => dispatch({ type: "TOGGLE_SELECTION_MODE" })}
            onSelectAll={() => {}}
            onClearSelection={() => dispatch({ type: "CLEAR_SELECTION" })}
            onBulkDelete={() => {
              deleteBulkTimeSlots.mutate({ ids: [...state.selectedSlotIds] });
              dispatch({ type: "CLEAR_SELECTION" });
              dispatch({ type: "TOGGLE_SELECTION_MODE" });
            }}
            isDeleting={deleteBulkTimeSlots.isPending}
          />
        </div>
      )}
    </>
  );
}

export function NewScheduleManager() {
  return (
    <ScheduleProvider>
      <ScheduleCalendar />
      <ScheduleDialogs />
    </ScheduleProvider>
  );
}
