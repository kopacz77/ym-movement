// src/features/student/components/dashboard/LessonSummary.tsx
"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { TRPCClientError } from '@trpc/client';

interface LessonSummaryProps {
  studentId: string;
}

export const LessonSummary = ({ studentId }: LessonSummaryProps) => {
  const { toast } = useToast();
  
  const { data: stats, isLoading } = api.student.profile.getStudentLessonStats.useQuery({
    studentId,
  }, {
    onError: (error: TRPCClientError<any>) => {
      toast({
        title: "Error loading lesson stats",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const weeklyProgressPercentage = stats ? (stats.thisWeekCount / stats.maxAllowed) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lesson Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold">{stats?.upcoming || 0}</span>
                <span className="text-sm text-muted-foreground">Upcoming</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold">{stats?.completed || 0}</span>
                <span className="text-sm text-muted-foreground">Completed</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold">{stats?.cancelled || 0}</span>
                <span className="text-sm text-muted-foreground">Cancelled</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Weekly Lessons</span>
                <span>{stats?.thisWeekCount || 0} / {stats?.maxAllowed || 0}</span>
              </div>
              <Progress value={weeklyProgressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                You have {Math.max(0, (stats?.maxAllowed || 0) - (stats?.thisWeekCount || 0))} lessons remaining this week
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};