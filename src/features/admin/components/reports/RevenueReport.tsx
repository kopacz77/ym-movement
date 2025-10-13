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
}

// Define types for the API response data
interface RevenueDataItem {
  date: string;
  totalRevenue: number;
}

export const RevenueReport: React.FC<RevenueReportProps> = ({ period }) => {
  // Fetch revenue data using your analytics endpoint
  const { data, isLoading, error } = api.admin.analytics.getRevenueReport.useQuery({
    period,
  });

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
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => {
              return new Date(date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }}
          />
          <YAxis tickFormatter={(value) => `$${value}`} />
          <Tooltip
            formatter={(value, name) => [
              `$${Number(value).toFixed(2)}`,
              name === "totalRevenue" ? "Revenue" : name,
            ]}
            labelFormatter={(label) =>
              new Date(label).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            }
          />
          <Legend />
          <Bar dataKey="totalRevenue" name="Revenue" fill="#8884d8" />
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
