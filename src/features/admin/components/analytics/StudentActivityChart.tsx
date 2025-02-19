"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

type ActivityMetric = 'lessons' | 'attendance' | 'cancellations';
type TimeRange = 'week' | 'month' | 'year';

export const StudentActivityChart = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [metric, setMetric] = useState<ActivityMetric>('lessons');
  const { toast } = useToast();
  const { data, isLoading, error } = api.admin.getStudentActivity.useQuery(
    { period: timeRange },
    {
      onError: (err) => {
        toast({
          title: "Error loading student activity",
          description: err.message,
          variant: "destructive",
        });
      },
    }
  );

  // Process data for the chart
  const chartData = React.useMemo(() => {
    if (!data) return [];
    return data.map(day => ({
      date: day.date,
      lessons: day.totalLessons,
      attendance: day.attendedLessons,
      cancellations: day.cancelledLessons,
      attendanceRate: Math.round((day.attendedLessons / day.totalLessons) * 100) || 0,
    }));
  }, [data]);

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
          <p className="text-red-600">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary statistics
  const totalLessons = chartData.reduce((sum, day) => sum + day.lessons, 0);
  const averageAttendance = chartData.reduce((sum, day) => sum + day.attendanceRate, 0) / chartData.length;

  const getBarColor = (metricType: ActivityMetric) => {
    switch (metricType) {
      case 'lessons': return '#82ca9d';
      case 'attendance': return '#8884d8';
      case 'cancellations': return '#ff8042';
      default: return '#82ca9d';
    }
  };

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
                new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }
            />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}${metric === 'attendance' ? '%' : ''}`} />
            <Tooltip formatter={(value: number) => [`${value}${metric === 'attendance' ? '%' : ''}`, metric.charAt(0).toUpperCase() + metric.slice(1)]}
                     labelFormatter={(label) =>
                       new Date(label).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                     } />
            <Legend />
            <Bar dataKey={metric} fill={getBarColor(metric)} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
