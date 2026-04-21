"use client";

import { CalendarDays, Loader2, Unlink } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export function GoogleCalendarConnect() {
  const searchParams = useSearchParams();
  const { data: status, isLoading } = api.coach.profile.getCalendarStatus.useQuery();
  const utils = api.useUtils();

  const disconnect = api.coach.profile.disconnectCalendar.useMutation({
    onSuccess: () => {
      toast.success("Google Calendar disconnected");
      utils.coach.profile.getCalendarStatus.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to disconnect calendar", {
        description: error.message,
      });
    },
  });

  useEffect(() => {
    const calendarParam = searchParams.get("calendar");
    if (calendarParam === "connected") {
      toast.success("Google Calendar connected successfully");
    } else if (calendarParam === "error") {
      toast.error("Failed to connect Google Calendar", {
        description: "Please try again or contact support.",
      });
    }
  }, [searchParams]);

  function handleConnect() {
    window.location.href = "/api/auth/google-calendar";
  }

  function handleDisconnect() {
    disconnect.mutate();
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-48" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Google Calendar
            </CardTitle>
            <CardDescription>Sync your lessons with Google Calendar</CardDescription>
          </div>
          {status?.isConnected ? (
            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary">Not Connected</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {status?.isConnected ? (
          <div className="space-y-3">
            {status.calendarId && (
              <p className="text-sm text-muted-foreground">Calendar: {status.calendarId}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
              className="text-destructive hover:text-destructive"
            >
              {disconnect.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Unlink className="h-4 w-4 mr-2" />
              )}
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Google Calendar to automatically sync lesson events.
            </p>
            <Button onClick={handleConnect} size="sm">
              <CalendarDays className="h-4 w-4 mr-2" />
              Connect Google Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
