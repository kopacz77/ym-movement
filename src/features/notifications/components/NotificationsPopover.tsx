// src/features/notifications/components/NotificationsPopover.tsx
"use client";

import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";

export const NotificationsPopover = () => {
  // ALL HOOKS MUST BE CALLED AT THE TOP - NEVER AFTER CONDITIONAL RETURNS
  const [open, setOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const utils = api.useUtils();
  const { data: session, status } = useSession();

  // Only fetch notifications if user is authenticated
  const isAuthenticated = Boolean(status === "authenticated" && session?.user);

  // Fetch notifications from API - ALWAYS call this hook, use enabled to control fetching
  const {
    data: notifications = [],
    isLoading,
    error,
  } = api.notifications.notifications.getNotifications.useQuery(undefined, {
    // Refresh notifications every minute
    refetchInterval: 60000,
    enabled: isAuthenticated, // Only fetch when authenticated
    retry: false, // Don't retry 401s
    onError: (error) => {
      // Don't show toast for auth errors
      if (error.data?.httpStatus !== 401) {
        console.error("Notifications error:", error.message);
      }
    },
  });

  // Mark as read mutation
  const markAsRead = api.notifications.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.notifications.getNotifications.invalidate();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  // Mark all as read mutation
  const markAllAsRead = api.notifications.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.notifications.getNotifications.invalidate();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  // Client-side hydration effect (must be at top level)
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render if not authenticated - check AFTER calling all hooks
  if (!isAuthenticated) {
    return null;
  }

  // Handle errors from query (but not auth errors)
  useEffect(() => {
    if (error && error.data?.httpStatus !== 401) {
      toast.error("Failed to load notifications", {
        description: error.message,
      });
    }
  }, [error]);

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Handle marking a notification as read
  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate({ id });
  };

  // Handle marking all notifications as read
  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  // Format relative time (client-side only to prevent hydration mismatch)
  const formatRelativeTime = (date: Date) => {
    if (!isClient) {
      return ""; // Return empty string on server
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "just now";
    }
    if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    }
    if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    }
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleNotificationKeyDown = (event: React.KeyboardEvent, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      handleMarkAsRead(id);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10 relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>
        {isLoading ? (
          <div className="p-4 text-center">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer hover:bg-muted ${
                    notification.isRead ? "" : "bg-blue-50"
                  }`}
                  onClick={() => handleMarkAsRead(notification.id)}
                  onKeyDown={(e) => handleNotificationKeyDown(e, notification.id)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={notification.isRead}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">{notification.title}</h4>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
};
