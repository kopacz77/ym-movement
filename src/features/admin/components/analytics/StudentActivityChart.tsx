// src/features/admin/components/analytics/StudentActivityChart.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

type ActivityMetric = "lessons" | "attendance" | "cancellations";
type TimeRange = "week" | "month" | "year";

// API data shape from getStudentActivity
interface ActivityData {
  date: string;
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  byType: Record<string, number>;
  byArea: Record<string, number>;
}

// Internal type used for chart data.
interface ChartData {
  date: string;
  lessons: number;
  attendance: number;
  cancellations: number;
  attendanceRate: number;
}

export const StudentActivityChart: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [metric, setMetric] = useState<ActivityMetric>("lessons");

  // Call the procedure using the namespaced path.
  const { data, isLoading, error } = api.admin.analytics.getStudentActivity.useQuery({
    period: timeRange,
  });

  // Handle errors with useEffect.
  useEffect(() => {
    if (error) {
      const err = error as { message: string };
      toast.error("Error loading student activity", {
        description: err.message || "An unexpected error occurred",
      });
    }
  }, [error]);

  // Transform API data into the format expected by our chart.
  const chartData = useMemo<ChartData[]>(() => {
    if (!data) return [];
    const activityData = data as ActivityData[];
    return activityData.map((day) => ({
      date: day.date,
      lessons: day.totalLessons,
      attendance: day.completedLessons, // Use completedLessons as attendance.
      cancellations: day.cancelledLessons,
      attendanceRate:
        day.totalLessons > 0 ? Math.round((day.completedLessons / day.totalLessons) * 100) : 0,
    }));
  }, [data]);

  const getBarColor = (metricType: ActivityMetric): string => {
    switch (metricType) {
      case "lessons":
        return "#82ca9d";
      case "attendance":
        return "#8884d8";
      case "cancellations":
        return "#ff8042";
      default:
        return "#82ca9d";
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full h-[400px]">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Student Activity</CardTitle>
            <div className="w-32 h-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px] bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full h-[400px] border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Student Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{(error as { message: string }).message}</p>
        </CardContent>
      </Card>
    );
  }

  const totalLessons = chartData.reduce((sum, day) => sum + day.lessons, 0);
  const averageAttendance =
    chartData.length > 0
      ? chartData.reduce((sum, day) => sum + day.attendanceRate, 0) / chartData.length
      : 0;

  return (
    <Card className="w-full h-[400px]">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Student Activity</CardTitle>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <div>Total Lessons: {totalLessons}</div>
            <div>Avg. Attendance: {averageAttendance.toFixed(1)}%</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={metric} onValueChange={(value: ActivityMetric) => setMetric(value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lessons">Lessons</SelectItem>
              <SelectItem value="attendance">Attendance</SelectItem>
              <SelectItem value="cancellations">Cancellations</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(date) =>
                new Date(date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}${metric === "attendance" ? "%" : ""}`}
            />
            <Tooltip
              formatter={(value: number) => [
                `${value}${metric === "attendance" ? "%" : ""}`,
                metric.charAt(0).toUpperCase() + metric.slice(1),
              ]}
              labelFormatter={(label) =>
                new Date(label).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              }
            />
            <Legend />
            <Bar dataKey={metric} fill={getBarColor(metric)} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
