// src/hooks/useSanitizedInput.ts
import { useCallback } from "react";

/**
 * Client-side input sanitization hook (matches server-side logic)
 * Use this for real-time validation, but always validate on server-side too
 */
export function useSanitizedInput() {
  const sanitizeInput = useCallback((input: string): string => {
    if (!input) return "";

    return (
      input
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;")
        // Additional protection against script injections
        .replace(/javascript:/gi, "")
        .replace(/vbscript:/gi, "")
        .replace(/on\w+=/gi, "")
        // Limit length to prevent buffer overflow attacks
        .substring(0, 10000)
    );
  }, []);

  const sanitizeTextArea = useCallback((input: string): string => {
    if (!input) return "";

    // More lenient sanitization for text areas (preserves line breaks)
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/vbscript:/gi, "")
      .replace(/on\w+=/gi, "")
      .substring(0, 10000);
  }, []);

  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const validatePhone = useCallback((phone: string): boolean => {
    // Remove formatting and check if it's a valid phone number
    const cleanPhone = phone.replace(/\D/g, "");
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }, []);

  return {
    sanitizeInput,
    sanitizeTextArea,
    validateEmail,
    validatePhone,
  };
}