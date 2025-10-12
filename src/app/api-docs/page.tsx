"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  const [isDevelopment, setIsDevelopment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we're in development mode
    const checkEnvironment = async () => {
      const isDev = process.env.NODE_ENV === "development";
      setIsDevelopment(isDev);
      setIsLoading(false);
    };

    checkEnvironment();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isDevelopment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">404</h1>
          <p className="mt-2 text-gray-600">Page not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
              <p className="mt-2 text-gray-600">Complete API reference for YM Movement Scheduler</p>
            </div>
            <div className="rounded-lg bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800">
              🔧 Development Only
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <SwaggerUI url="/api/openapi" />
      </div>
    </div>
  );
}
