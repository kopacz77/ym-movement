"use client";

import { CalendarIcon, Plane, PlusIcon, TrashIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BlockedDateRange {
  id: string;
  title: string;
  description?: string;
  dateRange: DateRange;
  type: "travel" | "competition" | "other";
}

interface TravelDateManagerProps {
  blockedDateRanges: BlockedDateRange[];
  onAddBlockedRange: (range: Omit<BlockedDateRange, "id">) => void;
  onRemoveBlockedRange: (id: string) => void;
  className?: string;
}

export function TravelDateManager({
  blockedDateRanges,
  onAddBlockedRange,
  onRemoveBlockedRange,
  className,
}: TravelDateManagerProps) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<"travel" | "competition" | "other">("travel");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

  // Generate unique IDs for form elements
  const titleId = React.useId();
  const typeId = React.useId();
  const descriptionId = React.useId();

  const handleSubmit = () => {
    if (!title.trim() || !dateRange?.from || !dateRange?.to) {
      return;
    }

    onAddBlockedRange({
      title: title.trim(),
      description: description.trim() || undefined,
      dateRange,
      type,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setType("travel");
    setDateRange(undefined);
    setOpen(false);
  };

  const getTypeIcon = (type: BlockedDateRange["type"]) => {
    switch (type) {
      case "travel":
        return <Plane className="h-3 w-3" />;
      case "competition":
        return <CalendarIcon className="h-3 w-3" />;
      default:
        return <CalendarIcon className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: BlockedDateRange["type"]) => {
    switch (type) {
      case "travel":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "competition":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className={`space-y-4 p-2 ${className}`}>
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-sm">Travel & Competition Dates</h3>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs">
              <PlusIcon className="h-3 w-3 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-white shadow-xl border border-gray-200">
            <DialogHeader className="pb-6 border-b border-gray-100">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Plane className="h-5 w-5 text-blue-600" />
                </div>
                Block Dates for Travel/Competition
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">
                Block date ranges when Yura is traveling or competing and cannot teach lessons.
                Students won't be able to book during these periods.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor={titleId} className="text-sm font-medium text-gray-700">
                    Title *
                  </Label>
                  <Input
                    id={titleId}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Nationals Competition"
                    className="h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor={typeId} className="text-sm font-medium text-gray-700">
                    Type
                  </Label>
                  <select
                    id={typeId}
                    value={type}
                    onChange={(e) => setType(e.target.value as "travel" | "competition" | "other")}
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-background focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="travel">Travel</option>
                    <option value="competition">Competition</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor={descriptionId} className="text-sm font-medium text-gray-700">
                  Description (optional)
                </Label>
                <Input
                  id={descriptionId}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details..."
                  className="h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">Date Range *</Label>
                <div className="flex flex-col items-center">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    showOutsideDays={false}
                    className="rounded-lg border border-gray-200 shadow-sm bg-white p-4"
                    disabled={{ before: new Date() }}
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-medium text-gray-900",
                      nav: "space-x-1 flex items-center",
                      nav_button:
                        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 w-7",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
                      day: "inline-flex items-center justify-center rounded-md text-sm font-normal ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-selected:opacity-100 h-8 w-8",
                      day_selected:
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside:
                        "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle:
                        "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                    }}
                  />
                  {dateRange?.from && dateRange?.to && (
                    <div className="mt-3 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-sm font-medium text-blue-900">Selected:</span>
                        <span className="text-sm text-blue-700">
                          {dateRange.from.toLocaleDateString()} -{" "}
                          {dateRange.to.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="px-6 py-2 border-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!title.trim() || !dateRange?.from || !dateRange?.to}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!title.trim() || !dateRange?.from || !dateRange?.to ? (
                    "Block Dates"
                  ) : (
                    <span className="flex items-center gap-2">
                      <Plane className="h-4 w-4" />
                      Block Dates
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Compact list of blocked date ranges */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {blockedDateRanges.length === 0 ? (
          <div className="text-center py-6">
            <Plane className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No blocked dates</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add travel or competition dates to prevent bookings
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {blockedDateRanges.map((range) => (
              <div
                key={range.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Badge
                    variant="secondary"
                    className={`${getTypeColor(range.type)} border shrink-0`}
                  >
                    {getTypeIcon(range.type)}
                    <span className="ml-1 text-xs capitalize">{range.type}</span>
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{range.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {range.dateRange.from?.toLocaleDateString()} -{" "}
                      {range.dateRange.to?.toLocaleDateString()}
                    </p>
                    {range.description && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{range.description}</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveBlockedRange(range.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
