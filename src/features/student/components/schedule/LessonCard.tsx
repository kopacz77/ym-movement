// src/features/student/components/schedule/LessonCard.tsx
"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, DollarSign } from "lucide-react";
import type { LessonWithDetails } from "../../types";
import { LessonStatus, PaymentStatus } from "@prisma/client";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LessonCardProps {
  lesson: LessonWithDetails;
  showActions?: boolean;
}

export const LessonCard = ({ lesson, showActions = true }: LessonCardProps) => {
  // Create Date objects while preserving the original time values
  // This ensures we use the times exactly as they are stored in the database
  const parseDate = (dateString: string | Date) => {
    if (dateString instanceof Date) { return dateString; }
    
    // Parse ISO date string components
    const parts = dateString.split(/[T:.-]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS
    const day = parseInt(parts[2], 10);
    const hour = parts.length > 3 ? parseInt(parts[3], 10) : 0;
    const minute = parts.length > 4 ? parseInt(parts[4], 10) : 0;
    
    // Create date with specific components, avoiding timezone conversion
    const date = new Date();
    date.setFullYear(year, month, day);
    date.setHours(hour, minute, 0, 0);
    return date;
  };
  
  const startTime = parseDate(lesson.startTime);
  const endTime = parseDate(lesson.endTime);

  const getStatusBadge = () => {
    switch (lesson.status) {
      case LessonStatus.SCHEDULED:
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case LessonStatus.COMPLETED:
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case LessonStatus.CANCELLED:
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge>{lesson.status}</Badge>;
    }
  };

  const getPaymentBadge = () => {
    if (!lesson.payment) { return null; }

    switch (lesson.payment.status as PaymentStatus) {
      case PaymentStatus.PENDING:
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Payment Pending
          </Badge>
        );
      case PaymentStatus.COMPLETED:
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Paid
          </Badge>
        );
      case PaymentStatus.FAILED:
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Payment Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{lesson.payment.status}</Badge>;
    }
  };

  return (
    <Card
      className={cn("overflow-hidden", lesson.status === LessonStatus.CANCELLED && "opacity-75")}
    >
      <div
        className={cn(
          "h-2",
          lesson.status === LessonStatus.SCHEDULED && "bg-blue-500",
          lesson.status === LessonStatus.COMPLETED && "bg-green-500",
          lesson.status === LessonStatus.CANCELLED && "bg-red-500",
        )}
      />
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="font-medium">{lesson.type.replace("_", " ")} Lesson</h3>
          <div className="flex flex-col gap-1 items-end">
            {getStatusBadge()}
            {getPaymentBadge()}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{startTime.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {startTime.toLocaleTimeString('en-US', { 
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })} - {endTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{lesson.rink.name}</span>
          </div>

          {lesson.payment && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>
                ${lesson.payment.amount.toFixed(2)} ({lesson.payment.method})
              </span>
            </div>
          )}
        </div>

        {showActions && (
          <div className="mt-4 flex justify-end">
            <Link href={`/student/schedule/${lesson.id}`}>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};