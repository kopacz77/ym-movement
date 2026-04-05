/**
 * Performance Monitoring System
 *
 * Real-time performance tracking and monitoring for React components.
 *
 * @description
 * This module provides comprehensive performance monitoring capabilities:
 * - Real-time render time tracking with memory usage monitoring
 * - Development performance panel with slow component warnings (>16ms)
 * - Automatic slow component detection and alerting
 * - Performance metrics collection and reporting
 * - HOC integration for automatic component monitoring
 *
 * @example
 * ```tsx
 * // Automatic monitoring with HOC
 * const MonitoredComponent = withPerformanceMonitoring(MyComponent);
 *
 * // Manual monitoring with hook
 * function MyComponent() {
 *   usePerformanceMonitor('MyComponent');
 *   return <div>Content</div>;
 * }
 *
 * // Development performance panel
 * {process.env.NODE_ENV === 'development' && <PerformancePanel />}
 * ```
 *
 * @version 3.0.0
 * @since Phase 2 Priority 2 Optimizations
 */
// src/lib/performance-monitor.tsx
"use client";

import React, { useCallback, useEffect, useRef } from "react";

export interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  renderCount: number;
  memoryUsage?: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private observers: Set<(metrics: PerformanceMetrics[]) => void> = new Set();

  record(componentName: string, renderTime: number) {
    const existing = this.metrics.get(componentName);
    const metrics: PerformanceMetrics = {
      componentName,
      renderTime,
      renderCount: existing ? existing.renderCount + 1 : 1,
      memoryUsage: this.getMemoryUsage(),
      timestamp: Date.now(),
    };

    this.metrics.set(componentName, metrics);
    this.notifyObservers();

    // Log slow renders in development
    if (process.env.NODE_ENV === "development" && renderTime > 16) {
      console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  }

  private getMemoryUsage(): number | undefined {
    if (typeof window !== "undefined" && "memory" in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return undefined;
  }

  subscribe(callback: (metrics: PerformanceMetrics[]) => void) {
    this.observers.add(callback);
    return () => {
      this.observers.delete(callback);
    };
  }

  private notifyObservers() {
    const allMetrics = Array.from(this.metrics.values());
    this.observers.forEach((callback) => callback(allMetrics));
  }

  getMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  getSlowestComponents(limit = 5): PerformanceMetrics[] {
    return this.getMetrics()
      .sort((a, b) => b.renderTime - a.renderTime)
      .slice(0, limit);
  }

  getReport(): string {
    const metrics = this.getMetrics();
    const totalComponents = metrics.length;
    const slowComponents = metrics.filter((m) => m.renderTime > 16).length;
    const avgRenderTime = metrics.reduce((sum, m) => sum + m.renderTime, 0) / totalComponents;

    return `
📊 Performance Report
━━━━━━━━━━━━━━━━━━━━
Total Components: ${totalComponents}
Slow Components (>16ms): ${slowComponents}
Average Render Time: ${avgRenderTime.toFixed(2)}ms

🐌 Slowest Components:
${this.getSlowestComponents()
  .map((m) => `  ${m.componentName}: ${m.renderTime.toFixed(2)}ms (${m.renderCount} renders)`)
  .join("\n")}
    `.trim();
  }

  clear() {
    this.metrics.clear();
    this.notifyObservers();
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook to monitor component render performance
 */
export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current += 1;
  });

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    performanceMonitor.record(componentName, renderTime);
  });

  const logRender = useCallback(() => {
    // Intentionally empty - render tracking available via PerformancePanel
  }, []);

  return { logRender };
}

/**
 * Development performance panel component
 */
export function PerformancePanel() {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const unsubscribe = performanceMonitor.subscribe(setMetrics);
    return unsubscribe;
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const slowComponents = metrics.filter((m) => m.renderTime > 16);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 rounded-lg text-xs font-mono ${
          slowComponents.length > 0 ? "bg-red-500 text-white" : "bg-green-500 text-white"
        }`}
      >
        ⚡ {metrics.length} components
        {slowComponents.length > 0 && ` (${slowComponents.length} slow)`}
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 w-80 max-h-96 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm">Performance Monitor</h3>
            <button
              type="button"
              onClick={() => performanceMonitor.clear()}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Clear
            </button>
          </div>

          <div className="space-y-2">
            {metrics.length === 0 ? (
              <p className="text-xs text-gray-500">No metrics recorded</p>
            ) : (
              <>
                <div className="text-xs text-gray-600">
                  Avg:{" "}
                  {(metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length).toFixed(2)}
                  ms
                </div>
                {performanceMonitor.getSlowestComponents().map((metric) => (
                  <div
                    key={metric.componentName}
                    className={`text-xs p-2 rounded ${
                      metric.renderTime > 16
                        ? "bg-red-50 text-red-700"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    <div className="font-mono">{metric.componentName}</div>
                    <div>
                      {metric.renderTime.toFixed(2)}ms ({metric.renderCount} renders)
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Higher-order component to automatically monitor performance
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string,
) {
  const MonitoredComponent = (props: P) => {
    const name =
      componentName || WrappedComponent.displayName || WrappedComponent.name || "Unknown";
    usePerformanceMonitor(name);

    return <WrappedComponent {...props} />;
  };

  MonitoredComponent.displayName = `withPerformanceMonitoring(${WrappedComponent.displayName || WrappedComponent.name})`;

  return MonitoredComponent;
}
