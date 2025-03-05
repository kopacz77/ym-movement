import { useToast } from "@/components/ui/use-toast";
import { TRPCClientError } from "@trpc/client";
import { useCallback } from "react";

export function useErrorHandler() {
  const { toast } = useToast();
  
  const onTRPCError = useCallback((error: TRPCClientError<any>) => {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  }, [toast]);

  return { onTRPCError };
}