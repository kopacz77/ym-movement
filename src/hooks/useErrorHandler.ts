import type { AppRouter } from "@/lib/root";
import type { TRPCClientError } from "@trpc/client";
import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Custom hook to handle errors in a consistent way across the application
 */
export function useErrorHandler() {
  /**
   * Handle TRPC errors with appropriate toast messages
   */
  const onTRPCError = useCallback((error: TRPCClientError<AppRouter>) => {
    // Extract error details
    const statusCode = error.data?.httpStatus;
    const errorCode = error.data?.code;
    const message = error.message;

    // Create a user-friendly error message
    let title = "Error";
    let description = message;

    // Handle specific error types
    if (errorCode === "CONFLICT") {
      title = "Scheduling Conflict";
    } else if (errorCode === "NOT_FOUND") {
      title = "Not Found";
    } else if (errorCode === "UNAUTHORIZED" || errorCode === "FORBIDDEN") {
      title = "Access Denied";
      description = "You don't have permission to perform this action.";
    } else if (errorCode === "BAD_REQUEST") {
      title = "Invalid Request";
    } else if (statusCode === 429) {
      title = "Too Many Requests";
      description = "Please try again in a moment.";
    } else if (statusCode && statusCode >= 500) {
      title = "Server Error";
      description = "A server error occurred. Please try again later.";
    }

    // Show toast with appropriate styling
    toast.error(title, {
      description,
      duration: 5000, // Show for 5 seconds
    });

    // Log error to console for debugging
    console.error("TRPC Error:", {
      message,
      code: errorCode,
      status: statusCode,
      path: error.data?.path,
      stack: error.stack,
    });
  }, []);

  /**
   * Handle generic errors (non-TRPC)
   */
  const onError = useCallback((error: Error) => {
    toast.error("An error occurred", {
      description: error.message,
      duration: 5000,
    });
    console.error("General Error:", error);
  }, []);

  return {
    onTRPCError,
    onError,
  };
}
