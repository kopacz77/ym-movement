// src/features/wardrobe/components/admin/RejectDressDialog.tsx
//
// CONSIGN-08 surface: admin rejects a PENDING_APPROVAL dress with a REQUIRED
// reason. Reason is sent to consigner (Phase 20 email + in-app notification).
// Consigner sees the reason on /wardrobe/consigned/[id]/edit and can resubmit
// (Plan 18-02 wardrobe.consigner.resubmit clears the reason).
//
"use client";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

interface RejectDressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dressId: string;
  dressTitle: string;
}

const MAX_REASON_LENGTH = 2000;

export function RejectDressDialog({
  open,
  onOpenChange,
  dressId,
  dressTitle,
}: RejectDressDialogProps) {
  const [reason, setReason] = useState<string>("");
  const utils = api.useUtils();

  useEffect(() => {
    if (!open) {
      setReason("");
    }
  }, [open]);

  // Stub-then-swap (Plan 18-02 sibling): `rejectDress` + `listPendingApproval`
  // are 18-02 deliverables; `as any` keeps this file type-correct until 18-02 lands.
  const reject = api.admin.wardrobe.rejectDress.useMutation({
    onSuccess: () => {
      toast.success("Dress rejected", {
        description: `${dressTitle} returned to the consigner with your reason.`,
      });
      (utils.admin.wardrobe as any).listPendingApproval.invalidate();
      utils.admin.wardrobe.list.invalidate();
      setReason("");
      onOpenChange(false);
    },
    onError: (e: { message: string }) => {
      toast.error("Reject failed", { description: e.message });
    },
  });

  const reasonTrimmed = reason.trim();
  const reasonValid = reasonTrimmed.length >= 1 && reasonTrimmed.length <= MAX_REASON_LENGTH;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1a3a5c]">Reject {dressTitle}</DialogTitle>
          <DialogDescription>
            Provide a reason — this will be sent to the consigner and shown on their listing. They
            can edit and resubmit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="rejection-reason">Reason</Label>
          <Textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Photos do not clearly show the dress in good lighting."
            rows={5}
            maxLength={MAX_REASON_LENGTH}
            disabled={reject.isPending}
            aria-invalid={reasonTrimmed.length > 0 && !reasonValid}
          />
          <p className="text-xs text-slate-500">
            {reason.length}/{MAX_REASON_LENGTH}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reject.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => reject.mutate({ id: dressId, reason: reasonTrimmed })}
            disabled={reject.isPending || !reasonValid}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {reject.isPending ? "Rejecting..." : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
