// src/features/admin/components/coaches/management/CoachList.tsx
"use client";

import { format } from "date-fns";
import { Check, MoreHorizontal, Pencil, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { CoachStatusActions } from "./CoachStatusActions";

function getStatusBadge(coach: {
  isApproved: boolean;
  isActive: boolean;
  suspendedAt: Date | string | null;
  suspendedReason?: string | null;
}) {
  if (!coach.isApproved) {
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
  }

  if (coach.suspendedAt) {
    const badge = <Badge variant="destructive">Suspended</Badge>;
    if (coach.suspendedReason) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{badge}</TooltipTrigger>
            <TooltipContent>
              <p>{coach.suspendedReason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return badge;
  }

  if (coach.isActive) {
    return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
  }

  return <Badge variant="secondary">Inactive</Badge>;
}

function RevenueSplitCell({ coachId, currentSplit }: { coachId: string; currentSplit: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentSplit);
  const utils = api.useUtils();

  const updateSplit = api.admin.coach.management.updateCoachPricing.useMutation({
    onSuccess: () => {
      toast.success("Revenue split updated");
      utils.admin.coach.management.getAllCoaches.invalidate();
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Failed to update revenue split", { description: error.message });
      setValue(currentSplit);
      setIsEditing(false);
    },
  });

  if (!isEditing) {
    return (
      <div className="flex items-center gap-1">
        <span>{currentSplit}%</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            setValue(currentSplit);
            setIsEditing(true);
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-16 h-7 text-sm"
      />
      <span className="text-xs text-muted-foreground">%</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-green-600 hover:text-green-700"
        disabled={value === currentSplit || updateSplit.isPending}
        onClick={() => updateSplit.mutate({ coachId, revenueSplitPercent: value })}
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-red-600 hover:text-red-700"
        onClick={() => {
          setValue(currentSplit);
          setIsEditing(false);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export const CoachList: React.FC = () => {
  const { data: coachData, isLoading } = api.admin.coach.management.getAllCoaches.useQuery();

  const formatDate = (dateString: string | Date) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  if (isLoading) {
    return (
      <div className="text-center p-4">
        <p>Loading coaches...</p>
      </div>
    );
  }

  const coaches = coachData?.coaches ?? [];

  if (!coaches.length) {
    return (
      <div className="text-center p-6 border rounded-md">
        <p className="text-muted-foreground">No coaches found. Add a coach to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px] sticky left-0 bg-background">Name</TableHead>
              <TableHead className="min-w-[200px] hidden sm:table-cell">Email</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="min-w-[150px] hidden md:table-cell">Skills</TableHead>
              <TableHead className="min-w-[100px] hidden lg:table-cell">Revenue Split</TableHead>
              <TableHead className="min-w-[120px] hidden md:table-cell">Joined</TableHead>
              <TableHead className="w-[80px] sticky right-0 bg-background">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coaches.map((coach) => (
              <TableRow key={coach.id}>
                <TableCell className="font-medium sticky left-0 bg-background">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{coach.user.name || "Unnamed"}</div>
                    <div className="text-sm text-muted-foreground sm:hidden truncate">
                      {coach.user.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{coach.user.email}</TableCell>
                <TableCell>{getStatusBadge(coach)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {coach.skills.slice(0, 2).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {coach.skills.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{coach.skills.length - 2}
                      </Badge>
                    )}
                    {coach.skills.length === 0 && (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <RevenueSplitCell coachId={coach.id} currentSplit={coach.revenueSplitPercent} />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatDate(coach.createdAt)}
                </TableCell>
                <TableCell className="sticky right-0 bg-background">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuSeparator />
                      <CoachStatusActions
                        coachId={coach.id}
                        coachName={coach.user.name || "Coach"}
                        isActive={coach.isActive}
                        isApproved={coach.isApproved}
                        suspendedAt={coach.suspendedAt}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
