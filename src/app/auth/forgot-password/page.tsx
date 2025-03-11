// src/app/auth/forgot-password/page.tsx
"use client";
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to process password reset request');
      }

      setSubmitted(true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-zinc-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            {!submitted
              ? "Enter your email to receive a password reset link"
              : "Check your email for a password reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Processing..." : "Reset Password"}
              </Button>
            </form>
          ) : (
            <div className="text-center py-4">
              <p className="mb-4">
                If an account exists with email <span className="font-medium">{email}</span>, we&apos;ve sent a password reset link.
              </p>
              <p className="text-sm text-gray-500">
                Please check your email and follow the instructions to reset your password.
              </p>
            </div>
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