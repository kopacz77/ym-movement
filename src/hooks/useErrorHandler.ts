import { toast } from "sonner";
import type { TRPCClientError } from "@trpc/client";
import { useCallback } from "react";
import type { AppRouter } from "@/server/api/roots";

export function useErrorHandler() {
  const onTRPCError = useCallback((error: TRPCClientError<AppRouter>) => {
    toast.error("Error", {
      description: error.message,
    });
  }, []);

  return { onTRPCError };
}
