// src/features/admin/components/scheduling/BulkActionsToolbar.tsx
"use client";

import { CheckSquare, Square, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BulkActionsToolbarProps {
  isSelectionMode: boolean;
  selectedCount: number;
  onToggleSelectionMode: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  isDeleting?: boolean;
}

export function BulkActionsToolbar({
  isSelectionMode,
  selectedCount,
  onToggleSelectionMode,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  isDeleting = false,
}: BulkActionsToolbarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteConfirm = () => {
    onBulkDelete();
    setShowDeleteDialog(false);
  };

  if (!isSelectionMode) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleSelectionMode}
          className="flex items-center gap-2"
        >
          <CheckSquare className="h-4 w-4" />
          Bulk Select
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-950 dark:border-blue-800">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSelectionMode}
          className="h-8 w-8 p-0"
          aria-label="Exit selection mode"
        >
          <X className="h-4 w-4" />
        </Button>
        <Badge variant="secondary" className="flex items-center gap-1">
          <CheckSquare className="h-3 w-3" />
          {selectedCount} selected
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectAll}
          className="flex items-center gap-2"
        >
          <Square className="h-4 w-4" />
          Select All
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onClearSelection}
          disabled={selectedCount === 0}
        >
          Clear
        </Button>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedCount === 0 || isDeleting}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete {selectedCount > 0 ? `(${selectedCount})` : ""}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Time Slots</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedCount} time slot
                {selectedCount !== 1 ? "s" : ""}?
              </AlertDialogDescription>
              <Alert className="mt-4">
                <AlertDescription>
                  Only time slots without scheduled lessons will be deleted. Slots with existing
                  lessons will be skipped to prevent data loss.
                </AlertDescription>
              </Alert>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Time Slots
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
