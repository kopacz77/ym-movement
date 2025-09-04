// src/app/auth/forgot-password/page.tsx
"use client";
import Link from "next/link";
import React, { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Generate unique ID for the email input
  const emailId = React.useId();

  // TRPC mutation for password reset request
  const requestResetMutation = api.passwordReset.requestReset.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message || "Failed to process password reset request",
      });
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    requestResetMutation.mutate({ email });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-zinc-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            {submitted
              ? "Check your email for a password reset link"
              : "Enter your email to receive a password reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center py-4">
              <p className="mb-4">
                If an account exists with email <span className="font-medium">{email}</span>,
                we&apos;ve sent a password reset link.
              </p>
              <p className="text-sm text-gray-500">
                Please check your email and follow the instructions to reset your password.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={emailId}>Email</Label>
                <Input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={requestResetMutation.isPending}>
                {requestResetMutation.isPending ? "Processing..." : "Reset Password"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/auth/login" className="text-sm text-blue-600 hover:underline">
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
