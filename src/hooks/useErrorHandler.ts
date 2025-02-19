// src/hooks/useErrorHandler.ts
import { useToast } from "@/components/ui/use-toast";
import { TRPCClientError } from "@trpc/client";

export function useErrorHandler() {
  const { toast } = useToast();

  return {
    onTRPCError: (error: TRPCClientError<any>) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  };
}
