import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as a USD currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Safely trims a string, handling null or undefined values
 */
export function safeTrim(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Safely parses a JSON string, returning default value if parsing fails
 */
export function safeJsonParse<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Safely gets a property from an object, even if properties are nested
 */
export function getNestedProperty<T>(obj: any, path: string, defaultValue: T): T {
  try {
    return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj) || defaultValue;
  } catch (e) {
    return defaultValue;
  }
}