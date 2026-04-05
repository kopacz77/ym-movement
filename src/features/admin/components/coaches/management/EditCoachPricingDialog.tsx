// src/features/admin/components/coaches/management/EditCoachPricingDialog.tsx
"use client";

import { useQueryClient } from "@tanstack/react-query";
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

interface EditCoachPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId: string;
  coachName: string;
  currentPricing: {
    privateLessonPrice: number | null;
    groupLessonPrice: number | null;
    choreographyPrice: number | null;
    competitionPrepPrice: number | null;
    offIceDancePrice: number | null;
    revenueSplitPercent: number;
  };
}

export function EditCoachPricingDialog({
  open,
  onOpenChange,
  coachId,
  coachName,
  currentPricing,
}: EditCoachPricingDialogProps) {
  const queryClient = useQueryClient();

  const [privateLessonPrice, setPrivateLessonPrice] = useState(
    currentPricing.privateLessonPrice?.toString() ?? "",
  );
  const [groupLessonPrice, setGroupLessonPrice] = useState(
    currentPricing.groupLessonPrice?.toString() ?? "",
  );
  const [choreographyPrice, setChoreographyPrice] = useState(
    currentPricing.choreographyPrice?.toString() ?? "",
  );
  const [competitionPrepPrice, setCompetitionPrepPrice] = useState(
    currentPricing.competitionPrepPrice?.toString() ?? "",
  );
  const [offIceDancePrice, setOffIceDancePrice] = useState(
    currentPricing.offIceDancePrice?.toString() ?? "",
  );
  const [revenueSplitPercent, setRevenueSplitPercent] = useState(
    currentPricing.revenueSplitPercent.toString(),
  );

  // Sync state when dialog opens with potentially different coach data
  useEffect(() => {
    if (open) {
      setPrivateLessonPrice(currentPricing.privateLessonPrice?.toString() ?? "");
      setGroupLessonPrice(currentPricing.groupLessonPrice?.toString() ?? "");
      setChoreographyPrice(currentPricing.choreographyPrice?.toString() ?? "");
      setCompetitionPrepPrice(currentPricing.competitionPrepPrice?.toString() ?? "");
      setOffIceDancePrice(currentPricing.offIceDancePrice?.toString() ?? "");
      setRevenueSplitPercent(currentPricing.revenueSplitPercent.toString());
    }
  }, [open, currentPricing]);

  const updatePricing = api.admin.coach.management.updateCoachPricing.useMutation({
    onSuccess: () => {
      toast.success("Coach pricing updated");
      queryClient.invalidateQueries({ queryKey: [["admin", "coach"]] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to update pricing", { description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updatePricing.mutate({
      coachId,
      privateLessonPrice: privateLessonPrice ? Number.parseFloat(privateLessonPrice) : undefined,
      groupLessonPrice: groupLessonPrice ? Number.parseFloat(groupLessonPrice) : undefined,
      choreographyPrice: choreographyPrice ? Number.parseFloat(choreographyPrice) : undefined,
      competitionPrepPrice: competitionPrepPrice
        ? Number.parseFloat(competitionPrepPrice)
        : undefined,
      offIceDancePrice: offIceDancePrice ? Number.parseFloat(offIceDancePrice) : undefined,
      revenueSplitPercent: revenueSplitPercent
        ? Number.parseFloat(revenueSplitPercent)
        : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Pricing - {coachName}</DialogTitle>
          <DialogDescription>
            Set lesson rates for this coach. Leave blank to use default pricing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-private">Private Lesson ($)</Label>
              <Input
                id="edit-private"
                type="number"
                min="0"
                step="0.01"
                placeholder="Default"
                value={privateLessonPrice}
                onChange={(e) => setPrivateLessonPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-group">Group Lesson ($)</Label>
              <Input
                id="edit-group"
                type="number"
                min="0"
                step="0.01"
                placeholder="Default"
                value={groupLessonPrice}
                onChange={(e) => setGroupLessonPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-choreo">Choreography ($)</Label>
              <Input
                id="edit-choreo"
                type="number"
                min="0"
                step="0.01"
                placeholder="Default"
                value={choreographyPrice}
                onChange={(e) => setChoreographyPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-comp">Competition Prep ($)</Label>
              <Input
                id="edit-comp"
                type="number"
                min="0"
                step="0.01"
                placeholder="Default"
                value={competitionPrepPrice}
                onChange={(e) => setCompetitionPrepPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-office">Off-Ice Dance ($)</Label>
              <Input
                id="edit-office"
                type="number"
                min="0"
                step="0.01"
                placeholder="Default"
                value={offIceDancePrice}
                onChange={(e) => setOffIceDancePrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-split">Revenue Split (%)</Label>
              <Input
                id="edit-split"
                type="number"
                min="0"
                max="100"
                value={revenueSplitPercent}
                onChange={(e) => setRevenueSplitPercent(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updatePricing.isPending}>
              {updatePricing.isPending ? "Saving..." : "Save Pricing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
