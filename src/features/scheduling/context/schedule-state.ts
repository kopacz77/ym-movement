// src/features/scheduling/context/schedule-state.ts
import type { TimeSlot } from "@/types/scheduling";

export type CalendarView = "timeGridWeek" | "timeGridDay" | "dayGridMonth";

export interface ScheduleState {
  // Calendar navigation
  currentDate: Date;
  view: CalendarView;

  // Filters
  selectedRinkId: string | undefined;
  selectedCoachId: string | undefined;
  timezoneFilter: string;

  // Bulk selection
  isSelectionMode: boolean;
  selectedSlotIds: Set<string>;

  // Active dialogs (which one is open, with what data)
  activeDialog:
    | { type: "none" }
    | { type: "create"; date: Date | null; time: string | null; isBlockedDate: boolean }
    | { type: "manage"; slot: TimeSlot }
    | { type: "bulkCreate" }
    | { type: "blockedDate"; range: any };
}

export type ScheduleAction =
  | { type: "SET_DATE"; date: Date }
  | { type: "SET_VIEW"; view: CalendarView }
  | { type: "NAVIGATE_PREV" }
  | { type: "NAVIGATE_NEXT" }
  | { type: "NAVIGATE_TODAY" }
  | { type: "SET_RINK"; rinkId: string | undefined }
  | { type: "SET_COACH"; coachId: string | undefined }
  | { type: "SET_TIMEZONE_FILTER"; timezone: string }
  | { type: "TOGGLE_SELECTION_MODE" }
  | { type: "TOGGLE_SLOT_SELECTION"; slotId: string }
  | { type: "SELECT_ALL_SLOTS"; slotIds: string[] }
  | { type: "CLEAR_SELECTION" }
  | { type: "OPEN_CREATE_DIALOG"; date: Date | null; time: string | null; isBlockedDate?: boolean }
  | { type: "OPEN_MANAGE_DIALOG"; slot: TimeSlot }
  | { type: "OPEN_BULK_CREATE" }
  | { type: "OPEN_BLOCKED_DATE_DIALOG"; range: any }
  | { type: "CLOSE_DIALOG" };

export const initialScheduleState: ScheduleState = {
  currentDate: new Date(),
  view: "timeGridWeek",
  selectedRinkId: undefined,
  selectedCoachId: undefined,
  timezoneFilter: "America/Los_Angeles",
  isSelectionMode: false,
  selectedSlotIds: new Set(),
  activeDialog: { type: "none" },
};

export function scheduleReducer(state: ScheduleState, action: ScheduleAction): ScheduleState {
  switch (action.type) {
    case "SET_DATE":
      return { ...state, currentDate: action.date };

    case "SET_VIEW":
      return { ...state, view: action.view };

    case "NAVIGATE_PREV": {
      const d = new Date(state.currentDate);
      if (state.view === "dayGridMonth") {
        d.setMonth(d.getMonth() - 1);
      } else if (state.view === "timeGridWeek") {
        d.setDate(d.getDate() - 7);
      } else {
        d.setDate(d.getDate() - 1);
      }
      return { ...state, currentDate: d };
    }

    case "NAVIGATE_NEXT": {
      const d = new Date(state.currentDate);
      if (state.view === "dayGridMonth") {
        d.setMonth(d.getMonth() + 1);
      } else if (state.view === "timeGridWeek") {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(d.getDate() + 1);
      }
      return { ...state, currentDate: d };
    }

    case "NAVIGATE_TODAY":
      return { ...state, currentDate: new Date(), view: "timeGridDay" };

    case "SET_RINK":
      return { ...state, selectedRinkId: action.rinkId };

    case "SET_COACH":
      return { ...state, selectedCoachId: action.coachId };

    case "SET_TIMEZONE_FILTER":
      return { ...state, timezoneFilter: action.timezone };

    case "TOGGLE_SELECTION_MODE":
      return {
        ...state,
        isSelectionMode: !state.isSelectionMode,
        selectedSlotIds: new Set(),
      };

    case "TOGGLE_SLOT_SELECTION": {
      const next = new Set(state.selectedSlotIds);
      if (next.has(action.slotId)) {
        next.delete(action.slotId);
      } else {
        next.add(action.slotId);
      }
      return { ...state, selectedSlotIds: next };
    }

    case "SELECT_ALL_SLOTS":
      return { ...state, selectedSlotIds: new Set(action.slotIds) };

    case "CLEAR_SELECTION":
      return { ...state, selectedSlotIds: new Set() };

    case "OPEN_CREATE_DIALOG":
      return {
        ...state,
        activeDialog: {
          type: "create",
          date: action.date,
          time: action.time,
          isBlockedDate: action.isBlockedDate ?? false,
        },
      };

    case "OPEN_MANAGE_DIALOG":
      return { ...state, activeDialog: { type: "manage", slot: action.slot } };

    case "OPEN_BULK_CREATE":
      return { ...state, activeDialog: { type: "bulkCreate" } };

    case "OPEN_BLOCKED_DATE_DIALOG":
      return { ...state, activeDialog: { type: "blockedDate", range: action.range } };

    case "CLOSE_DIALOG":
      return { ...state, activeDialog: { type: "none" } };

    default:
      return state;
  }
}
