// src/features/admin/components/coaches/management/CoachStatusActions.tsx
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Ban, Power, PowerOff, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { showConfirmationToast } from "@/lib/toast-confirmations";

interface CoachStatusActionsProps {
  coachId: string;
  coachName: string;
  isActive: boolean;
  isApproved: boolean;
  suspendedAt: Date | string | null;
}

export function CoachStatusActions({
  coachId,
  coachName,
  isActive,
  isApproved,
  suspendedAt,
}: CoachStatusActionsProps) {
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const queryClient = useQueryClient();

  const isSuspended = !!suspendedAt;

  const toggleStatusMutation = api.admin.coach.management.toggleCoachStatus.useMutation({
    onSuccess: (_data, variables) => {
      const actionLabel =
        variables.action === "activate"
          ? "activated"
          : variables.action === "deactivate"
            ? "deactivated"
            : "suspended";
      toast.success(`Coach ${actionLabel}`, {
        description: `${coachName} has been ${actionLabel}.`,
      });
      queryClient.invalidateQueries({ queryKey: [["admin", "coach"]] });
    },
    onError: (error) => {
      toast.error("Failed to update coach status", {
        description: error.message,
      });
    },
  });

  const handleActivate = () => {
    showConfirmationToast({
      title: `Reactivate ${coachName}?`,
      description: "This will restore their access to the coach portal.",
      confirmLabel: "Reactivate",
      onConfirm: () => {
        toggleStatusMutation.mutate({ coachId, action: "activate" });
      },
    });
  };

  const handleDeactivate = () => {
    showConfirmationToast({
      title: `Deactivate ${coachName}?`,
      description:
        "This will prevent them from accessing the coach portal. Their data will be preserved.",
      confirmLabel: "Deactivate",
      onConfirm: () => {
        toggleStatusMutation.mutate({ coachId, action: "deactivate" });
      },
    });
  };

  const handleSuspendConfirm = () => {
    toggleStatusMutation.mutate({
      coachId,
      action: "suspend",
      reason: suspendReason || undefined,
    });
    setShowSuspendDialog(false);
    setSuspendReason("");
  };

  if (!isApproved) {
    return null;
  }

  return (
    <>
      {isActive && !isSuspended && (
        <>
          <DropdownMenuItem
            onClick={handleDeactivate}
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            disabled={toggleStatusMutation.isPending}
          >
            <PowerOff className="h-4 w-4 mr-2" />
            Deactivate
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowSuspendDialog(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={toggleStatusMutation.isPending}
          >
            <Ban className="h-4 w-4 mr-2" />
            Suspend
          </DropdownMenuItem>
        </>
      )}

      {!isActive && !isSuspended && (
        <DropdownMenuItem
          onClick={handleActivate}
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
          disabled={toggleStatusMutation.isPending}
        >
          <Power className="h-4 w-4 mr-2" />
          Activate
        </DropdownMenuItem>
      )}

      {isSuspended && (
        <DropdownMenuItem
          onClick={handleActivate}
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
          disabled={toggleStatusMutation.isPending}
        >
          <ShieldAlert className="h-4 w-4 mr-2" />
          Reactivate
        </DropdownMenuItem>
      )}

      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Suspend {coachName}</DialogTitle>
            <DialogDescription>
              This will immediately revoke coach portal access. Provide an optional reason for the
              suspension.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for suspension (optional)"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspendConfirm}
              disabled={toggleStatusMutation.isPending}
            >
              Suspend Coach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
