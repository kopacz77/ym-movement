// features/admin/components/students/progress/ProgressChart.tsx
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface ProgressChartProps {
  studentId: string;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({ studentId }) => {
  const [timeRange, setTimeRange] = React.useState<'month' | 'quarter' | 'year'>('month');
  const { toast } = useToast();
  const { data: progressData, isLoading } = api.admin.getStudentProgress.useQuery(
    { studentId, period: timeRange },
    {
      onError: (err) => {
        toast({ title: "Error loading progress data", description: err.message, variant: "destructive" });
      },
    }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progress Tracking</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Progress Tracking</CardTitle>
        <Select value={timeRange} onValueChange={(value: 'month' | 'quarter' | 'year') => setTimeRange(value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="quarter">Quarter</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="attendance" stroke="#8884d8" name="Attendance Rate" />
              <Line type="monotone" dataKey="skillProgress" stroke="#82ca9d" name="Skill Progress" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
