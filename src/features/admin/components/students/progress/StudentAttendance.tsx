"use client";

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { api } from '@/lib/api';
import { toast } from "sonner";
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Info } from 'lucide-react';
import type { DayProps, DateRange } from 'react-day-picker';

interface StudentAttendanceProps {
  studentId: string;
}

export const StudentAttendance: React.FC<StudentAttendanceProps> = ({ studentId }) => {
  const [date, setDate] = React.useState(new Date());
  
  // Use our new API endpoint
  const { data: attendance, isLoading, error } = api.admin.analytics.getStudentAttendance.useQuery(
    { 
      studentId, 
      startDate: startOfMonth(date), 
      endDate: endOfMonth(date) 
    },
    { enabled: !!studentId }
  );

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error("Error loading attendance", {
        description: error.message
      });
    }
  }, [error]);

  const getLessonStyles = (day: Date) => {
    if (!attendance) return {};
    
    const lesson = attendance.lessons.find(
      l => format(new Date(l.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );
    
    if (!lesson) return {};
    
    switch (lesson.status) {
      case 'COMPLETED': return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'CANCELLED': return { backgroundColor: '#fee2e2', color: '#991b1b' };
      case 'SCHEDULED': return { backgroundColor: '#dbeafe', color: '#1e40af' };
      default: return {};
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Attendance</CardTitle>
        {attendance && (
          <div className="flex items-center gap-4 text-sm">
            <div>Rate: {attendance.attendanceRate.toFixed(1)}%</div>
            <div>Total: {attendance.total}</div>
            <div className="text-green-600">Attended: {attendance.attended}</div>
            <div className="text-red-600">Cancelled: {attendance.cancelled}</div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">Loading...</div>
        ) : (
          <div className="flex gap-4">
            <div className="rounded-md border p-3">
              <Calendar
                selected={date}
                onSelect={(range: DateRange | undefined) => range?.from && setDate(range.from)}
                components={{
                  Day: (props: DayProps) => {
                    const day = props.date;
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button 
                            {...props} 
                            className="w-9 h-9 rounded-md hover:bg-accent"
                            style={getLessonStyles(day)}
                          >
                            {format(day, 'd')}
                          </button>
                        </PopoverTrigger>
                        {attendance?.lessons.some(
                          l => format(new Date(l.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                        ) && (
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              {attendance.lessons
                                .filter(l => format(new Date(l.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
                                .map((lesson, idx) => (
                                  <div key={lesson.id || idx} className="text-sm">
                                    <div className="font-medium">{format(new Date(lesson.date), 'h:mm a')}</div>
                                    <div className="text-muted-foreground">Status: {lesson.status}</div>
                                    {lesson.cancellationReason && (
                                      <div className="text-red-600 text-xs mt-1">
                                        Reason: {lesson.cancellationReason}
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </PopoverContent>
                        )}
                      </Popover>
                    );
                  },
                }}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Legend</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-[#dcfce7]" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-[#fee2e2]" />
                  <span>Cancelled</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-[#dbeafe]" />
                  <span>Scheduled</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};