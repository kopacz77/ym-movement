// Updated src/features/admin/components/analytics/RevenueChart.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
import { formatCurrency } from "@/lib/utils";

type TimeRange = "week" | "month" | "year";

interface ChartData {
  date: string;
  revenue: number;
}

export const RevenueChart = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("month");

  // Use the "analytics" namespace for revenue procedures
  const { data, isLoading, error } = api.admin.analytics.getRevenueReport.useQuery(
    { period: timeRange },
    { retry: 3 },
  );

  useEffect(() => {
    if (error) {
      toast.error("Error loading revenue data", {
        description: error.message,
      });
    }
  }, [error]);

  const chartData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    const formattedData: ChartData[] = [];

    for (const item of data) {
      // Safe type checking
      if (typeof item !== "object" || item === null) {
        continue;
      }

      // Extract date with fallback
      let date = "";
      let revenue = 0;

      if ("date" in item && typeof item.date === "string") {
        date = item.date;
      } else if ("createdAt" in item) {
        // Handle alternative date property
        const createdAt = item.createdAt;
        if (createdAt instanceof Date) {
          date = createdAt.toISOString().split("T")[0];
        } else if (typeof createdAt === "string") {
          date = new Date(createdAt).toISOString().split("T")[0];
        }
      }

      // Extract amount/revenue with fallback
      if ("revenue" in item && typeof item.revenue === "number") {
        revenue = item.revenue;
      } else if ("totalRevenue" in item && typeof item.totalRevenue === "number") {
        revenue = item.totalRevenue;
      } else if ("amount" in item && typeof item.amount === "number") {
        revenue = item.amount;
      }

      // Only add valid data points
      if (date && revenue) {
        // Check if date already exists in our formatted data
        const existingIndex = formattedData.findIndex((d) => d.date === date);
        if (existingIndex >= 0) {
          formattedData[existingIndex].revenue += revenue;
        } else {
          formattedData.push({ date, revenue });
        }
      }
    }

    // Sort by date
    return formattedData.sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const averageRevenue = chartData.length > 0 ? totalRevenue / chartData.length : 0;

  if (isLoading) {
    return (
      <Card className="w-full h-[400px]">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Revenue Overview</CardTitle>
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
          <CardTitle className="text-red-700">Error Loading Revenue Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Failed to load revenue data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-[400px]">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Revenue Overview</CardTitle>
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <div>Total: {formatCurrency(totalRevenue)}</div>
            <div>Average: {formatCurrency(averageRevenue)}/day</div>
          </div>
        </div>
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
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0891b2" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              stroke="#94a3b8"
              tickFormatter={(date) =>
                new Date(date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              stroke="#94a3b8"
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
              labelFormatter={(label) =>
                new Date(label).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#0891b2"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              fillOpacity={1}
              dot={{ r: 3, fill: "#0891b2" }}
              activeDot={{ r: 5, fill: "#0891b2", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
