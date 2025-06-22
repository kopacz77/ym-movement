/**
 * Virtualized Table and List Components
 * 
 * High-performance virtualization for rendering large datasets efficiently.
 * 
 * @description
 * These components use React Virtual to render only visible items, dramatically
 * improving performance for large datasets:
 * - VirtualizedTable: For structured tabular data (1000+ rows)
 * - VirtualizedList: For simple list rendering with custom item components
 * - Memory-efficient rendering (~20 DOM nodes instead of 1000+)
 * - Smooth scrolling performance regardless of dataset size
 * - 95% reduction in DOM nodes for large lists
 * 
 * @example
 * ```tsx
 * // Virtualized table for large datasets
 * <VirtualizedTable
 *   data={students}
 *   columns={studentColumns}
 *   height={500}
 *   itemHeight={52}
 *   onRowClick={handleStudentClick}
 * />
 * 
 * // Simple virtualized list
 * <VirtualizedList
 *   items={notifications}
 *   height={400}
 *   itemHeight={60}
 *   renderItem={(notification, index) => (
 *     <NotificationCard notification={notification} />
 *   )}
 * />
 * ```
 * 
 * @version 3.0.0
 * @since Phase 2 Priority 2 Optimizations
 */
// src/components/ui/virtualized-table.tsx
"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import React, { useRef, useMemo, memo } from "react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "./table";

interface VirtualizedTableProps<T> {
  data: T[];
  columns: {
    key: string;
    header: string;
    width?: number;
    minWidth?: number;
    render: (item: T, index: number) => React.ReactNode;
  }[];
  height?: number;
  itemHeight?: number;
  overscan?: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
}

function VirtualizedTableComponent<T>({
  data,
  columns,
  height = 400,
  itemHeight = 52,
  overscan = 5,
  className,
  onRowClick,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  });

  const items = virtualizer.getVirtualItems();

  const totalHeight = useMemo(
    () => virtualizer.getTotalSize(),
    [virtualizer]
  );

  return (
    <div className={className}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                  }}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height }}
        >
          <div style={{ height: totalHeight, position: "relative" }}>
            <TableBody>
              {items.map((virtualItem) => {
                const item = data[virtualItem.index];
                return (
                  <TableRow
                    key={virtualItem.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => onRowClick?.(item, virtualItem.index)}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="border-b px-4 py-2"
                        style={{
                          width: column.width,
                          minWidth: column.minWidth,
                        }}
                      >
                        {column.render(item, virtualItem.index)}
                      </td>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </div>
        </div>
      </div>
    </div>
  );
}

export const VirtualizedTable = memo(VirtualizedTableComponent) as <T>(
  props: VirtualizedTableProps<T>
) => React.ReactElement;

/**
 * Hook for creating memoized table columns
 */
export function useTableColumns<T>(
  columnDefinitions: VirtualizedTableProps<T>["columns"]
) {
  return useMemo(() => columnDefinitions, [columnDefinitions]);
}

/**
 * Virtualized List Component for simple lists
 */
interface VirtualizedListProps<T> {
  items: T[];
  height?: number;
  itemHeight?: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

function VirtualizedListComponent<T>({
  items,
  height = 400,
  itemHeight = 60,
  overscan = 5,
  renderItem,
  className,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export const VirtualizedList = memo(VirtualizedListComponent) as <T>(
  props: VirtualizedListProps<T>
) => React.ReactElement;