// src/components/ApprovalGuard.tsx
"use client";

import { Clock, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface ApprovalGuardProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export function ApprovalGuard({
  children,
  fallbackTitle = "Account Approval Required",
  fallbackMessage = "Your account is currently pending approval by our administrators.",
}: ApprovalGuardProps) {
  const { isApproved, isActive, isStudent } = useCurrentUser();

  // Show loading state while checking approval/active status
  if (isStudent && (isApproved === null || isActive === null)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0891b2]" />
          <p className="text-muted-foreground">Checking account status...</p>
        </div>
      </div>
    );
  }

  // If user is not a student, or is both approved AND active, show the protected content
  if (!isStudent || (isApproved === true && isActive === true)) {
    return <>{children}</>;
  }

  // Show deactivated message for inactive students
  if (isActive === false) {
    return (
      <div className="flex justify-center items-center min-h-[400px] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">Account Deactivated</CardTitle>
            <CardDescription>
              Your account has been deactivated by an administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">What does this mean?</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Your account access has been temporarily suspended</li>
                <li>• Your lesson history and data remain preserved</li>
                <li>• You cannot book new lessons at this time</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Need to reactivate?</h4>
              <p className="text-sm text-foreground">
                Contact us at{" "}
                <a href="mailto:info@ym-movement.com" className="underline hover:no-underline">
                  info@ym-movement.com
                </a>{" "}
                to discuss reactivating your account.
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              Refresh Status
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show approval pending message for unapproved students
  return (
    <div className="flex justify-center items-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
            <UserCheck className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle className="text-xl">{fallbackTitle}</CardTitle>
          <CardDescription>{fallbackMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">What happens next?</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Our team will review your registration</li>
              <li>• You'll receive an email notification when approved</li>
              <li>• Once approved, you can book lessons immediately</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Need help?</h4>
            <p className="text-sm text-foreground">
              Contact us at{" "}
              <a href="mailto:info@ym-movement.com" className="underline hover:no-underline">
                info@ym-movement.com
              </a>{" "}
              if you have any questions about your approval status.
            </p>
          </div>

          <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
            Refresh Status
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
