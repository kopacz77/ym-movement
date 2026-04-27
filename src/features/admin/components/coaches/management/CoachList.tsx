// src/features/admin/components/coaches/management/CoachList.tsx
"use client";

import { format } from "date-fns";
import { AlertTriangle, Check, Pencil, UserCheck, Users, X } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { CoachActionsCell } from "./CoachStatusActions";

const INITIALS_COLORS = ["bg-[#1a3a5c]", "bg-violet-600", "bg-slate-400", "bg-[#0891b2]"];

function getInitials(name: string | null): string {
  if (!name) {
    return "?";
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getStatusIndicator(coach: {
  isApproved: boolean;
  isActive: boolean;
  suspendedAt: Date | string | null;
  suspendedReason?: string | null;
}) {
  if (!coach.isApproved) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Pending
      </span>
    );
  }

  if (coach.suspendedAt) {
    const badge = (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Suspended
      </span>
    );
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
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Inactive
    </span>
  );
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
        <span className="text-sm text-slate-600">{currentSplit}%</span>
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

  // Compute KPI metrics from coaches data
  const kpis = useMemo(() => {
    const coaches = coachData?.coaches ?? [];
    const total = coaches.length;
    const active = coaches.filter((c) => c.isApproved && c.isActive && !c.suspendedAt).length;
    const suspended = coaches.filter((c) => !!c.suspendedAt).length;
    return { total, active, suspended };
  }, [coachData]);

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
      <div className="space-y-6">
        {/* KPI Cards (empty state) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group relative bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] p-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/40 to-transparent pointer-events-none" />
            <div className="relative flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  Total Coaches
                </p>
                <p className="text-3xl font-bold text-[#1a3a5c] tracking-tight">0</p>
                <p className="text-xs font-medium text-slate-400">All registered</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-cyan-100 flex items-center justify-center">
                <Users className="h-7 w-7 text-[#0891b2]" />
              </div>
            </div>
          </div>
        </div>

        <div className="text-center p-6 border rounded-md">
          <p className="text-muted-foreground">No coaches found. Add a coach to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Coaches */}
        <div className="group relative bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/40 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Total Coaches
              </p>
              <p className="text-3xl font-bold text-[#1a3a5c] tracking-tight">{kpis.total}</p>
              <p className="text-xs font-medium text-slate-400">All registered</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-cyan-100 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <Users className="h-7 w-7 text-[#0891b2]" />
            </div>
          </div>
        </div>

        {/* Active */}
        <div className="group relative bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Active</p>
              <p className="text-3xl font-bold text-[#1a3a5c] tracking-tight">{kpis.active}</p>
              <p className="text-xs font-medium text-emerald-600">Currently coaching</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <UserCheck className="h-7 w-7 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Suspended */}
        <div className="group relative bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/40 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Suspended
              </p>
              <p className="text-3xl font-bold text-[#1a3a5c] tracking-tight">{kpis.suspended}</p>
              <p className="text-xs font-medium text-rose-600">Requires attention</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-rose-100 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <AlertTriangle className="h-7 w-7 text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] border-0">
        <CardContent className="p-0">
          {/* Card Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-[#1a3a5c]">All Coaches</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                {coaches.length}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 min-w-[200px]">
                    Coach
                  </TableHead>
                  <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 min-w-[110px]">
                    Status
                  </TableHead>
                  <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 min-w-[150px] hidden md:table-cell">
                    Skills
                  </TableHead>
                  <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 min-w-[120px] hidden lg:table-cell">
                    Revenue Split
                  </TableHead>
                  <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 min-w-[90px] hidden lg:table-cell">
                    Rate
                  </TableHead>
                  <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 min-w-[110px] hidden md:table-cell">
                    Joined
                  </TableHead>
                  <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 w-[70px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coaches.map((coach, index) => (
                  <TableRow
                    key={coach.id}
                    className={`hover:bg-slate-50/50 transition-colors duration-150 ${
                      coach.suspendedAt ? "bg-rose-50/30" : ""
                    }`}
                  >
                    {/* Coach Name with Initials */}
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full ${INITIALS_COLORS[index % INITIALS_COLORS.length]} text-white flex items-center justify-center text-xs font-bold shrink-0`}
                        >
                          {getInitials(coach.user.name)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-[#1a3a5c] block truncate">
                            {coach.user.name || "Unnamed"}
                          </span>
                          <p className="text-xs text-slate-400 truncate max-w-[180px]">
                            {coach.user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-6 py-4">{getStatusIndicator(coach)}</TableCell>

                    {/* Skills */}
                    <TableCell className="px-6 py-4 hidden md:table-cell">
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

                    {/* Revenue Split */}
                    <TableCell className="px-6 py-4 hidden lg:table-cell">
                      <RevenueSplitCell
                        coachId={coach.id}
                        currentSplit={coach.revenueSplitPercent}
                      />
                    </TableCell>

                    {/* Rate */}
                    <TableCell className="px-6 py-4 hidden lg:table-cell">
                      {coach.privateLessonPrice ? (
                        <span className="text-sm text-slate-600">
                          ${coach.privateLessonPrice}/hr
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">Not set</span>
                      )}
                    </TableCell>

                    {/* Joined */}
                    <TableCell className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm text-slate-500">{formatDate(coach.createdAt)}</span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-6 py-4">
                      <CoachActionsCell
                        coachId={coach.id}
                        coachName={coach.user.name || "Coach"}
                        isActive={coach.isActive}
                        isApproved={coach.isApproved}
                        suspendedAt={coach.suspendedAt}
                        pricing={{
                          privateLessonPrice: coach.privateLessonPrice,
                          groupLessonPrice: coach.groupLessonPrice,
                          choreographyPrice: coach.choreographyPrice,
                          competitionPrepPrice: coach.competitionPrepPrice,
                          offIceDancePrice: coach.offIceDancePrice,
                          revenueSplitPercent: coach.revenueSplitPercent,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
