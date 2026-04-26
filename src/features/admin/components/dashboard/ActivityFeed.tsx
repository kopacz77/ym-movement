// src/features/admin/components/dashboard/ActivityFeed.tsx
"use client";

import { formatDistanceToNow } from "date-fns";
import { CheckCircle, Clock, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

// Map notification types to icons and colors
function getActivityStyle(title: string) {
  if (title.toLowerCase().includes("payment")) {
    return { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" };
  }
  if (title.toLowerCase().includes("book") || title.toLowerCase().includes("lesson")) {
    return { icon: Clock, color: "text-blue-600", bg: "bg-blue-50" };
  }
  if (title.toLowerCase().includes("regist") || title.toLowerCase().includes("sign")) {
    return { icon: UserPlus, color: "text-violet-600", bg: "bg-violet-50" };
  }
  return { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" };
}

export function ActivityFeed() {
  const { data: notifications = [], isLoading } =
    api.notifications.notifications.getNotifications.useQuery(undefined, {
      refetchInterval: 60000,
    });

  const recentItems = (notifications as any[]).slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-muted rounded-lg" />
            ))}
          </div>
        ) : recentItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No recent activity.</p>
        ) : (
          <div className="relative space-y-4">
            {/* Vertical gradient line behind dots */}
            <div className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

            {recentItems.map((item: any) => {
              const style = getActivityStyle(item.title);
              const Icon = style.icon;

              return (
                <div key={item.id} className="relative flex items-start gap-4">
                  {/* Colored dot */}
                  <div
                    className={`w-8 h-8 rounded-full ${style.bg} ${style.color} flex items-center justify-center shrink-0 z-10`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Activity card */}
                  <div className="flex-1 p-3 rounded-lg bg-background border border-border/30">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      <time className="text-xs text-muted-foreground whitespace-nowrap ml-3">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </time>
                    </div>
                    {item.message && (
                      <p className="text-xs text-muted-foreground truncate">{item.message}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
