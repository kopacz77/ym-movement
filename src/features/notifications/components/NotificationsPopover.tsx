// src/features/notifications/components/NotificationsPopover.tsx
"use client";

import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
}

export const NotificationsPopover = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  
  // Mock data - in production you'd fetch this from your API
  useEffect(() => {
    // Simulate API call with mock data
    const mockNotifications: Notification[] = [
      {
        id: "1",
        title: "New Booking",
        message: "You have a new booking request from John Doe.",
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        isRead: false,
      },
      {
        id: "2",
        title: "Lesson Reminder",
        message: "Your lesson with Coach Yura is scheduled for tomorrow at 3:00 PM.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
        isRead: false,
      },
      {
        id: "3",
        title: "Payment Received",
        message: "Payment of $75 has been successfully processed.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        isRead: true,
      },
    ];
    
    setNotifications(mockNotifications);
  }, []);

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Handle marking a notification as read
  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true }))
    );
  };

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) { return 'just now'; }
    if (diffInSeconds < 3600) { return `${Math.floor(diffInSeconds / 60)}m ago`; }
    if (diffInSeconds < 86400) { return `${Math.floor(diffInSeconds / 3600)}h ago`; }
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleNotificationKeyDown = (event: React.KeyboardEvent, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      markAsRead(id);
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
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 cursor-pointer hover:bg-muted ${notification.isRead ? '' : 'bg-blue-50'}`}
                  onClick={() => markAsRead(notification.id)}
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