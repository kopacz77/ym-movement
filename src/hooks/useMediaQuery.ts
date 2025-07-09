// src/hooks/useMediaQuery.ts
"use client";

import { useEffect, useState } from "react";

/**
 * Custom hook for responsive media queries
 * @param query - CSS media query string (e.g., '(max-width: 768px)')
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with a default value (false) to ensure SSR compatibility
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if window is available (client-side only)
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query);

      // Initial check
      setMatches(media.matches);

      // Create listener function
      const listener = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };

      // Add the listener
      media.addEventListener("change", listener);

      // Clean up
      return () => {
        media.removeEventListener("change", listener);
      };
    }

    // If window is not available (SSR), keep the default value
    return undefined;
  }, [query]);

  // Return false during SSR to prevent hydration mismatch
  if (!mounted) {
    return false;
  }

  return matches;
}

// Predefined media query hooks for common breakpoints
export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
export const useIsTablet = () => useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
export const useIsLargeDesktop = () => useMediaQuery("(min-width: 1280px)");
