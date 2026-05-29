// src/features/wardrobe/components/admin/ApproveDressDialog.tsx
//
// CONSIGN-07 surface: admin approves a PENDING_APPROVAL dress, with optional
// commission % override. Mirrors RequestResponseDialog shape — controlled
// Dialog + reset-on-close + invalidate-then-close-then-toast lifecycle.
//
// CROSS-WAVE NOTE (stub-then-swap, Plan 18-04 → 18-02):
//   Plan 18-02 ships `admin.wardrobe.approveDress` and `listPendingApproval`
//   procedures. If 18-02 hasn't landed at type-check time, the
//   `(api.admin.wardrobe as any).approveDress` cast keeps this file
//   type-correct; remove the cast once 18-02 lands. Same family as 17-02's
//   PaymentPlaceholderDialog stub → real-import swap pattern.

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface ApproveDressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dressId: string;
  dressTitle: string;
  currentCommissionPct: number;
}

export function ApproveDressDialog({
  open,
  onOpenChange,
  dressId,
  dressTitle,
  currentCommissionPct,
}: ApproveDressDialogProps) {
  const [overrideRaw, setOverrideRaw] = useState<string>("");
  const utils = api.useUtils();

  // Reset input on both open=false transition AND mutation onSuccess to avoid
  // stale state on re-open (Pitfall 8 family, mirrors RequestResponseDialog).
  useEffect(() => {
    if (!open) {
      setOverrideRaw("");
    }
  }, [open]);

  // Stub-then-swap (Plan 18-02 sibling): `approveDress` + `listPendingApproval`
  // are 18-02 deliverables; `as any` keeps this file type-correct until 18-02 lands.
  const approve = (api.admin.wardrobe as any).approveDress.useMutation({
    onSuccess: () => {
      toast.success("Dress approved", {
        description: `${dressTitle} is now live on the YM Wardrobe catalog.`,
      });
      (utils.admin.wardrobe as any).listPendingApproval.invalidate();
      utils.admin.wardrobe.list.invalidate();
      setOverrideRaw("");
      onOpenChange(false);
    },
    onError: (e: { message: string }) => {
      toast.error("Approve failed", { description: e.message });
    },
  });

  const overrideNum = overrideRaw === "" ? undefined : Number(overrideRaw);
  const overrideValid =
    overrideNum === undefined ||
    (Number.isInteger(overrideNum) && overrideNum >= 0 && overrideNum <= 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1a3a5c]">Approve {dressTitle}</DialogTitle>
          <DialogDescription>
            Optionally override the consignment commission % for this dress. Leave blank to keep the
            current rate ({currentCommissionPct}%).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="commission-override">Commission % override (optional)</Label>
          <Input
            id="commission-override"
            type="number"
            min={0}
            max={100}
            step={1}
            value={overrideRaw}
            onChange={(e) => setOverrideRaw(e.target.value)}
            placeholder={`${currentCommissionPct}`}
            disabled={approve.isPending}
            aria-invalid={!overrideValid}
          />
          {!overrideValid && (
            <p className="text-xs text-rose-600">
              Commission must be an integer between 0 and 100.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={approve.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              approve.mutate({
                id: dressId,
                ...(overrideNum !== undefined
                  ? { consignmentCommissionPctOverride: overrideNum }
                  : {}),
              })
            }
            disabled={approve.isPending || !overrideValid}
            className="bg-[#0891b2] hover:bg-[#06748f] text-white"
          >
            {approve.isPending ? "Approving..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
