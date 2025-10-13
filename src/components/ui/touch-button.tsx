// src/components/ui/touch-button.tsx
"use client";

import type { VariantProps } from "class-variance-authority";
import React from "react";
import { Button, type buttonVariants } from "@/components/ui/button";
import { useTouchTarget } from "@/hooks/useTouchTarget";

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

interface TouchButtonProps extends ButtonProps {
  /**
   * Whether to apply touch optimizations
   * @default true
   */
  touchOptimized?: boolean;
  /**
   * Whether this is an icon-only button requiring special touch handling
   * @default false
   */
  isIconButton?: boolean;
}

/**
 * Touch-optimized button component that ensures WCAG 2.1 AA compliance
 * Automatically applies 44px minimum touch targets on mobile devices
 */
export const TouchButton = React.forwardRef<React.ElementRef<typeof Button>, TouchButtonProps>(
  (
    {
      className,
      size = "default",
      touchOptimized = true,
      isIconButton = false,
      children,
      ...props
    },
    ref,
  ) => {
    const { getTouchTargetClasses, getIconButtonClasses } = useTouchTarget();

    // Apply appropriate touch classes based on button type
    const touchClasses = touchOptimized
      ? isIconButton
        ? getIconButtonClasses(className)
        : getTouchTargetClasses(className)
      : className;

    return (
      <Button ref={ref} size={size} className={touchClasses} {...props}>
        {children}
      </Button>
    );
  },
);

TouchButton.displayName = "TouchButton";

/**
 * Touch-optimized icon button specifically designed for mobile interaction
 * Ensures proper padding and sizing for icon-only buttons
 */
export const TouchIconButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  Omit<TouchButtonProps, "isIconButton">
>(({ className, ...props }, ref) => {
  return <TouchButton ref={ref} className={className} isIconButton={true} {...props} />;
});

TouchIconButton.displayName = "TouchIconButton";
