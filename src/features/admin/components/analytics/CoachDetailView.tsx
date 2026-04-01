"use client";

import { format } from "date-fns";
import {
  Calendar,
  Clock,
  DollarSign,
  GraduationCap,
  Mail,
  Users,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface CoachDetailViewProps {
  coachId: string;
  onClose: () => void;
}

export const CoachDetailView = ({ coachId, onClose }: CoachDetailViewProps) => {
  const { data, error, isLoading } = api.admin.superAdmin.getCoachDetail.useQuery(
    { coachId },
    { retry: 3 },
  );

  useEffect(() => {
    if (error) {
      toast.error("Error loading coach details", {
        description: error.message,
      });
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="p-2 bg-gradient-to-br from-indigo-100/60 via-blue-50/70 to-slate-100/60 rounded-xl border border-indigo-200/50 shadow-lg">
        <Card className="bg-white/80">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="h-6 bg-slate-200 rounded w-32 animate-pulse" />
                <div className="h-4 bg-slate-200 rounded w-48 animate-pulse" />
                <div className="h-20 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="h-6 bg-slate-200 rounded w-40 animate-pulse" />
                <div className="h-48 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Coach Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Failed to load coach details</p>
        </CardContent>
      </Card>
    );
  }

  const { profile, upcomingLessons, studentRoster, stats } = data;

  const getStatusBadge = () => {
    if (profile.suspendedAt) {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (profile.isActive) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
      );
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  const getLessonTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; className: string }> = {
      PRIVATE: { label: "Private", className: "bg-blue-100 text-blue-700 border-blue-200" },
      CHOREOGRAPHY: { label: "Choreography", className: "bg-purple-100 text-purple-700 border-purple-200" },
      GROUP: { label: "Group", className: "bg-green-100 text-green-700 border-green-200" },
      COMPETITION_PREP: { label: "Competition", className: "bg-orange-100 text-orange-700 border-orange-200" },
      OFF_ICE_DANCE: { label: "Off-Ice Dance", className: "bg-pink-100 text-pink-700 border-pink-200" },
    };
    const config = typeMap[type] ?? { label: type ?? "Private", className: "bg-gray-100 text-gray-700 border-gray-200" };
    return <Badge className={`text-xs ${config.className}`}>{config.label}</Badge>;
  };

  return (
    <div className="p-2 bg-gradient-to-br from-indigo-100/60 via-blue-50/70 to-slate-100/60 rounded-xl border border-indigo-200/50 shadow-lg">
      <Card className="bg-white/80 border-0">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Coach Details</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="ml-1">Close</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile section (left, 1/3 width) */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-500 shadow-lg shrink-0">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {profile.name ?? "Unknown"}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getStatusBadge()}
                <Badge variant="outline" className="text-xs">
                  {profile.revenueSplitPercent}% split
                </Badge>
              </div>

              {profile.bio && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Bio</p>
                  <p className="text-sm text-gray-700 line-clamp-3">{profile.bio}</p>
                </div>
              )}

              {profile.skills && profile.skills.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Skills</p>
                  <p className="text-sm text-gray-700">{profile.skills.join(", ")}</p>
                </div>
              )}

              {/* Monthly stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center p-3 rounded-lg bg-blue-50/80 border border-blue-100">
                  <Calendar className="h-4 w-4 text-blue-500 mb-1" />
                  <span className="text-lg font-bold text-gray-900">{stats.monthLessonCount}</span>
                  <span className="text-[10px] text-muted-foreground">Lessons/Mo</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-emerald-50/80 border border-emerald-100">
                  <DollarSign className="h-4 w-4 text-emerald-500 mb-1" />
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(stats.monthEarnings)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Earnings/Mo</span>
                </div>
              </div>
            </div>

            {/* Right side (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upcoming lessons section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Upcoming Lessons ({upcomingLessons.length})
                </h4>
                {upcomingLessons.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No upcoming lessons
                  </p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80">
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Time</TableHead>
                          <TableHead className="text-xs">Student</TableHead>
                          <TableHead className="text-xs">Rink</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingLessons.map((lesson) => (
                          <TableRow key={lesson.id} className="text-sm">
                            <TableCell className="text-xs">
                              {format(new Date(lesson.startTime), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(lesson.startTime), "h:mm a")}
                            </TableCell>
                            <TableCell className="text-xs">
                              {lesson.Student?.User?.name ?? "Unknown"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {lesson.Rink?.name ?? "N/A"}
                            </TableCell>
                            <TableCell>
                              {getLessonTypeBadge(lesson.type)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Student roster section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" />
                  Student Roster ({studentRoster.length})
                </h4>
                {studentRoster.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No students assigned
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {studentRoster.map((entry) => (
                      <div
                        key={entry.Student.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/80 border border-gray-100"
                      >
                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-emerald-700">
                            {(entry.Student.User?.name ?? "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {entry.Student.User?.name ?? "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {entry.Student.User?.email ?? ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CoachDetailView;
