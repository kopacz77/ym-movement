"use client";

import { DollarSign, TrendingUp, Users } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export const RevenueBreakdownChart = () => {
  const { data, error, isLoading } = api.admin.superAdmin.getRevenueBreakdown.useQuery(
    {},
    { retry: 3 },
  );

  useEffect(() => {
    if (error) {
      toast.error("Error loading revenue breakdown", {
        description: error.message,
      });
    }
  }, [error]);

  if (isLoading) {
    return (
      <Card className="w-full bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/80 border-2 border-slate-200 shadow-md">
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-48 bg-slate-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Failed to load revenue breakdown data</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { coaches, totals } = data;

  const isAllZero =
    totals.totalRevenue === 0 &&
    totals.totalCoachPayouts === 0 &&
    totals.totalPlatformRevenue === 0;

  // Sort coaches by total revenue descending
  const sortedCoaches = [...coaches].sort((a, b) => b.totalRevenue - a.totalRevenue);

  return (
    <Card className="w-full bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/80 border-2 border-slate-200 shadow-md">
      <CardHeader className="bg-gradient-to-r from-slate-100/50 to-blue-50/50 rounded-t-lg border-b border-slate-200/50">
        <CardTitle>Revenue Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Platform-wide totals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50/80 border border-blue-100">
            <div className="p-2 rounded-lg bg-blue-500 shrink-0">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(totals.totalRevenue)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50/80 border border-amber-100">
            <div className="p-2 rounded-lg bg-amber-500 shrink-0">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Coach Payouts</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(totals.totalCoachPayouts)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50/80 border border-emerald-100">
            <div className="p-2 rounded-lg bg-emerald-500 shrink-0">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Platform Revenue</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(totals.totalPlatformRevenue)}
              </p>
            </div>
          </div>
        </div>

        {/* Per-coach breakdown table */}
        {isAllZero ? (
          <div className="flex flex-col items-center justify-center py-8">
            <DollarSign className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-muted-foreground">
              No revenue data for the current period.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="text-xs font-semibold">Coach</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Split %</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Revenue</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Coach Payout</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Platform Share</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Lessons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCoaches.map((coach, index) => (
                  <TableRow
                    key={coach.coachId}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                  >
                    <TableCell className="text-sm font-medium">
                      {coach.name ?? "Unknown"}
                    </TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">
                      {coach.revenueSplitPercent}%
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      {formatCurrency(coach.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-sm text-right text-amber-700">
                      {formatCurrency(coach.coachPayout)}
                    </TableCell>
                    <TableCell className="text-sm text-right text-emerald-700">
                      {formatCurrency(coach.platformRevenue)}
                    </TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">
                      {coach.lessonCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell />
                  <TableCell className="text-right">
                    {formatCurrency(totals.totalRevenue)}
                  </TableCell>
                  <TableCell className="text-right text-amber-700">
                    {formatCurrency(totals.totalCoachPayouts)}
                  </TableCell>
                  <TableCell className="text-right text-emerald-700">
                    {formatCurrency(totals.totalPlatformRevenue)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RevenueBreakdownChart;
