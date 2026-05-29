// src/features/wardrobe/components/admin/MarkReturnedDialog.tsx
//
// Plan 17-03 Task 2 — MarkReturnedDialog.
//
// Records the return event for a PAID rental. Single field:
// conditionOnReturn (free-text textarea). On submit, calls
// admin.wardrobeRentals.markReturned which transitions paymentStatus
// PAID -> RETURNED but does NOT touch Dress.status (research Pitfall 8).
//
// Releasing the deposit is a separate explicit action — RentalsTable
// surfaces it for RETURNED rentals via a confirmation toast (Task 3).
//
// Pattern lineage:
//   - Mirrors RecordPaymentDialog (Task 1) RHF/Dialog shape
//   - Textarea pattern from RequestRentalDialog (16-05)
//   - Single invalidation target: admin.wardrobeRentals.listRentals

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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

const returnedSchema = z.object({
  conditionOnReturn: z
    .string()
    .min(1, "Condition note is required")
    .max(2000, "Condition note must be 2000 characters or fewer"),
});

type ReturnedInput = z.infer<typeof returnedSchema>;

export interface MarkReturnedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentalId: string;
  dressTitle: string;
  studentName: string;
}

export function MarkReturnedDialog({
  open,
  onOpenChange,
  rentalId,
  dressTitle,
  studentName,
}: MarkReturnedDialogProps) {
  const utils = api.useUtils();

  const form = useForm<ReturnedInput>({
    resolver: zodResolver(returnedSchema),
    defaultValues: { conditionOnReturn: "" },
    mode: "onChange",
  });

  const markReturned = api.admin.wardrobeRentals.markReturned.useMutation({
    onSuccess: () => {
      utils.admin.wardrobeRentals.listRentals.invalidate();
      toast.success("Rental marked returned", {
        description: `${dressTitle} returned by ${studentName}. Inspect and release deposit when ready.`,
      });
      onOpenChange(false);
      form.reset({ conditionOnReturn: "" });
    },
    onError: (e) => toast.error("Failed to mark returned", { description: e.message }),
  });

  const onSubmit = form.handleSubmit((data) => {
    markReturned.mutate({
      rentalId,
      conditionOnReturn: data.conditionOnReturn,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1a3a5c]">Mark returned: {dressTitle}</DialogTitle>
          <DialogDescription>
            Record the condition of the dress as it came back. This will move the rental into
            RETURNED status; the dress stays RENTED until you release the deposit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="conditionOnReturn"
              className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500"
            >
              Condition on return
            </Label>
            <Textarea
              id="conditionOnReturn"
              rows={5}
              maxLength={2000}
              placeholder="e.g., No damage observed. Light makeup smudge on collar, included in cleaning."
              {...form.register("conditionOnReturn")}
            />
            {form.formState.errors.conditionOnReturn && (
              <p className="text-xs text-rose-600">
                {form.formState.errors.conditionOnReturn.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={markReturned.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!form.formState.isValid || markReturned.isPending}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {markReturned.isPending ? "Recording..." : "Mark returned"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
