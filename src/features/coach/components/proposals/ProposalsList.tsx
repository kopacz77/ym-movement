"use client";

import { format } from "date-fns";
import { CheckCircle2, Clock, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";

const statusConfig = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    variant: "outline" as const,
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    variant: "outline" as const,
    className: "bg-green-100 text-green-800 border-green-200",
  },
  DENIED: {
    label: "Denied",
    icon: XCircle,
    variant: "outline" as const,
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

export function ProposalsList() {
  const { data: proposals, isLoading } = api.coach.proposals.getMyProposals.useQuery();
  const utils = api.useUtils();

  const cancelProposal = api.coach.proposals.cancelProposal.useMutation({
    onSuccess: () => {
      toast.success("Proposal cancelled");
      utils.coach.proposals.getMyProposals.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to cancel proposal", { description: error.message });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!proposals || proposals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Proposals</CardTitle>
          <CardDescription>Your time slot proposal history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">You haven&apos;t proposed any time slots yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Proposals</CardTitle>
        <CardDescription>Your time slot proposal history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Rink</TableHead>
                <TableHead className="min-w-[100px]">Date</TableHead>
                <TableHead className="min-w-[130px]">Time</TableHead>
                <TableHead className="min-w-[60px] hidden sm:table-cell">Max</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[150px] hidden md:table-cell">Notes</TableHead>
                <TableHead className="text-right min-w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => {
                const config = statusConfig[proposal.status];
                const StatusIcon = config.icon;

                return (
                  <TableRow key={proposal.id}>
                    <TableCell className="font-medium">{proposal.Rink.name}</TableCell>
                    <TableCell>{format(new Date(proposal.startTime), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      {format(new Date(proposal.startTime), "h:mm a")} -{" "}
                      {format(new Date(proposal.endTime), "h:mm a")}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{proposal.maxStudents}</TableCell>
                    <TableCell>
                      <Badge variant={config.variant} className={config.className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {proposal.adminNotes ? (
                        <span className="text-sm text-muted-foreground">{proposal.adminNotes}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {proposal.status === "PENDING" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelProposal.mutate({ proposalId: proposal.id })}
                          disabled={cancelProposal.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
