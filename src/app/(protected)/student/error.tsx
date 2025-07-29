"use client";

import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StudentErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function StudentError({ error, reset }: StudentErrorProps) {
  useEffect(() => {
    console.error("Student route error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">Student Portal Error</CardTitle>
          <CardDescription className="text-base">
            Something went wrong while loading your student portal. Please try again or contact
            support if this continues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/student/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          {process.env.NODE_ENV === "development" && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Error Details (Development Only)
              </summary>
              <div className="mt-3 p-3 bg-red-50 rounded-md">
                <p className="text-sm text-red-800 font-medium mb-2">Error Message:</p>
                <p className="text-sm text-red-700 mb-3">{error.message}</p>
                {error.digest && (
                  <>
                    <p className="text-sm text-red-800 font-medium mb-2">Error Digest:</p>
                    <p className="text-sm text-red-700 mb-3 font-mono">{error.digest}</p>
                  </>
                )}
                <details>
                  <summary className="cursor-pointer text-sm text-red-800 hover:text-red-900">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </details>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
