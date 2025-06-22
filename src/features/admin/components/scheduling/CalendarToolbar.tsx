import { Button } from "@/components/ui/button";
import { addDays, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";

interface ToolbarProps {
  date: Date;
  view: string;
  onNavigate: (action: "PREV" | "NEXT" | "TODAY" | "DATE") => void;
  onView: (view: string) => void;
  views: string[];
}

export const CalendarToolbar: React.FC<ToolbarProps> = ({
  date,
  view,
  onNavigate,
  onView,
  views,
}) => {
  const getViewTitle = () => {
    switch (view) {
      case "month": {
        return format(date, "MMMM yyyy");
      }
      case "week":
      case "work_week": {
        const start = addDays(date, -date.getDay());
        const end = addDays(start, 6);
        return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
      }
      case "day": {
        return format(date, "EEEE, MMMM d, yyyy");
      }
      case "agenda": {
        return format(date, "MMMM yyyy");
      }
      default: {
        return "";
      }
    }
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate("TODAY")}>
          Today
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onNavigate("PREV")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onNavigate("NEXT")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold ml-2">{getViewTitle()}</h2>
      </div>

      <div className="flex gap-1">
        {views.map((viewOption) => (
          <Button
            key={viewOption}
            variant={viewOption === view ? "default" : "outline"}
            size="sm"
            onClick={() => onView(viewOption)}
          >
            {viewOption.charAt(0).toUpperCase() + viewOption.slice(1)}
          </Button>
        ))}
      </div>
    </div>
  );
};
