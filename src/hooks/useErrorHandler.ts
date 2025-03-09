import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";
import { useCallback } from "react";

export function useErrorHandler() {
  const onTRPCError = useCallback((error: TRPCClientError<any>) => {
    toast.error("Error", {
      description: error.message
    });
  }, []);

  return { onTRPCError };
}