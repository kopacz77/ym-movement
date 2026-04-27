// src/features/admin/components/reports/RevenueReport.tsx
import React from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface RevenueReportProps {
  period: "week" | "month" | "year";
  startDate?: Date;
  endDate?: Date;
}

// Define types for the API response data
interface RevenueDataItem {
  date: string;
  totalRevenue: number;
}

export const RevenueReport: React.FC<RevenueReportProps> = ({ period, startDate, endDate }) => {
  // Fetch revenue data using date range if provided, otherwise fall back to period
  const { data, isLoading, error } = api.admin.analytics.getRevenueReport.useQuery(
    startDate && endDate ? { startDate, endDate } : { period },
  );

  // Calculate totals and averages with very explicit type handling
  const totalRevenue = React.useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return 0;
    }

    return data.reduce((sum: number, item: RevenueDataItem) => {
      const itemRevenue = typeof item.totalRevenue === "number" ? item.totalRevenue : 0;
      return sum + itemRevenue;
    }, 0);
  }, [data]);

  const averageRevenue = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return 0;
    }
    return totalRevenue / data.length;
  }, [data, totalRevenue]);

  if (isLoading) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <p>Loading revenue data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <p className="text-red-500">Error loading revenue data</p>
      </div>
    );
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <p>No revenue data available for the selected period</p>
      </div>
    );
  }

  // Use the data safely now that we've validated it
  const safeData = data as RevenueDataItem[];

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={safeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            stroke="#94a3b8"
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
          <YAxis
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            stroke="#94a3b8"
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            formatter={(value, name) => [
              `$${Number(value).toFixed(2)}`,
              name === "totalRevenue" ? "Revenue" : name,
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
          <Bar dataKey="totalRevenue" name="Revenue" fill="#0891b2" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Average {period === "week" ? "Daily" : period === "month" ? "Weekly" : "Monthly"}{" "}
              Revenue
            </div>
            <div className="text-2xl font-bold">{formatCurrency(averageRevenue)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
