/**
 * Bulk Create Confirmation Dialog
 *
 * Enhanced confirmation with detailed preview before creation
 *
 * @version 1.0.0
 */

"use client";

import { format, parse } from "date-fns";
import { AlertTriangle, Calendar, Clock, MapPin, Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface BulkCreateConfirmationData {
  rinkName: string;
  startDate: string;
  endDate: string;
  dailyStartTime: string;
  dailyEndTime: string;
  slotDuration: number;
  breaks: Array<{ startTime: string; duration: number }>;
  maxStudents: number;
  daysOfWeek: number[];
  estimatedSlots: number;
  conflicts?: Array<{
    date: string;
    time: string;
    reason: string;
  }>;
  warnings?: string[];
}

interface BulkCreateConfirmationProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: BulkCreateConfirmationData;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function BulkCreateConfirmation({
  isOpen,
  onOpenChange,
  data,
  onConfirm,
  isLoading = false,
}: BulkCreateConfirmationProps) {
  const dayAbbrevs = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const validBreaks = data.breaks.filter((b) => b.startTime && b.duration > 0);

  // Calculate total hours per week
  const calculateWeeklyHours = () => {
    if (!data.dailyStartTime || !data.dailyEndTime) {
      return 0;
    }

    try {
      const start = parse(data.dailyStartTime, "HH:mm", new Date());
      const end = parse(data.dailyEndTime, "HH:mm", new Date());
      const dailyMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

      // Subtract break time
      const breakMinutes = validBreaks.reduce((total, b) => total + b.duration, 0);
      const netDailyMinutes = dailyMinutes - breakMinutes;

      return (netDailyMinutes * data.daysOfWeek.length) / 60;
    } catch {
      return 0;
    }
  };

  const weeklyHours = calculateWeeklyHours();

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Confirm Bulk Time Slot Creation
          </AlertDialogTitle>
          <AlertDialogDescription>
            Review the details below before creating {data.estimatedSlots} time slots.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Summary Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{data.rinkName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(parse(data.startDate, "yyyy-MM-dd", new Date()), "MMM d")} -{" "}
                    {format(parse(data.endDate, "yyyy-MM-dd", new Date()), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {data.dailyStartTime} - {data.dailyEndTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {data.maxStudents} student{data.maxStudents !== 1 ? "s" : ""} max
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {data.daysOfWeek.map((dayNum) => (
                  <Badge key={dayNum} variant="secondary">
                    {dayAbbrevs[dayNum]}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 p-3 bg-blue-50 rounded-lg text-sm">
                <div className="text-center">
                  <div className="font-semibold text-blue-900">{data.estimatedSlots}</div>
                  <div className="text-blue-700 text-xs">Total Slots</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-900">{data.slotDuration}min</div>
                  <div className="text-blue-700 text-xs">Per Slot</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-900">{weeklyHours.toFixed(1)}h</div>
                  <div className="text-blue-700 text-xs">Per Week</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Breaks */}
          {validBreaks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Scheduled Breaks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {validBreaks.map((breakItem, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>Break {index + 1}</span>
                      <span className="font-medium">
                        {breakItem.startTime} ({breakItem.duration} minutes)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {data.warnings && data.warnings.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-amber-700">
                  {data.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Conflicts */}
          {data.conflicts && data.conflicts.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  Time Conflicts Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-red-700">
                  {data.conflicts.map((conflict, index) => (
                    <div key={index} className="flex justify-between items-start gap-4">
                      <div>
                        <div className="font-medium">
                          {format(parse(conflict.date, "yyyy-MM-dd", new Date()), "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-red-600">{conflict.time}</div>
                      </div>
                      <div className="text-xs text-right">{conflict.reason}</div>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <p className="text-xs text-red-600">
                  ⚠️ These conflicts will prevent some slots from being created. Consider adjusting
                  your time range or removing conflicting slots first.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Schedule Pattern Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Weekly Schedule Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 text-xs">
                {dayAbbrevs.map((day, index) => (
                  <div
                    key={day}
                    className={`text-center p-2 rounded ${
                      data.daysOfWeek.includes(index)
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : "bg-gray-50 text-gray-400"
                    }`}
                  >
                    <div className="font-medium">{day}</div>
                    {data.daysOfWeek.includes(index) && (
                      <div className="mt-1 space-y-0.5">
                        <div className="text-[10px]">{data.dailyStartTime}</div>
                        <div className="text-[10px]">↓</div>
                        <div className="text-[10px]">{data.dailyEndTime}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? "Creating Slots..." : `Create ${data.estimatedSlots} Time Slots`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
