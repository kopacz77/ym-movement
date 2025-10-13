// src/components/ui/data-state.tsx

import { AlertTriangle } from "lucide-react";
import type React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DelightfulLoading, PersonalizedSkeleton } from "@/components/ui/delightful-loading";
import { EncouragingEmptyState } from "@/components/ui/encouraging-empty-state";

interface DataStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  emptyType?: "lessons" | "students" | "schedule" | "general" | "payments" | "reports";
  skeletonRows?: number;
  skeletonHeight?: string;
  loadingVariant?: "default" | "warm" | "celebration";
  onEmptyAction?: () => void;
  children: React.ReactNode;
}

export function DataState({
  isLoading,
  isError,
  isEmpty = false,
  errorMessage = "An error occurred while loading data.",
  emptyMessage,
  emptyType = "lessons",
  skeletonRows = 3,
  loadingVariant = "warm",
  onEmptyAction,
  children,
}: DataStateProps) {
  if (isLoading) {
    return (
      <div>
        <DelightfulLoading />
        <PersonalizedSkeleton lines={skeletonRows} showAvatar={true} className="mt-6" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Oops! Something went wrong 💔</AlertTitle>
        <AlertDescription>
          {errorMessage} Don't worry though - these things happen! Try refreshing the page, and if
          it keeps happening, just let us know. We're here to help! ✨
        </AlertDescription>
      </Alert>
    );
  }

  if (isEmpty) {
    return <EncouragingEmptyState type={emptyType} onAction={onEmptyAction} />;
  }

  return <>{children}</>;
}
