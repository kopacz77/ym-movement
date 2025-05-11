// src/features/admin/components/scheduling/UndoBulkCreationButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useBulkOperations } from "@/contexts/BulkOperationsContext";
import { api } from "@/lib/api";
import { Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BulkDeleteResult {
  success: boolean;
  count: number;
  message?: string;
}

export function UndoBulkCreationButton() {
  const { lastBulkCreation, clearLastBulkCreation } = useBulkOperations();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const utils = api.useContext();

  // Check if operation is relevant (less than 1 hour old)
  const isRelevant = lastBulkCreation && Date.now() - lastBulkCreation.timestamp < 60 * 60 * 1000;
  
  // If no relevant bulk operation exists, show a disabled button as a fallback
  if (!lastBulkCreation || !isRelevant || lastBulkCreation.operation !== "create") {
    // Clear outdated operations
    if (lastBulkCreation && !isRelevant) {
      clearLastBulkCreation();
    }

    // Return a disabled button instead of null, so it's always visible
    return (
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-1"
        disabled={true}
      >
        <Undo2 className="h-4 w-4" />
        Undo Bulk Creation
      </Button>
    );
  }

  const deleteBulkMutation = api.admin.schedule.deleteBulkTimeSlots.useMutation({
    onSuccess: (result: BulkDeleteResult) => {
      toast.success("Bulk Creation Undone", {
        description: `Successfully deleted ${result.count} time slots.`,
      });
      clearLastBulkCreation();
      
      // Invalidate queries to refresh the UI
      utils.admin.schedule.getTimeSlots.invalidate();
    },
    onError: (error) => {
      // Handle error directly without using the useErrorHandler hook
      const errorMessage = error.message || "Failed to delete time slots";
      toast.error("Error", {
        description: errorMessage,
        duration: 5000,
      });
      console.error("Error deleting bulk time slots:", error);
    },
  });

  const handleUndo = () => {
    if (!lastBulkCreation) { return; }
    
    deleteBulkMutation.mutate({
      ids: lastBulkCreation.slotIds,
    });
  };

  const timeAgo = getTimeAgo(lastBulkCreation.timestamp);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-1"
        onClick={() => setIsConfirmOpen(true)}
        disabled={deleteBulkMutation.isPending}
      >
        <Undo2 className="h-4 w-4" />
        Undo Last Bulk Creation ({lastBulkCreation.count} slots, {timeAgo})
      </Button>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo Bulk Creation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all {lastBulkCreation.count} time slots created {timeAgo}.
              Only empty time slots without scheduled lessons will be removed.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUndo}>
              {deleteBulkMutation.isPending ? "Deleting..." : "Delete Time Slots"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Helper function to format time ago
function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) { return `${seconds} seconds ago`; }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) { return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`; }
  
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
}