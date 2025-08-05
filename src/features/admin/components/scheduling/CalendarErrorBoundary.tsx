"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface CalendarErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

export class CalendarErrorBoundary extends React.Component<
  CalendarErrorBoundaryProps,
  CalendarErrorBoundaryState
> {
  constructor(props: CalendarErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): CalendarErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for debugging
    console.error("Calendar Error Boundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI or use provided fallback
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      // Default fallback UI
      return (
        <Card className="w-full max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Calendar Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The calendar encountered an error and couldn't be displayed. This is usually a
              temporary issue.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="bg-muted p-4 rounded-md">
                <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
                <pre className="text-xs text-red-600 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleRetry} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry Calendar
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useCalendarErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((errorEvent: Error | ErrorEvent) => {
    const error = errorEvent instanceof Error ? errorEvent : new Error(errorEvent.message);
    setError(error);
    console.error("Calendar error handled:", error);
  }, []);

  React.useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      // Only handle calendar-related errors
      if (event.filename?.includes("Calendar") || event.message?.includes("calendar")) {
        handleError(event);
      }
    };

    window.addEventListener("error", handleGlobalError);
    return () => window.removeEventListener("error", handleGlobalError);
  }, [handleError]);

  return { error, clearError, handleError };
}
