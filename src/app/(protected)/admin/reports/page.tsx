// src/app/(protected)/admin/reports/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceReport } from "@/features/admin/components/reports/AttendanceReport";
import { RevenueReport } from "@/features/admin/components/reports/RevenueReport";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { Download } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

export default function ReportsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  // Fetch overview data for summary
  const { data: overviewData, isLoading: isLoadingOverview } =
    api.admin.analytics.getOverview.useQuery();

  // Calculate date range based on period
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "week":
        return {
          start: new Date(now.setDate(now.getDate() - 7)),
          end: new Date(),
        };
      case "month":
        return {
          start: startOfMonth(new Date()),
          end: endOfMonth(new Date()),
        };
      case "year":
        return {
          start: subMonths(new Date(), 12),
          end: new Date(),
        };
      default:
        return {
          start: startOfMonth(new Date()),
          end: endOfMonth(new Date()),
        };
    }
  };

  const handleExport = () => {
    toast("Export started", {
      description: "Your report is being prepared for download.",
    });

    // In a real implementation, this would trigger an export to CSV or PDF
    setTimeout(() => {
      toast("Export complete", {
        description: "Your report has been downloaded.",
      });
    }, 1500);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export Report
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Period:</span>
          <Select
            value={period}
            onValueChange={(value: "week" | "month" | "year") => setPeriod(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="year">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Properly nested Tabs structure */}
      <Tabs defaultValue="revenue">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Report</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueReport period={period} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Report</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceReport period={period} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Report Period</p>
                <p className="text-lg">
                  {format(getDateRange().start, "PP")} - {format(getDateRange().end, "PP")}
                </p>
              </div>

              {isLoadingOverview ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                    <p className="text-lg">{overviewData?.totalStudents || 0}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Lessons</p>
                    <p className="text-lg">{overviewData?.activeLessons || 0}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                    <p className="text-lg">{formatCurrency(overviewData?.monthlyRevenue || 0)}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This report provides an overview of revenue and attendance for the selected period.
              Use the period selector to change the date range of the report. You can export this
              report by clicking the Export button.
            </p>
            <div className="mt-4 p-3 border rounded bg-amber-50 text-amber-800">
              <p className="text-sm font-medium">Pro Tip</p>
              <p className="text-xs mt-1">
                For more detailed insights, try changing the report period to see trends over
                different timeframes. Weekly reports are great for immediate insights, while monthly
                and yearly reports help identify long-term patterns.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
