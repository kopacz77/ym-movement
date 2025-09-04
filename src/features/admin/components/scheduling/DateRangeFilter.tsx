"use client";

import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangeFilterProps {
  dateFrom?: Date;
  dateTo?: Date;
  onDateFromChange: (date: Date | undefined) => void;
  onDateToChange: (date: Date | undefined) => void;
  className?: string;
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  className,
}: DateRangeFilterProps) {
  const [openFrom, setOpenFrom] = React.useState(false);
  const [openTo, setOpenTo] = React.useState(false);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          Filter by Date Range
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-3">
            <Label htmlFor="date-from" className="px-1">
              From Date
            </Label>
            <Popover open={openFrom} onOpenChange={setOpenFrom}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="date-from"
                  className="w-full justify-between font-normal"
                >
                  {dateFrom
                    ? dateFrom.toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "Select start date"}
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  captionLayout="dropdown"
                  onSelect={(date) => {
                    onDateFromChange(date);
                    setOpenFrom(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-3">
            <Label htmlFor="date-to" className="px-1">
              To Date
            </Label>
            <Popover open={openTo} onOpenChange={setOpenTo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="date-to"
                  className="w-full justify-between font-normal"
                >
                  {dateTo
                    ? dateTo.toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "Select end date"}
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  captionLayout="dropdown"
                  onSelect={(date) => {
                    onDateToChange(date);
                    setOpenTo(false);
                  }}
                  disabled={dateFrom ? { before: dateFrom } : undefined}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Quick preset buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const today = new Date();
              const nextWeek = new Date(today);
              nextWeek.setDate(today.getDate() + 7);
              onDateFromChange(today);
              onDateToChange(nextWeek);
            }}
          >
            Next 7 days
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const today = new Date();
              const nextMonth = new Date(today);
              nextMonth.setMonth(today.getMonth() + 1);
              onDateFromChange(today);
              onDateToChange(nextMonth);
            }}
          >
            Next 30 days
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onDateFromChange(undefined);
              onDateToChange(undefined);
            }}
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
