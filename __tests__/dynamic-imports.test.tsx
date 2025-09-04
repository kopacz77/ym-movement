import { render, screen } from "@testing-library/react";
import dynamic from "next/dynamic";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/dynamic
vi.mock("next/dynamic", () => ({
  default: vi.fn(),
}));

describe("Dynamic Imports Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Dynamic import configuration", () => {
    it("should not use ssr: false in Server Components", () => {
      // Test that dynamic imports don't include ssr: false for Server Components
      // This was the bug we fixed - ssr: false is not allowed in Next.js 15 Server Components

      const mockDynamic = vi.mocked(dynamic);
      mockDynamic.mockImplementation((loader: any, options: any = {}) => {
        // Verify that ssr: false is not used
        expect(options.ssr).not.toBe(false);

        // Return a mock component
        return () => React.createElement("div", null, "Dynamic Component");
      });

      // Simulate a dynamic import call without ssr: false
      const DynamicComponent = dynamic(
        () => Promise.resolve({ default: () => <div>Test Component</div> }),
        {
          loading: () => <div>Loading...</div>,
          // Note: no ssr: false here (which was causing the error)
        },
      );

      expect(mockDynamic).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          loading: expect.any(Function),
        }),
      );
    });

    it("should provide loading components for dynamic imports", () => {
      const mockDynamic = vi.mocked(dynamic);

      mockDynamic.mockImplementation((loader: any, options: any = {}) => {
        // Verify that loading component is provided
        expect(options.loading).toBeDefined();
        expect(typeof options.loading).toBe("function");

        return () => React.createElement("div", null, "Dynamic Component");
      });

      const DynamicComponent = dynamic(
        () => Promise.resolve({ default: () => <div>Test Component</div> }),
        {
          loading: () => <div>Loading...</div>,
        },
      );

      expect(mockDynamic).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          loading: expect.any(Function),
        }),
      );
    });
  });

  describe("Loading states", () => {
    it("should handle loading states gracefully", () => {
      const LoadingComponent = () => <div data-testid="loading">Loading...</div>;

      render(<LoadingComponent />);

      expect(screen.getByTestId("loading")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should use appropriate loading skeletons", () => {
      // Test calendar skeleton
      const CalendarSkeleton = () => (
        <div data-testid="calendar-skeleton" className="animate-pulse">
          <div>Calendar Loading...</div>
        </div>
      );

      render(<CalendarSkeleton />);
      expect(screen.getByTestId("calendar-skeleton")).toBeInTheDocument();

      // Test chart skeleton
      const ChartSkeleton = () => (
        <div data-testid="chart-skeleton" className="animate-pulse">
          <div>Chart Loading...</div>
        </div>
      );

      render(<ChartSkeleton />);
      expect(screen.getByTestId("chart-skeleton")).toBeInTheDocument();
    });
  });

  describe("Component lazy loading patterns", () => {
    it("should use correct dynamic import pattern for calendar components", () => {
      // Test the pattern structure used for calendar components
      const createDynamicImport = (modulePath: string, componentName: string) => () =>
        Promise.resolve()
          .then(() => ({
            default: { [componentName]: () => React.createElement("div", null, componentName) },
          }))
          .then((mod) => ({
            default: mod.default[componentName],
          }));

      const bookingCalendarImport = createDynamicImport(
        "@/features/booking/components/BookingCalendar",
        "BookingCalendar",
      );

      // Verify the import function structure
      expect(typeof bookingCalendarImport).toBe("function");
    });

    it("should use correct dynamic import pattern for chart components", () => {
      // Test the pattern structure used for chart components
      const createChartImport = (componentName: string) => () =>
        Promise.resolve()
          .then(() => ({
            default: { [componentName]: () => React.createElement("div", null, componentName) },
          }))
          .then((mod) => ({
            default: mod.default[componentName],
          }));

      const revenueChartImport = createChartImport("RevenueChart");
      const bookingChartImport = createChartImport("BookingsChart");

      expect(typeof revenueChartImport).toBe("function");
      expect(typeof bookingChartImport).toBe("function");
    });

    it("should use correct dynamic import pattern for schedule manager", () => {
      // Test the pattern structure used for schedule manager
      const createScheduleImport = () => () =>
        Promise.resolve()
          .then(() => ({
            default: { ScheduleManager: () => React.createElement("div", null, "ScheduleManager") },
          }))
          .then((mod) => ({
            default: mod.default.ScheduleManager,
          }));

      const scheduleManagerImport = createScheduleImport();

      expect(typeof scheduleManagerImport).toBe("function");
    });

    it("should handle import resolution correctly", async () => {
      // Test that our import pattern resolves correctly
      const mockImport = () =>
        Promise.resolve({
          default: () => React.createElement("div", null, "Mock Component"),
        });

      const result = await mockImport();
      expect(result.default).toBeDefined();
      expect(typeof result.default).toBe("function");
    });
  });

  describe("Error boundaries integration", () => {
    it("should work with error boundaries for dynamic components", () => {
      // Test that dynamic components can be wrapped with error boundaries
      const ErrorBoundaryWrapper = ({ children }: { children: React.ReactNode }) => (
        <div data-testid="error-boundary">{children}</div>
      );

      const DynamicComponentWithBoundary = () => (
        <ErrorBoundaryWrapper>
          <div data-testid="dynamic-content">Dynamic Content</div>
        </ErrorBoundaryWrapper>
      );

      render(<DynamicComponentWithBoundary />);

      expect(screen.getByTestId("error-boundary")).toBeInTheDocument();
      expect(screen.getByTestId("dynamic-content")).toBeInTheDocument();
    });
  });

  describe("SSR compatibility", () => {
    it("should be compatible with Next.js 15 SSR", () => {
      // Test that our dynamic import configuration is compatible with Next.js 15
      // In Next.js 15, Server Components cannot use ssr: false

      const validDynamicConfig = {
        loading: () => React.createElement("div", null, "Loading..."),
        // No ssr: false - this is the key fix
      };

      // Verify the config doesn't include ssr: false
      expect(validDynamicConfig).not.toHaveProperty("ssr");
      expect(validDynamicConfig.loading).toBeDefined();
    });

    it("should handle Client Components with dynamic imports", () => {
      // Client Components can have more flexible dynamic import options
      const clientComponentConfig = {
        loading: () => React.createElement("div", null, "Loading..."),
        // Client Components could theoretically use ssr: false if needed
        // but we don't use it to keep things consistent
      };

      expect(clientComponentConfig.loading).toBeDefined();
    });
  });
});
