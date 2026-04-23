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
          <div className="relative pl-4">
            {/* Vertical gradient line */}
            <div className="absolute left-[7px] top-2 bottom-4 w-px bg-border" />
            <div className="space-y-6">
              {recentItems.map((item: any) => (
                <div key={item.id} className="relative pl-6">
                  <div
                    className={`absolute left-[-4px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-background z-10 ${item.isRead ? "bg-muted-foreground/20" : "bg-primary ring-2 ring-primary/15"}`}
                  />
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
