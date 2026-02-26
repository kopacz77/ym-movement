// src/features/admin/components/reports/AttendanceReport.tsx
import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

interface AttendanceReportProps {
  period: "week" | "month" | "year";
  startDate?: Date;
  endDate?: Date;
}

// Define types based on the API response structure
interface ActivityData {
  date: string;
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  byType: Record<string, number>;
  byArea: Record<string, number>;
}

// Define the type for our chart data
interface ActivityDataWithAttendanceRate extends ActivityData {
  attendanceRate: number;
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({
  period,
  startDate,
  endDate,
}) => {
  // Fetch student activity data using date range if provided, otherwise fall back to period
  const { data, isLoading, error } = api.admin.analytics.getStudentActivity.useQuery(
    startDate && endDate ? { startDate, endDate } : { period },
  );

  // Calculate averages with explicit type handling
  const averageAttendance = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return 0;
    }

    const totalAttendance = data.reduce((sum: number, item: ActivityData) => {
      const rate = item.totalLessons > 0 ? (item.completedLessons / item.totalLessons) * 100 : 0;
      return sum + rate;
    }, 0);

    return totalAttendance / data.length;
  }, [data]);

  const totalLessons = React.useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return 0;
    }

    return data.reduce((sum: number, item: ActivityData) => {
      return sum + item.totalLessons;
    }, 0);
  }, [data]);

  if (isLoading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <p>Loading attendance data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <p className="text-red-500">Error loading attendance data</p>
      </div>
    );
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <p>No attendance data available for the selected period</p>
      </div>
    );
  }

  // Map the API data to our ActivityDataItem format by computing attendanceRate
  const safeData: ActivityDataWithAttendanceRate[] = data.map((item: ActivityData) => ({
    ...item,
    attendanceRate:
      item.totalLessons > 0 ? Math.round((item.completedLessons / item.totalLessons) * 100) : 0,
  }));

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={safeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(date: string) => {
              // Monthly aggregation keys are YYYY-MM (length 7)
              if (date.length === 7) {
                const [year, month] = date.split("-");
                return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
                  month: "short",
                  year: "2-digit",
                });
              }
              return new Date(date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }}
          />
          <YAxis tickFormatter={(value) => `${value}%`} />
          <Tooltip
            formatter={(value, name) => [
              `${Number(value).toFixed(1)}%`,
              name === "completedLessons"
                ? "Completed"
                : name === "attendanceRate"
                  ? "Attendance Rate"
                  : name === "cancelledLessons"
                    ? "Cancelled"
                    : name,
            ]}
            labelFormatter={(label: string) => {
              if (label.length === 7) {
                const [year, month] = label.split("-");
                return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                });
              }
              return new Date(label).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="attendanceRate"
            name="Attendance Rate"
            stroke="#8884d8"
            strokeWidth={2}
            activeDot={{ r: 8 }}
          />
          <Line
            type="monotone"
            dataKey="cancelledLessons"
            name="Cancellations"
            stroke="#ff8042"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Average Attendance Rate</div>
            <div className="text-2xl font-bold">{averageAttendance.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Lessons</div>
            <div className="text-2xl font-bold">{totalLessons}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
