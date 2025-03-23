// src/components/ui/responsive-dialog.tsx
"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/useMediaQuery";

// Re-export the original DialogTrigger
export { DialogTrigger };

// Responsive extensions of the Dialog components
export function ResponsiveDialog(props: React.ComponentProps<typeof Dialog>) {
  return <Dialog {...props} />;
}

export function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogContent>) {
  const isMobile = useIsMobile();

  return (
    <DialogContent
      className={cn(isMobile ? "w-[95%] max-w-lg p-4 rounded-lg" : "", className)}
      {...props}
    >
      {children}
    </DialogContent>
  );
}

export function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogHeader>) {
  const isMobile = useIsMobile();

  return <DialogHeader className={cn(isMobile ? "mb-4 space-y-1.5" : "", className)} {...props} />;
}

export function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogTitle>) {
  const isMobile = useIsMobile();

  return <DialogTitle className={cn(isMobile ? "text-lg" : "", className)} {...props} />;
}

export function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogDescription>) {
  const isMobile = useIsMobile();

  return <DialogDescription className={cn(isMobile ? "text-sm" : "", className)} {...props} />;
}

// Responsive dialog footer component
interface ResponsiveDialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function ResponsiveDialogFooter({
  className,
  children,
  ...props
}: ResponsiveDialogFooterProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        isMobile ? "gap-3 mt-4" : "",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
