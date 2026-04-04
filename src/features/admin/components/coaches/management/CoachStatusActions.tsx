// src/features/admin/components/coaches/management/CoachStatusActions.tsx
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Ban, DollarSign, MoreHorizontal, Power, PowerOff, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { EditCoachPricingDialog } from "./EditCoachPricingDialog";

interface CoachActionsProps {
  coachId: string;
  coachName: string;
  isActive: boolean;
  isApproved: boolean;
  suspendedAt: Date | string | null;
  pricing: {
    privateLessonPrice: number | null;
    groupLessonPrice: number | null;
    choreographyPrice: number | null;
    competitionPrepPrice: number | null;
    offIceDancePrice: number | null;
    revenueSplitPercent: number;
  };
}

/**
 * Self-contained coach actions cell: dropdown trigger + menu items + dialogs.
 * Dialogs are rendered as siblings of (not inside) the DropdownMenu,
 * preventing the Radix unmount-on-close issue.
 */
export function CoachActionsCell({
  coachId,
  coachName,
  isActive,
  isApproved,
  suspendedAt,
  pricing,
}: CoachActionsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  const deleteCoachMutation = api.admin.coach.management.deleteCoach.useMutation({
    onSuccess: (data) => {
      toast.success("Coach deleted", {
        description: `${data.deletedCoachName || coachName} has been permanently removed.`,
      });
      queryClient.invalidateQueries({ queryKey: [["admin", "coach"]] });
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to delete coach", {
        description: error.message,
      });
    },
  });

  const { data: deletionImpact } = api.admin.coach.management.getCoachDeletionImpact.useQuery(
    { coachId },
    { enabled: showDeleteDialog },
  );

  const handleDeactivateConfirm = () => {
    toggleStatusMutation.mutate({ coachId, action: "deactivate" });
    setShowDeactivateDialog(false);
  };

  const handleActivateConfirm = () => {
    toggleStatusMutation.mutate({ coachId, action: "activate" });
    setShowActivateDialog(false);
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

  const handleDeleteConfirm = () => {
    deleteCoachMutation.mutate({ coachId });
  };

  const openDialog = (setter: (v: boolean) => void) => {
    setDropdownOpen(false);
    // Small delay to let dropdown close animation finish before opening dialog
    setTimeout(() => setter(true), 10);
  };

  return (
    <>
      {/* Dropdown menu */}
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isApproved && (
            <>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  openDialog(setShowPricingDialog);
                }}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Edit Pricing
              </DropdownMenuItem>
              {isActive && !isSuspended && (
                <>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      openDialog(setShowDeactivateDialog);
                    }}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    disabled={toggleStatusMutation.isPending}
                  >
                    <PowerOff className="h-4 w-4 mr-2" />
                    Deactivate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      openDialog(setShowSuspendDialog);
                    }}
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
                  onSelect={(e) => {
                    e.preventDefault();
                    openDialog(setShowActivateDialog);
                  }}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  disabled={toggleStatusMutation.isPending}
                >
                  <Power className="h-4 w-4 mr-2" />
                  Activate
                </DropdownMenuItem>
              )}

              {isSuspended && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    openDialog(setShowActivateDialog);
                  }}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  disabled={toggleStatusMutation.isPending}
                >
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Reactivate
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  openDialog(setShowDeleteDialog);
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Coach
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs rendered OUTSIDE the dropdown so they don't unmount when dropdown closes */}

      {/* Edit Pricing Dialog */}
      <EditCoachPricingDialog
        open={showPricingDialog}
        onOpenChange={setShowPricingDialog}
        coachId={coachId}
        coachName={coachName}
        currentPricing={pricing}
      />

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Deactivate {coachName}?</DialogTitle>
            <DialogDescription>
              This will prevent them from accessing the coach portal. Their data will be preserved
              and they can be reactivated later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleDeactivateConfirm}
              disabled={toggleStatusMutation.isPending}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate/Reactivate Confirmation Dialog */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isSuspended ? "Reactivate" : "Activate"} {coachName}?</DialogTitle>
            <DialogDescription>
              This will restore their access to the coach portal.
              {isSuspended && " The suspension record will be cleared."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleActivateConfirm}
              disabled={toggleStatusMutation.isPending}
            >
              {isSuspended ? "Reactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
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

      {/* Delete Coach Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete {coachName}?
            </DialogTitle>
            <DialogDescription>
              This action is <strong className="text-foreground">permanent</strong> and cannot be
              undone. The coach account and login will be completely removed.
            </DialogDescription>
          </DialogHeader>

          {deletionImpact && (
            <div className="space-y-2 py-2">
              <p className="text-sm font-medium text-muted-foreground">Impact summary:</p>
              <div className="grid grid-cols-2 gap-2">
                {deletionImpact.lessonCount > 0 && (
                  <Badge variant="outline" className="justify-center py-1.5">
                    {deletionImpact.lessonCount} lesson{deletionImpact.lessonCount !== 1 ? "s" : ""}{" "}
                    unassigned
                  </Badge>
                )}
                {deletionImpact.timeSlotCount > 0 && (
                  <Badge variant="outline" className="justify-center py-1.5">
                    {deletionImpact.timeSlotCount} time slot
                    {deletionImpact.timeSlotCount !== 1 ? "s" : ""} unassigned
                  </Badge>
                )}
                {deletionImpact.studentCount > 0 && (
                  <Badge variant="outline" className="justify-center py-1.5">
                    {deletionImpact.studentCount} student link
                    {deletionImpact.studentCount !== 1 ? "s" : ""} removed
                  </Badge>
                )}
                {deletionImpact.proposalCount > 0 && (
                  <Badge variant="outline" className="justify-center py-1.5">
                    {deletionImpact.proposalCount} proposal
                    {deletionImpact.proposalCount !== 1 ? "s" : ""} deleted
                  </Badge>
                )}
              </div>
              {deletionImpact.lessonCount === 0 &&
                deletionImpact.timeSlotCount === 0 &&
                deletionImpact.studentCount === 0 &&
                deletionImpact.proposalCount === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No associated data will be affected.
                  </p>
                )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteCoachMutation.isPending}
            >
              {deleteCoachMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
