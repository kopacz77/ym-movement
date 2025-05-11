// src/components/ui/data-state.tsx

import { Spinner } from "@/components/ui/spinner";
import React from "react";

interface DataStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  children: React.ReactNode;
}

export function DataState({
  isLoading,
  isError,
  isEmpty = false,
  errorMessage = "An error occurred while loading data.",
  emptyMessage = "No data available.",
  children,
}: DataStateProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner size="xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-48 text-destructive">
        <div className="text-center">
          <p className="text-lg font-medium">{errorMessage}</p>
          <p className="text-sm text-muted-foreground">Please try again later.</p>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex justify-center items-center h-48 text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
