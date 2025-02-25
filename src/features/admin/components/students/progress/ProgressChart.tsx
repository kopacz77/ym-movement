// features/admin/components/students/progress/ProgressChart.tsx
"use client";

import React, { useEffect } from 'react';
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

  // Get lessons and calculate progress from them
  const { data: lessons, isLoading, error } = api.admin.schedule.getLessonsByDate.useQuery(
    { 
      startDate: calculateStartDate(timeRange),
      endDate: new Date()
    },
    {
      select: (data) => {
        // Filter for this student's lessons
        const studentLessons = data.filter(lesson => 
          lesson.student?.user?.id === studentId && 
          lesson.status !== 'CANCELLED'
        );

        // Process lessons into progress data points
        return processLessonsIntoProgressData(studentLessons);
      }
    }
  );

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading progress data",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [error, toast]);

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
        <Select 
          value={timeRange} 
          onValueChange={(value: 'month' | 'quarter' | 'year') => setTimeRange(value)}
        >
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
            <LineChart data={lessons || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Line 
                type="monotone" 
                dataKey="attendance" 
                stroke="#8884d8" 
                name="Attendance Rate" 
              />
              <Line 
                type="monotone" 
                dataKey="completion" 
                stroke="#82ca9d" 
                name="Completion Rate" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to calculate start date based on time range
function calculateStartDate(timeRange: 'month' | 'quarter' | 'year'): Date {
  const now = new Date();
  switch (timeRange) {
    case 'month':
      return new Date(now.setMonth(now.getMonth() - 1));
    case 'quarter':
      return new Date(now.setMonth(now.getMonth() - 3));
    case 'year':
      return new Date(now.setFullYear(now.getFullYear() - 1));
  }
}

// Helper function to process lessons into progress data
function processLessonsIntoProgressData(lessons: any[]) {
  return lessons.map(lesson => ({
    date: lesson.startTime,
    attendance: lesson.status === 'COMPLETED' ? 100 : 0,
    completion: lesson.status === 'COMPLETED' ? 100 : 
                lesson.status === 'SCHEDULED' ? 0 : 50
  }));
}