// src/components/ui/responsive-form.tsx
import type * as React from "react";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

interface FormRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function FormRow({ children, className, ...props }: FormRowProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function FormItem({ children, className, ...props }: FormItemProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  );
}

interface FormLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  required?: boolean;
}

export function FormLabel({ children, required, className, ...props }: FormLabelProps) {
  return (
    <Label className={cn("text-sm font-medium", className)} {...props}>
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </Label>
  );
}

interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function FormSection({
  title,
  description,
  children,
  className,
  ...props
}: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-lg font-medium">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function FormActions({ children, className, ...props }: FormActionsProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "flex items-center",
        isMobile ? "flex-col-reverse space-y-reverse space-y-2" : "flex-row justify-end space-x-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
