// src/hooks/useTouchTarget.ts
"use client";

import { useIsMobile } from "@/hooks/useMediaQuery";

/**
 * Custom hook for managing touch-optimized UI elements
 * Ensures WCAG 2.1 AA compliance with 44px minimum touch targets
 */
export function useTouchTarget() {
  const isMobile = useIsMobile();

  /**
   * Get touch-optimized classes for general interactive elements
   * @param baseClasses - Base CSS classes to combine with touch classes
   * @returns Combined class string with touch optimizations
   */
  const getTouchTargetClasses = (baseClasses: string = "") => {
    const touchClasses = isMobile ? "min-h-[44px] min-w-[44px] touch-manipulation" : "";

    return `${baseClasses} ${touchClasses}`.trim();
  };

  /**
   * Get touch-optimized classes for icon buttons
   * @param baseClasses - Base CSS classes to combine with touch classes
   * @returns Combined class string optimized for icon buttons
   */
  const getIconButtonClasses = (baseClasses: string = "") => {
    const classes = isMobile
      ? "min-h-[44px] min-w-[44px] p-2" // Ensures 44px minimum with proper padding
      : "h-9 w-9 p-2"; // Desktop size maintains visual consistency

    return `${baseClasses} ${classes} touch-manipulation`.trim();
  };

  /**
   * Get spacing classes for touch-optimized layouts
   * @param baseSpacing - Base spacing classes
   * @returns Touch-optimized spacing classes
   */
  const getTouchSpacing = (baseSpacing: string = "gap-2") => {
    return isMobile
      ? "gap-3 sm:gap-4" // Increased mobile spacing
      : baseSpacing;
  };

  /**
   * Get dropdown menu item classes for touch optimization
   * @param baseClasses - Base CSS classes
   * @returns Touch-optimized dropdown item classes
   */
  const getDropdownItemClasses = (baseClasses: string = "") => {
    const touchClasses = isMobile ? "min-h-[44px] py-3 touch-manipulation" : "py-1.5";

    return `${baseClasses} ${touchClasses}`.trim();
  };

  /**
   * Get form input classes for touch optimization
   * @param baseClasses - Base CSS classes
   * @returns Touch-optimized form input classes
   */
  const getFormInputClasses = (baseClasses: string = "") => {
    const touchClasses = isMobile ? "min-h-[44px] touch-manipulation" : "";

    return `${baseClasses} ${touchClasses}`.trim();
  };

  return {
    isMobile,
    getTouchTargetClasses,
    getIconButtonClasses,
    getTouchSpacing,
    getDropdownItemClasses,
    getFormInputClasses,
  };
}
