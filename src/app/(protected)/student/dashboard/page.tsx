"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonSummary } from "@/features/student/components/dashboard/LessonSummary";
import { UpcomingLessons } from "@/features/student/components/dashboard/UpcomingLessons";
import { useCurrentUser } from "@/hooks/useCurrentUser";

class DebugErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dashboard Error Boundary caught an error:", error);
    console.error("Error Info:", errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="p-4 border border-red-500 rounded bg-red-50">
          <h2 className="text-red-800 font-bold">Dashboard Error:</h2>
          <p className="text-red-700 mt-2">{this.state.error.message}</p>
          <pre className="text-xs text-red-600 mt-2 overflow-auto">{this.state.error.stack}</pre>
          <Button onClick={() => this.setState({ hasError: false, error: null })} className="mt-4">
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function StudentDashboardPage() {
  const user = useCurrentUser();

  return (
    <DebugErrorBoundary>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          {user.isApproved ? (
            <Link href="/student/book">
              <Button>Book a Lesson</Button>
            </Link>
          ) : (
            <Button disabled variant="outline">
              Pending Approval
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8">
            <DebugErrorBoundary>
              <UpcomingLessons />
            </DebugErrorBoundary>
          </div>
          <div className="md:col-span-4">
            <DebugErrorBoundary>
              <LessonSummary />
            </DebugErrorBoundary>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p>
                We accept payments via Venmo, Zelle, or Cash. Please make payments within 24 hours
                of booking your lesson to avoid automatic cancellation.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium">Venmo</h3>
                  <p className="text-sm mt-1">@yura-min</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium">Zelle</h3>
                  <p className="text-sm mt-1">+1 (714) 743-7071</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium">Cash</h3>
                  <p className="text-sm mt-1">Bring exact amount to lesson</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DebugErrorBoundary>
  );
}
