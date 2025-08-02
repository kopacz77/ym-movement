"use client";

import * as React from "react";
import { CalendarIcon, PlusIcon, TrashIcon, PlaneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { DateRange } from "react-day-picker";

interface BlockedDateRange {
  id: string;
  title: string;
  description?: string;
  dateRange: DateRange;
  type: "travel" | "competition" | "other";
}

interface TravelDateBlockerProps {
  blockedDateRanges: BlockedDateRange[];
  onAddBlockedRange: (range: Omit<BlockedDateRange, "id">) => void;
  onRemoveBlockedRange: (id: string) => void;
  className?: string;
}

export function TravelDateBlocker({
  blockedDateRanges,
  onAddBlockedRange,
  onRemoveBlockedRange,
  className,
}: TravelDateBlockerProps) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<"travel" | "competition" | "other">("travel");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

  // Get all blocked dates for calendar display
  const blockedDates = React.useMemo(() => {
    const dates: Date[] = [];
    blockedDateRanges.forEach((range) => {
      if (range.dateRange.from && range.dateRange.to) {
        const start = new Date(range.dateRange.from);
        const end = new Date(range.dateRange.to);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(new Date(d));
        }
      }
    });
    return dates;
  }, [blockedDateRanges]);

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
        return <PlaneIcon className="h-3 w-3" />;
      case "competition":
        return <CalendarIcon className="h-3 w-3" />;
      default:
        return <CalendarIcon className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: BlockedDateRange["type"]) => {
    switch (type) {
      case "travel":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "competition":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PlaneIcon className="h-4 w-4" />
            Travel & Competition Dates
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Blocked Dates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Block Dates for Travel/Competition</DialogTitle>
                <DialogDescription>
                  Block date ranges when Yura is traveling or competing and cannot teach lessons.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Nationals Competition"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <select
                      id="type"
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="travel">Travel</option>
                      <option value="competition">Competition</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional details..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date Range *</Label>
                  <div className="flex justify-center">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      showOutsideDays={false}
                      className="rounded-md border shadow-sm bg-card"
                      disabled={{ before: new Date() }}
                      numberOfMonths={1}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!title.trim() || !dateRange?.from || !dateRange?.to}
                  >
                    Block Dates
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Calendar showing blocked dates */}
        <div className="flex justify-center">
          <Calendar
            mode="single"
            disabled={blockedDates}
            showOutsideDays={false}
            modifiers={{
              blocked: blockedDates,
            }}
            modifiersClassNames={{
              blocked: "bg-red-100 text-red-900 line-through opacity-75",
            }}
            className="bg-transparent"
            formatters={{
              formatWeekdayName: (date) => {
                return date.toLocaleString("en-US", { weekday: "short" });
              },
            }}
          />
        </div>

        {/* List of blocked date ranges */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Blocked Date Ranges</h4>
          {blockedDateRanges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blocked dates</p>
          ) : (
            <div className="space-y-2">
              {blockedDateRanges.map((range) => (
                <div
                  key={range.id}
                  className="flex items-center justify-between p-2 rounded-md border bg-card"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`${getTypeColor(range.type)} border`}>
                      {getTypeIcon(range.type)}
                      {range.type}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{range.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {range.dateRange.from?.toLocaleDateString()} -{" "}
                        {range.dateRange.to?.toLocaleDateString()}
                      </p>
                      {range.description && (
                        <p className="text-xs text-muted-foreground mt-1">{range.description}</p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onRemoveBlockedRange(range.id)}>
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
