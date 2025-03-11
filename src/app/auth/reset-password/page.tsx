// src/app/auth/reset-password/page.tsx
"use client";
import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import { PasswordStrength } from '@/components/ui/password-strength';

// Create a client component that uses useSearchParams
function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  useEffect(() => {
    // Validate the token
    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }
    
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/validate-reset-token?token=${token}`);
        const data = await response.json();
        
        if (!response.ok) {
          setError(data.message || 'Invalid or expired token');
          return;
        }
        
        setIsValid(true);
      } catch (err) {
        setError('Failed to validate reset token');
      }
    };
    
    validateToken();
  }, [token]);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don&apos;t match", {
        description: "Please make sure your passwords match."
      });
      return;
    }
    
    if (password.length < 8) {
      toast.error("Password too short", {
        description: "Password must be at least 8 characters long."
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }
      
      setIsSubmitted(true);
      toast.success("Password Reset Successful", {
        description: "Your password has been successfully reset."
      });
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription className="text-red-500">{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p>The password reset link is invalid or has expired.</p>
            <p className="mt-4">Please request a new password reset link.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/auth/forgot-password">
              <Button>Request New Link</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-zinc-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            {isSubmitted 
              ? "Your password has been reset successfully" 
              : "Enter your new password below"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">New Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Enter new password" 
                  required 
                  minLength={8}
                />
                <PasswordStrength password={password} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Confirm new password" 
                  required 
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !isValid}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          ) : (
            <div className="text-center py-4">
              <p className="mb-4">Your password has been reset successfully.</p>
              <p className="text-sm text-gray-500">
                You will be redirected to the login page shortly.
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

// Main page component with Suspense
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen bg-zinc-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </CardContent>
        </Card>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}