// src/features/admin/components/coaches/management/CoachPendingApprovals.tsx
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, Clock, X } from "lucide-react";
import type React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { showDeleteConfirmation } from "@/lib/toast-confirmations";

export const CoachPendingApprovals: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: pendingData, isLoading } =
    api.admin.coach.approval.getPendingCoachApprovals.useQuery();

  const approveCoachMutation = api.admin.coach.approval.approveCoach.useMutation({
    onSuccess: () => {
      toast.success("Coach approved. Registration email sent.");
      queryClient.invalidateQueries({ queryKey: [["admin", "coach"]] });
    },
    onError: (error) => {
      toast.error("Failed to approve coach", { description: error.message });
    },
  });

  const denyCoachMutation = api.admin.coach.approval.denyCoach.useMutation({
    onSuccess: () => {
      toast.success("Application denied.");
      queryClient.invalidateQueries({ queryKey: [["admin", "coach"]] });
    },
    onError: (error) => {
      toast.error("Failed to deny application", { description: error.message });
    },
  });

  const handleApprove = (coachId: string) => {
    approveCoachMutation.mutate({ coachId });
  };

  const handleDeny = (coachId: string) => {
    showDeleteConfirmation("coach application", () => {
      denyCoachMutation.mutate({ coachId });
    });
  };

  const formatDate = (dateString: string | Date) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  if (isLoading) {
    return (
      <div className="text-center p-4">
        <p>Loading pending applications...</p>
      </div>
    );
  }

  const coaches = pendingData?.coaches ?? [];

  if (!coaches.length) {
    return (
      <div className="text-center p-6 border rounded-md">
        <p className="text-muted-foreground">No pending coach applications</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Name</TableHead>
              <TableHead className="min-w-[200px] hidden sm:table-cell">Email</TableHead>
              <TableHead className="min-w-[100px] hidden md:table-cell">Experience</TableHead>
              <TableHead className="min-w-[150px] hidden lg:table-cell">Skills</TableHead>
              <TableHead className="min-w-[120px] hidden md:table-cell">Applied</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="text-right min-w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coaches.map((coach) => (
              <TableRow key={coach.id}>
                <TableCell className="font-medium">
                  <div>
                    <div>{coach.user.name}</div>
                    {coach.bio && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {coach.bio.length > 100 ? `${coach.bio.slice(0, 100)}...` : coach.bio}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{coach.user.email}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {coach.yearsExperience != null ? `${coach.yearsExperience} yrs` : "N/A"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {coach.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {coach.skills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{coach.skills.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatDate(coach.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Pending</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(coach.id)}
                      disabled={approveCoachMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeny(coach.id)}
                      disabled={denyCoachMutation.isPending}
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
  );
};
