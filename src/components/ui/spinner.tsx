// src/components/ui/spinner.tsx
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} />;
}

export function LoadingIndicator({
  size = "md",
  text = "Loading...",
  className,
}: SpinnerProps & { text?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-2", className)}>
      <Spinner size={size} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
