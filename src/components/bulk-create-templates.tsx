/**
 * Bulk Create Templates Component
 *
 * Quick template presets for common scheduling patterns
 *
 * @version 1.0.0
 */

"use client";

import { addDays, format } from "date-fns";
import { BookOpen, Calendar, Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: "common" | "seasonal" | "custom";
  preset: {
    dailyStartTime: string;
    dailyEndTime: string;
    slotDuration: number;
    daysOfWeek: number[];
    maxStudents: number;
    breaks: Array<{ startTime: string; duration: number }>;
  };
  dateRange?: {
    startOffset: number; // days from today
    duration: number; // days
  };
}

const SCHEDULE_TEMPLATES: ScheduleTemplate[] = [
  {
    id: "weekday_morning",
    name: "Weekday Mornings",
    description: "Monday-Friday morning lessons (6AM-12PM)",
    icon: <Clock className="h-4 w-4" />,
    category: "common",
    preset: {
      dailyStartTime: "06:00",
      dailyEndTime: "12:00",
      slotDuration: 60,
      daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      maxStudents: 1,
      breaks: [{ startTime: "09:00", duration: 15 }],
    },
    dateRange: {
      startOffset: 1, // tomorrow
      duration: 14, // 2 weeks
    },
  },
  {
    id: "weekend_intensive",
    name: "Weekend Intensive",
    description: "Saturday-Sunday full day sessions",
    icon: <BookOpen className="h-4 w-4" />,
    category: "common",
    preset: {
      dailyStartTime: "08:00",
      dailyEndTime: "17:00",
      slotDuration: 90,
      daysOfWeek: [0, 6], // Sun, Sat
      maxStudents: 2,
      breaks: [
        { startTime: "10:30", duration: 15 },
        { startTime: "12:00", duration: 60 },
        { startTime: "15:00", duration: 15 },
      ],
    },
    dateRange: {
      startOffset: 0,
      duration: 28, // 4 weeks
    },
  },
  {
    id: "evening_practice",
    name: "Evening Practice",
    description: "After-school evening sessions (4PM-8PM)",
    icon: <Calendar className="h-4 w-4" />,
    category: "common",
    preset: {
      dailyStartTime: "16:00",
      dailyEndTime: "20:00",
      slotDuration: 45,
      daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      maxStudents: 3,
      breaks: [{ startTime: "18:00", duration: 15 }],
    },
    dateRange: {
      startOffset: 1,
      duration: 21, // 3 weeks
    },
  },
  {
    id: "competition_prep",
    name: "Competition Prep",
    description: "Intensive daily training schedule",
    icon: <Zap className="h-4 w-4" />,
    category: "seasonal",
    preset: {
      dailyStartTime: "05:00",
      dailyEndTime: "10:00",
      slotDuration: 75,
      daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat
      maxStudents: 1,
      breaks: [{ startTime: "07:30", duration: 30 }],
    },
    dateRange: {
      startOffset: 7, // next week
      duration: 14, // 2 weeks
    },
  },
  {
    id: "beginner_group",
    name: "Beginner Groups",
    description: "Group lessons for new skaters",
    icon: <BookOpen className="h-4 w-4" />,
    category: "common",
    preset: {
      dailyStartTime: "10:00",
      dailyEndTime: "16:00",
      slotDuration: 90,
      daysOfWeek: [0, 3, 6], // Sun, Wed, Sat
      maxStudents: 4,
      breaks: [{ startTime: "13:00", duration: 30 }],
    },
    dateRange: {
      startOffset: 1,
      duration: 30, // 1 month
    },
  },
  {
    id: "holiday_camp",
    name: "Holiday Camp",
    description: "All-day holiday programs",
    icon: <Calendar className="h-4 w-4" />,
    category: "seasonal",
    preset: {
      dailyStartTime: "09:00",
      dailyEndTime: "15:00",
      slotDuration: 120,
      daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      maxStudents: 6,
      breaks: [
        { startTime: "10:30", duration: 15 },
        { startTime: "12:00", duration: 60 },
        { startTime: "14:00", duration: 15 },
      ],
    },
    dateRange: {
      startOffset: 14, // 2 weeks out
      duration: 5, // 1 week
    },
  },
];

interface BulkCreateTemplatesProps {
  onSelectTemplate: (template: ScheduleTemplate) => void;
}

export function BulkCreateTemplates({ onSelectTemplate }: BulkCreateTemplatesProps) {
  const handleTemplateSelect = (template: ScheduleTemplate) => {
    // Auto-calculate dates if template has date range
    if (template.dateRange) {
      const startDate = addDays(new Date(), template.dateRange.startOffset);
      const endDate = addDays(startDate, template.dateRange.duration - 1);

      const templateWithDates = {
        ...template,
        preset: {
          ...template.preset,
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
        },
      };

      onSelectTemplate(templateWithDates);
    } else {
      onSelectTemplate(template);
    }
  };

  const templatesByCategory = SCHEDULE_TEMPLATES.reduce(
    (acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    },
    {} as Record<string, ScheduleTemplate[]>,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="h-4 w-4" />
          Quick Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Templates</DialogTitle>
          <DialogDescription>
            Choose from pre-configured scheduling patterns to quickly set up your time slots.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {Object.entries(templatesByCategory).map(([category, templates]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3 capitalize">
                {category === "common"
                  ? "Common Patterns"
                  : category === "seasonal"
                    ? "Seasonal Programs"
                    : "Custom Templates"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={() => handleTemplateSelect(template)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateCardProps {
  template: ScheduleTemplate;
  onSelect: () => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const _selectedDays = template.preset.daysOfWeek.map((d) => dayLabels[d]).join(", ");

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {template.icon}
          {template.name}
        </CardTitle>
        <CardDescription className="text-xs">{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time:</span>
            <span>
              {template.preset.dailyStartTime} - {template.preset.dailyEndTime}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration:</span>
            <span>{template.preset.slotDuration}min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Capacity:</span>
            <span>
              {template.preset.maxStudents} student{template.preset.maxStudents !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {template.preset.daysOfWeek.map((day) => (
              <Badge key={day} variant="secondary" className="text-xs px-1.5 py-0.5">
                {dayLabels[day]}
              </Badge>
            ))}
          </div>

          {template.preset.breaks.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {template.preset.breaks.length} break{template.preset.breaks.length !== 1 ? "s" : ""}{" "}
              included
            </div>
          )}
        </div>

        {template.dateRange && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            Auto-sets {template.dateRange.duration} days starting{" "}
            {template.dateRange.startOffset === 0
              ? "today"
              : template.dateRange.startOffset === 1
                ? "tomorrow"
                : `in ${template.dateRange.startOffset} days`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
