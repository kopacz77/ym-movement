"use client";

import { format } from "date-fns";
import { Check, Clock, X } from "lucide-react";
import type React from "react";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

export const CoachProposalQueue: React.FC = () => {
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [denyNotes, setDenyNotes] = useState("");
  const utils = api.useUtils();

  const { data: proposals, isLoading } = api.admin.coach.proposals.getPendingProposals.useQuery();

  const approveMutation = api.admin.coach.proposals.approveProposal.useMutation({
    onSuccess: () => {
      toast.success("Proposal approved. Time slot created.");
      utils.admin.coach.proposals.getPendingProposals.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to approve proposal", { description: error.message });
    },
  });

  const denyMutation = api.admin.coach.proposals.denyProposal.useMutation({
    onSuccess: () => {
      toast.success("Proposal denied.");
      utils.admin.coach.proposals.getPendingProposals.invalidate();
      setDenyDialogOpen(false);
      setSelectedProposalId(null);
      setDenyNotes("");
    },
    onError: (error) => {
      toast.error("Failed to deny proposal", { description: error.message });
    },
  });

  const handleApprove = (proposalId: string) => {
    approveMutation.mutate({ proposalId });
  };

  const handleDenyClick = (proposalId: string) => {
    setSelectedProposalId(proposalId);
    setDenyNotes("");
    setDenyDialogOpen(true);
  };

  const handleDenyConfirm = () => {
    if (!selectedProposalId) {
      return;
    }
    denyMutation.mutate({
      proposalId: selectedProposalId,
      notes: denyNotes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="text-center p-4">
        <p>Loading proposals...</p>
      </div>
    );
  }

  if (!proposals || proposals.length === 0) {
    return (
      <div className="text-center p-6 border rounded-md">
        <p className="text-muted-foreground">No pending proposals</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            {proposals.length} pending
          </Badge>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Coach</TableHead>
                <TableHead className="min-w-[120px]">Rink</TableHead>
                <TableHead className="min-w-[100px]">Date</TableHead>
                <TableHead className="min-w-[130px]">Time</TableHead>
                <TableHead className="min-w-[60px] hidden sm:table-cell">Max</TableHead>
                <TableHead className="min-w-[120px] hidden md:table-cell">Submitted</TableHead>
                <TableHead className="text-right min-w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{proposal.Coach.User.name ?? "Unknown"}</div>
                      <div className="text-xs text-muted-foreground hidden sm:block">
                        {proposal.Coach.User.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{proposal.Rink.name}</TableCell>
                  <TableCell>{format(new Date(proposal.startTime), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    {format(new Date(proposal.startTime), "h:mm a")} -{" "}
                    {format(new Date(proposal.endTime), "h:mm a")}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{proposal.maxStudents}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {format(new Date(proposal.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(proposal.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDenyClick(proposal.id)}
                        disabled={denyMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Proposal</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for denying this time slot proposal. The coach will be
              able to see this note.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="denyNotes">Notes (optional)</Label>
            <Textarea
              id="denyNotes"
              value={denyNotes}
              onChange={(e) => setDenyNotes(e.target.value)}
              placeholder="e.g., This time slot conflicts with an existing booking..."
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDenyConfirm}
              disabled={denyMutation.isPending}
            >
              Deny Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
