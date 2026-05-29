// src/features/wardrobe/components/admin/RequestResponseDialog.tsx
//
// Plan 17-02 Task 1 — RequestResponseDialog.
//
// Single component, two visual modes (APPROVE / DECLINE) discriminated by the
// `decision` prop. The mode discriminator is the entire reason for unification:
//   - validation flow (Zod responseMessage required, 1..1000)
//   - mutation call (admin.wardrobeRequests.respondToRequest)
//   - onSuccess invalidation (listRequests)
//   - onClose form.reset
// …are identical across decisions. Only the title/subtitle copy and the submit
// button color differ. See Plan 17-01 for the server contract.
//
// Pattern lineage:
//   - Controlled-modal open/onOpenChange seam → 16-05 RequestRentalDialog
//   - RHF + zodResolver with explicit responseMessage Zod gate → 17-02 plan spec
//   - Reset-on-close via form.reset on Dialog close → 16-05 Pitfall 8 family

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Schema + types (module-level — stable resolver reference across renders)
// ---------------------------------------------------------------------------

const responseSchema = z.object({
  responseMessage: z.string().min(1, "A message is required").max(1000),
});

type ResponseInput = z.infer<typeof responseSchema>;

export interface RequestResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  decision: "APPROVE" | "DECLINE";
  dressTitle: string;
  studentName: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RequestResponseDialog({
  open,
  onOpenChange,
  requestId,
  decision,
  dressTitle,
  studentName,
}: RequestResponseDialogProps) {
  const utils = api.useUtils();

  const form = useForm<ResponseInput>({
    resolver: zodResolver(responseSchema),
    defaultValues: { responseMessage: "" },
    mode: "onChange",
  });

  const respond = api.admin.wardrobeRequests.respondToRequest.useMutation({
    onSuccess: () => {
      utils.admin.wardrobeRequests.listRequests.invalidate();
      toast.success(decision === "APPROVE" ? "Request approved" : "Request declined", {
        description: `Notified ${studentName}.`,
      });
      onOpenChange(false);
      form.reset({ responseMessage: "" });
    },
    onError: (e) => toast.error("Action failed", { description: e.message }),
  });

  const onSubmit = (data: ResponseInput) => {
    respond.mutate({
      requestId,
      decision,
      responseMessage: data.responseMessage,
    });
  };

  // Reset stale message between opens (Pitfall 8 family — controlled modal
  // open lifecycle).
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset({ responseMessage: "" });
    }
    onOpenChange(next);
  };

  const isApprove = decision === "APPROVE";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1a3a5c]">
            {isApprove ? "Approve" : "Decline"} request for {dressTitle}
          </DialogTitle>
          <p className="text-sm text-slate-500">
            {isApprove
              ? "This will mark the dress as held. The student will get a notification and can send payment."
              : "The dress will return to available immediately. The student will see your reason."}
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              rows={5}
              maxLength={1000}
              placeholder={
                isApprove
                  ? "Add an optional note for the student about pickup, fit, etc."
                  : "Tell the student why you're declining."
              }
              {...form.register("responseMessage")}
            />
            {form.formState.errors.responseMessage && (
              <p className="text-xs text-rose-600 mt-1">
                {form.formState.errors.responseMessage.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={respond.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!form.formState.isValid || respond.isPending}
              className={
                isApprove
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }
            >
              {isApprove ? "Approve" : "Decline"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
