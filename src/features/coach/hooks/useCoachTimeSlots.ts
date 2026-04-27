import { useSession } from "next-auth/react";
import type { DateRange } from "@/hooks/useTimeSlots";
import { api } from "@/lib/api";

export function useCoachTimeSlots(dateRange: DateRange, selectedRink?: string) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const { data: rinks } = api.coach.schedule.getRinks.useQuery(undefined, {
    retry: 2,
    enabled: isAuthenticated,
  } as any);

  const { data: timeSlots } = api.coach.schedule.getMyTimeSlots.useQuery(
    {
      startDate: dateRange.start,
      endDate: dateRange.end,
      rinkId: selectedRink,
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 0,
      retry: 2,
      enabled: isAuthenticated,
    } as any,
  );

  const { data: blockedDates } = api.coach.schedule.getMyBlockedDates.useQuery(
    {
      startDate: dateRange.start,
      endDate: dateRange.end,
    },
    {
      retry: 2,
      enabled: isAuthenticated,
    } as any,
  );

  return { rinks, timeSlots, blockedDates };
}
