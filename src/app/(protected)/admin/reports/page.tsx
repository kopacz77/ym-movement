// src/app/(protected)/admin/reports/page.tsx
"use client";

import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Download, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  exportAttendanceToCSV,
  exportCombinedReportToCSV,
  exportRevenueToCSV,
  exportToPDF,
} from "@/lib/export-utils";
import { formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  // For month selection - start with current month
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));

  // Calculate the actual date range based on period and selected month
  const getDateRange = () => {
    switch (period) {
      case "week": {
        // Last 7 days from today
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return {
          start: weekAgo,
          end: new Date(),
        };
      }
      case "month":
        // Selected calendar month
        return {
          start: startOfMonth(selectedMonth),
          end: endOfMonth(selectedMonth),
        };
      case "year":
        // Last 12 months from today
        return {
          start: subMonths(new Date(), 12),
          end: new Date(),
        };
      default:
        return {
          start: startOfMonth(selectedMonth),
          end: endOfMonth(selectedMonth),
        };
    }
  };

  const dateRange = getDateRange();

  // Fetch overview data for summary
  const { data: overviewData, isLoading: isLoadingOverview } =
    api.admin.analytics.getOverview.useQuery();

  // Fetch report data using actual date ranges
  const { data: revenueData } = api.admin.analytics.getRevenueReport.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });
  const { data: attendanceData } = api.admin.analytics.getStudentActivity.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  // Navigation handlers for month picker
  const goToPreviousMonth = () => {
    setSelectedMonth((prev) => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth((prev) => addMonths(prev, 1));
  };

  // Check if we can go to next month (don't allow future months)
  const canGoNext = startOfMonth(addMonths(selectedMonth, 1)) <= startOfMonth(new Date());

  // Export handlers
  const handleExportCSV = (type: "revenue" | "attendance" | "combined") => {
    if (!revenueData || !attendanceData || !overviewData) {
      toast.error("Export failed", {
        description: "Report data is not yet loaded. Please wait and try again.",
      });
      return;
    }

    try {
      toast("Export started", {
        description: "Preparing your CSV download...",
      });

      const options = { period, format: "csv" as const };

      switch (type) {
        case "revenue":
          exportRevenueToCSV(revenueData, options);
          break;
        case "attendance": {
          // Transform attendance data to match expected format
          const formattedAttendanceData = attendanceData.map((item) => ({
            ...item,
            attendanceRate:
              item.totalLessons > 0 ? (item.completedLessons / item.totalLessons) * 100 : 0,
          }));
          exportAttendanceToCSV(formattedAttendanceData, options);
          break;
        }
        case "combined": {
          const formattedCombined = attendanceData.map((item) => ({
            ...item,
            attendanceRate:
              item.totalLessons > 0 ? (item.completedLessons / item.totalLessons) * 100 : 0,
          }));
          exportCombinedReportToCSV(revenueData, formattedCombined, overviewData, options);
          break;
        }
      }

      setTimeout(() => {
        toast.success("Export complete", {
          description: "Your CSV file has been downloaded.",
        });
      }, 500);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed", {
        description: "There was an error generating your report. Please try again.",
      });
    }
  };

  const handleExportPDF = async () => {
    if (!revenueData || !attendanceData || !overviewData) {
      toast.error("Export failed", {
        description: "Report data is not yet loaded. Please wait and try again.",
      });
      return;
    }

    try {
      toast("Export started", {
        description: "Opening print dialog for PDF export...",
      });

      const formattedAttendanceData = attendanceData.map((item) => ({
        ...item,
        attendanceRate:
          item.totalLessons > 0 ? (item.completedLessons / item.totalLessons) * 100 : 0,
      }));

      await exportToPDF(revenueData, formattedAttendanceData, overviewData, {
        period,
        format: "pdf",
      });

      setTimeout(() => {
        toast.success("Export ready", {
          description: "Use the print dialog to save as PDF or print the report.",
        });
      }, 1000);
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Failed to generate PDF report.",
      });
    }
  };

  return (
    <div className="container mx-auto py-4 lg:py-6 space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="self-start sm:self-auto">
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExportCSV("combined")}>
              <FileText className="mr-2 h-4 w-4" />
              Export Full Report (CSV)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExportCSV("revenue")}>
              <Download className="mr-2 h-4 w-4" />
              Revenue Only (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportCSV("attendance")}>
              <Download className="mr-2 h-4 w-4" />
              Attendance Only (CSV)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileText className="mr-2 h-4 w-4" />
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Period:</span>
            <Select
              value={period}
              onValueChange={(value: "week" | "month" | "year") => setPeriod(value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Select month</SelectItem>
                <SelectItem value="year">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Month picker - only shown when "month" period is selected */}
          {period === "month" && (
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goToPreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {format(selectedMonth, "MMMM yyyy")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goToNextMonth}
                disabled={!canGoNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Properly nested Tabs structure */}
      <Tabs defaultValue="revenue">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:w-[400px] lg:grid-cols-auto">
          <TabsTrigger value="revenue" className="text-sm">
            Revenue
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-sm">
            Attendance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Report</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueReport period={period} startDate={dateRange.start} endDate={dateRange.end} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Report</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceReport period={period} startDate={dateRange.start} endDate={dateRange.end} />
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
                  {format(dateRange.start, "PP")} - {format(dateRange.end, "PP")}
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
