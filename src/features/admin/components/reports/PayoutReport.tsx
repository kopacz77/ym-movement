"use client";

import { format } from "date-fns";
import { DollarSign, Download, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { exportPayoutReportToCSV } from "@/lib/export-utils";
import { formatCurrency } from "@/lib/utils";

interface PayoutReportProps {
  period: "week" | "month" | "year";
  startDate: Date;
  endDate: Date;
}

export function PayoutReport({ period, startDate, endDate }: PayoutReportProps) {
  const { data, isLoading } = api.admin.superAdmin.getRevenueBreakdown.useQuery({
    startDate,
    endDate,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.coaches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No payout data for this period.</p>
      </div>
    );
  }

  const handleExportCSV = () => {
    try {
      const periodLabel =
        period === "month"
          ? format(startDate, "yyyy-MM")
          : period === "week"
            ? `week-${format(startDate, "yyyy-MM-dd")}`
            : `year-${format(startDate, "yyyy")}`;

      exportPayoutReportToCSV(data.coaches, data.totals, periodLabel);
      toast.success("Payout report exported");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export payout report");
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-4 border rounded-lg">
          <DollarSign className="h-8 w-8 text-green-600" />
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-bold">{formatCurrency(data.totals.totalRevenue)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 border rounded-lg">
          <Users className="h-8 w-8 text-[#0891b2]" />
          <div>
            <p className="text-sm text-muted-foreground">Coach Payouts</p>
            <p className="text-xl font-bold">{formatCurrency(data.totals.totalCoachPayouts)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 border rounded-lg">
          <DollarSign className="h-8 w-8 text-purple-600" />
          <div>
            <p className="text-sm text-muted-foreground">Platform Revenue</p>
            <p className="text-xl font-bold">{formatCurrency(data.totals.totalPlatformRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Export button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export Payouts CSV
        </Button>
      </div>

      {/* Per-coach table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Coach</TableHead>
              <TableHead className="text-right">Split %</TableHead>
              <TableHead className="text-right">Gross Revenue</TableHead>
              <TableHead className="text-right">Coach Payout</TableHead>
              <TableHead className="text-right">Platform Share</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Lessons</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.coaches.map((coach) => (
              <TableRow key={coach.coachId}>
                <TableCell className="font-medium">{coach.name || "Unknown"}</TableCell>
                <TableCell className="text-right">{coach.revenueSplitPercent}%</TableCell>
                <TableCell className="text-right">{formatCurrency(coach.totalRevenue)}</TableCell>
                <TableCell className="text-right text-green-700 font-medium">
                  {formatCurrency(coach.coachPayout)}
                </TableCell>
                <TableCell className="text-right text-purple-700">
                  {formatCurrency(coach.platformRevenue)}
                </TableCell>
                <TableCell className="text-right hidden sm:table-cell">
                  {coach.lessonCount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">Total</TableCell>
              <TableCell />
              <TableCell className="text-right font-bold">
                {formatCurrency(data.totals.totalRevenue)}
              </TableCell>
              <TableCell className="text-right font-bold text-green-700">
                {formatCurrency(data.totals.totalCoachPayouts)}
              </TableCell>
              <TableCell className="text-right font-bold text-purple-700">
                {formatCurrency(data.totals.totalPlatformRevenue)}
              </TableCell>
              <TableCell className="hidden sm:table-cell" />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
