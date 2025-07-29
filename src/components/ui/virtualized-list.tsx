/**
 * Simple Virtualized List Component
 *
 * Basic virtualization for large lists
 */

"use client";

import type React from "react";
import { memo } from "react";

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: (index: number) => number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

function VirtualizedListComponent<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className = "",
}: VirtualizedListProps<T>) {
  // Simple implementation - for complex virtualization, use @tanstack/react-virtual
  return (
    <div className={`overflow-auto ${className}`} style={{ height }}>
      {items.map((item, index) => (
        <div key={index} style={{ height: itemHeight(index) }}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

export const VirtualizedList = memo(VirtualizedListComponent) as typeof VirtualizedListComponent;
