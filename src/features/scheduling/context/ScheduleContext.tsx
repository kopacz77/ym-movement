// src/features/scheduling/context/ScheduleContext.tsx
"use client";

import { createContext, type Dispatch, type ReactNode, useContext, useReducer } from "react";
import {
  initialScheduleState,
  type ScheduleAction,
  type ScheduleState,
  scheduleReducer,
} from "./schedule-state";

interface ScheduleContextValue {
  state: ScheduleState;
  dispatch: Dispatch<ScheduleAction>;
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(scheduleReducer, initialScheduleState);

  return (
    <ScheduleContext.Provider value={{ state, dispatch }}>{children}</ScheduleContext.Provider>
  );
}

export function useScheduleContext() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) {
    throw new Error("useScheduleContext must be used within a ScheduleProvider");
  }
  return ctx;
}
