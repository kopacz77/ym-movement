// src/components/ui/draggable.tsx
"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import type React from "react";
import type { ReactNode } from "react";

interface DraggableProps {
  children: ReactNode;
  className?: string;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  dragData?: unknown;
}

export const Draggable = ({
  children,
  className,
  isDraggable = true,
  onDragStart,
  onDragEnd,
  dragData,
}: DraggableProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;

    setIsDragging(true);

    // Set the drag image and data
    if (dragData) {
      e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    }

    // Allow custom drag start handler
    if (onDragStart) {
      onDragStart(e);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);

    // Allow custom drag end handler
    if (onDragEnd) {
      onDragEnd(e);
    }
  };

  return (
    <div
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
        !isDraggable && "cursor-default",
        className,
      )}
    >
      {children}
    </div>
  );
};
