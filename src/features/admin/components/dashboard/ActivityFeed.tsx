// src/features/admin/components/dashboard/ActivityFeed.tsx
"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export function ActivityFeed() {
  const { data: notifications = [], isLoading } =
    api.notifications.notifications.getNotifications.useQuery(undefined, {
      refetchInterval: 60000,
    });

  const recentItems = (notifications as any[]).slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 animate-pulse bg-muted rounded" />
            ))}
          </div>
        ) : recentItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No recent activity.</p>
        ) : (
          <div className="relative space-y-3">
            {/* Connecting line */}
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/20 via-accent/15 to-transparent" />
            {recentItems.map((item: any) => (
              <div key={item.id} className="flex items-start gap-3 relative">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 ring-2 ring-background z-10 ${item.isRead ? "bg-muted-foreground/30" : "bg-primary shadow-sm shadow-primary/30"}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
