// src/features/wardrobe/components/admin/RecordPaymentDialog.tsx
//
// Plan 17-03 Task 1 — RecordPaymentDialog.
//
// Converts an APPROVED RentalRequest into a paid Rental via
// admin.wardrobeRequests.markPaymentReceived. Admin collects ONLY the
// paymentMethod (Venmo / Zelle / Cash) — fees + deposit are snapshotted
// server-side at tx time from the dress row (RENTAL-02).
//
// Pattern lineage:
//   - RHF + zodResolver with `z.nativeEnum(PaymentMethod)` (Phase 17-01 contract)
//   - Reuses Select primitive (radio-group is not yet exported by components/ui)
//   - Reset-on-success matches RequestRentalDialog (16-05) lifecycle
//   - Double invalidation (listRequests + listRentals) so awaiting-payment tab
//     clears AND the new rental appears in the rentals table

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PaymentMethod } from "@prisma/client";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

const paymentSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
});

type PaymentInput = z.infer<typeof paymentSchema>;

export interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  dressTitle: string;
  studentName: string;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  requestId,
  dressTitle,
  studentName,
}: RecordPaymentDialogProps) {
  const utils = api.useUtils();

  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { paymentMethod: PaymentMethod.VENMO },
    mode: "onChange",
  });

  const markPaid = api.admin.wardrobeRequests.markPaymentReceived.useMutation({
    onSuccess: () => {
      utils.admin.wardrobeRequests.listRequests.invalidate();
      utils.admin.wardrobeRentals.listRentals.invalidate();
      toast.success("Rental confirmed", {
        description: `${studentName}'s rental for "${dressTitle}" is now active.`,
      });
      onOpenChange(false);
      form.reset({ paymentMethod: PaymentMethod.VENMO });
    },
    onError: (e) => toast.error("Failed to record payment", { description: e.message }),
  });

  const onSubmit = form.handleSubmit((data) => {
    markPaid.mutate({ requestId, paymentMethod: data.paymentMethod });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1a3a5c]">Record payment for {dressTitle}</DialogTitle>
          <DialogDescription>
            Once you confirm payment, the rental becomes active and the dress goes into the RENTED
            state. The student will be notified.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="paymentMethod"
              className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500"
            >
              Payment method
            </Label>
            <Controller
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="paymentMethod" className="w-full">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PaymentMethod.VENMO}>Venmo</SelectItem>
                    <SelectItem value={PaymentMethod.ZELLE}>Zelle</SelectItem>
                    <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.paymentMethod && (
              <p className="text-xs text-rose-600">{form.formState.errors.paymentMethod.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={markPaid.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!form.formState.isValid || markPaid.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {markPaid.isPending ? "Recording..." : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
