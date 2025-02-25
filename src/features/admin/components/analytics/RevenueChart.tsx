"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { TRPCClientError } from '@trpc/client';

type TimeRange = 'week' | 'month' | 'year';

interface PaymentData {
  amount: number;
  createdAt: Date;
}

interface ChartData {
  date: string;
  revenue: number;
}

export const RevenueChart = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const { toast } = useToast();
  
  // UPDATED: Use the "analytics" namespace for revenue procedures.
  const { data, isLoading, error } = api.admin.analytics.getRevenueReport.useQuery(
    { period: timeRange },
    { retry: 3 }
  );

  useEffect(() => {
    if (error instanceof TRPCClientError) {
      toast({
        title: "Error loading revenue data",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const chartData = React.useMemo(() => {
    if (!data) return [];
    
    const groupedData = (data as PaymentData[]).reduce((acc: Record<string, number>, payment) => {
      const date = new Date(payment.createdAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + payment.amount;
      return acc;
    }, {});

    return Object.entries(groupedData)
      .map(([date, amount]): ChartData => ({
        date,
        revenue: amount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

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

  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const averageRevenue = chartData.length > 0 ? totalRevenue / chartData.length : 0;

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
        <Select
          value={timeRange}
          onValueChange={(value: TimeRange) => setTimeRange(value)}
        >
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
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(date) =>
                new Date(date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              }
            />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
              labelFormatter={(label) =>
                new Date(label).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              }
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#8884d8"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};