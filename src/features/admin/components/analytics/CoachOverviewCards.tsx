"use client";

import {
  Calendar,
  Clock,
  DollarSign,
  GraduationCap,
  Users,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { CoachDetailView } from "./CoachDetailView";

export const CoachOverviewCards = () => {
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);

  const { data: coaches, error, isLoading } = api.admin.superAdmin.getCoachesOverview.useQuery(
    undefined,
    { retry: 3 },
  );

  useEffect(() => {
    if (error) {
      toast.error("Error loading coaches overview", {
        description: error.message,
      });
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 animate-pulse" />
            <CardHeader className="relative p-4 sm:p-6">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-slate-200 rounded-lg animate-pulse shrink-0" />
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-24 animate-pulse" />
                  <div className="h-3 bg-slate-200 rounded w-32 animate-pulse" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-3 gap-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-12 bg-slate-200 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Coaches</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Failed to load coaches overview data</p>
        </CardContent>
      </Card>
    );
  }

  if (!coaches || coaches.length === 0) {
    return (
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <GraduationCap className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-sm text-muted-foreground">No coaches registered yet.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (coach: { isActive: boolean; suspendedAt: Date | null }) => {
    if (coach.suspendedAt) {
      return (
        <Badge variant="destructive" className="text-xs">
          Suspended
        </Badge>
      );
    }
    if (coach.isActive) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        Inactive
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {coaches.map((coach) => (
          <Card
            key={coach.id}
            className={`relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group ${
              selectedCoachId === coach.id ? "ring-2 ring-blue-500 ring-offset-2" : ""
            }`}
            onClick={() => setSelectedCoachId(
              selectedCoachId === coach.id ? null : coach.id,
            )}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 opacity-50" />

            {/* Content */}
            <CardHeader className="relative p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="p-2 sm:p-3 rounded-xl bg-indigo-500 shadow-lg group-hover:scale-110 transition-transform duration-300 shrink-0">
                    <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                      {coach.name ?? "Unknown"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground truncate">
                      {coach.email}
                    </p>
                  </div>
                </div>
                {getStatusBadge(coach)}
              </div>
            </CardHeader>

            <CardContent className="relative pt-0 p-4 sm:p-6">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="flex flex-col items-center p-2 rounded-lg bg-white/60">
                  <Calendar className="h-3.5 w-3.5 text-blue-500 mb-1" />
                  <span className="text-sm font-bold text-gray-900">{coach.lessonCount}</span>
                  <span className="text-[10px] text-muted-foreground">Lessons</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-white/60">
                  <Users className="h-3.5 w-3.5 text-emerald-500 mb-1" />
                  <span className="text-sm font-bold text-gray-900">{coach.studentCount}</span>
                  <span className="text-[10px] text-muted-foreground">Students</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-white/60">
                  <Clock className="h-3.5 w-3.5 text-amber-500 mb-1" />
                  <span className="text-sm font-bold text-gray-900">{coach.activeSlots}</span>
                  <span className="text-[10px] text-muted-foreground">Slots</span>
                </div>
              </div>

              {/* Earnings and hours */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(coach.monthEarnings)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">/mo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs text-muted-foreground">
                    {coach.totalHoursBooked.toFixed(1)}h booked
                  </span>
                </div>
              </div>
            </CardContent>

            {/* Decorative accent */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
          </Card>
        ))}
      </div>

      {/* Coach detail view */}
      {selectedCoachId && (
        <CoachDetailView
          coachId={selectedCoachId}
          onClose={() => setSelectedCoachId(null)}
        />
      )}
    </div>
  );
};

export default CoachOverviewCards;
