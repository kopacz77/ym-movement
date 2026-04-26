import { Heart, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DelightfulLoadingProps {
  message?: string;
  className?: string;
}

function DelightfulLoading({
  message = "Loading something beautiful...",
  className,
}: DelightfulLoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 space-y-4", className)}>
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-200">
          <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Heart className="h-4 w-4 text-[#0891b2] animate-pulse" />
        </div>
      </div>
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
        <span className="animate-pulse">{message}</span>
        <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
      </div>
    </div>
  );
}

interface PersonalizedSkeletonProps {
  lines?: number;
  className?: string;
  showAvatar?: boolean;
}

function PersonalizedSkeleton({
  lines = 3,
  className,
  showAvatar = false,
}: PersonalizedSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              "h-4",
              i === 0 && "w-3/4",
              i === 1 && "w-full",
              i === 2 && "w-1/2",
              i > 2 && "w-2/3",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export { DelightfulLoading, PersonalizedSkeleton };
