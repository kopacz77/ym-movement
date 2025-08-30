import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const lessonStatusVariants = cva("", {
  variants: {
    status: {
      scheduled: "bg-blue-50 text-blue-700 border-blue-200",
      completed: "bg-green-50 text-green-700 border-green-200",
      cancelled: "bg-red-50 text-red-700 border-red-200",
      pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
      rescheduled: "bg-purple-50 text-purple-700 border-purple-200",
    },
  },
  defaultVariants: {
    status: "scheduled",
  },
});

const statusIcons = {
  scheduled: Calendar,
  completed: CheckCircle,
  cancelled: XCircle,
  pending: Clock,
  rescheduled: AlertCircle,
};

const statusLabels = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  pending: "Pending",
  rescheduled: "Rescheduled",
};

interface LessonStatusBadgeProps extends VariantProps<typeof lessonStatusVariants> {
  status: keyof typeof statusIcons;
  className?: string;
  showIcon?: boolean;
}

function LessonStatusBadge({ status, className, showIcon = true }: LessonStatusBadgeProps) {
  const Icon = statusIcons[status] || Clock;

  return (
    <Badge variant="outline" className={cn(lessonStatusVariants({ status }), className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {statusLabels[status]}
    </Badge>
  );
}

interface LessonStatusIndicatorProps {
  status: keyof typeof statusIcons;
  className?: string;
  size?: "sm" | "md" | "lg";
}

function LessonStatusIndicator({ status, className, size = "md" }: LessonStatusIndicatorProps) {
  const Icon = statusIcons[status] || Clock;

  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  const colorClasses = {
    scheduled: "text-blue-500",
    completed: "text-green-500",
    cancelled: "text-red-500",
    pending: "text-yellow-500",
    rescheduled: "text-purple-500",
  };

  return (
    <div
      className={cn("inline-flex items-center justify-center rounded-full", className)}
      title={statusLabels[status] || "Unknown"}
    >
      <Icon className={cn(sizeClasses[size], colorClasses[status] || "text-gray-500")} />
    </div>
  );
}

export { LessonStatusBadge, LessonStatusIndicator };
