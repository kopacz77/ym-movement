// src/features/scheduling/hooks/useCalendarNavigation.ts
import { useState, useCallback } from 'react';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { CalendarView } from '../types';

export const useCalendarNavigation = (initialView: Partial<CalendarView> = {}) => {
  const [view, setView] = useState<CalendarView>({
    startDate: startOfWeek(new Date()),
    endDate: endOfWeek(new Date()),
    view: 'week',
    ...initialView,
  });

  const navigate = useCallback((direction: 'prev' | 'next') => {
    setView(currentView => {
      const { startDate, view: viewType } = currentView;
      let newStartDate: Date;
      if (viewType === 'week') {
        newStartDate = direction === 'next' ? addWeeks(startDate, 1) : subWeeks(startDate, 1);
      } else {
        newStartDate = direction === 'next' ? addMonths(startDate, 1) : subMonths(startDate, 1);
      }
      return {
        ...currentView,
        startDate: newStartDate,
        endDate: viewType === 'week' ? endOfWeek(newStartDate) : endOfWeek(addWeeks(newStartDate, 4)),
      };
    });
  }, []);

  const changeView = useCallback((newView: 'day' | 'week' | 'month') => {
    setView(currentView => ({
      ...currentView,
      view: newView,
      endDate: newView === 'week' ? endOfWeek(currentView.startDate) : endOfWeek(addWeeks(currentView.startDate, 4)),
    }));
  }, []);

  return { view, setView, navigate, changeView };
};
