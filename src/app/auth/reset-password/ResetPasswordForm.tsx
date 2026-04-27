// src/app/auth/reset-password/ResetPasswordForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { TRPCClientErrorLike } from "@trpc/client";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { AppRouter } from "@/lib/root";

// Schema for password reset form
const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// Simple spinner component
function Spinner({ size = "lg" }: { size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  return <Loader2 className={`animate-spin text-primary ${sizeClasses[size]}`} />;
}

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [email, setEmail] = useState("");
  const hasVerifiedToken = useRef(false);

  // Verify token mutation
  const verifyTokenMutation = api.passwordReset.verifyToken.useMutation({
    onSuccess: (result) => {
      if (result?.valid) {
        setIsValidToken(true);
        setEmail(result?.email || "");
      } else {
        setIsValidToken(false);
        toast.error("Invalid or expired token", {
          description: "Please request a new password reset link",
        });
      }
      setIsLoading(false);
    },
    onError: () => {
      setIsValidToken(false);
      setIsLoading(false);
      toast.error("Error verifying token", {
        description: "Please try again or request a new password reset link",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = api.passwordReset.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successful", {
        description: "You can now login with your new password",
      });
      router.push("/auth/login");
    },
    onError: (err: TRPCClientErrorLike<AppRouter>) => {
      toast.error("Failed to reset password", {
        description: err.message || "Please try again",
      });
    },
  });

  // Verify token on page load - only run once per token
  useEffect(() => {
    if (token && !hasVerifiedToken.current) {
      hasVerifiedToken.current = true;
      verifyTokenMutation.mutate({ token });
    } else if (!token && !hasVerifiedToken.current) {
      hasVerifiedToken.current = true;
      setIsValidToken(false);
      setIsLoading(false);
      toast.error("Missing reset token", {
        description: "Please use the link from your email",
      });
    }
  }, [token, verifyTokenMutation]);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(values: ResetPasswordFormValues) {
    if (!token) {
      toast.error("Missing reset token");
      return;
    }

    resetPasswordMutation.mutate({
      token,
      password: values.password,
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Verifying Reset Link</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8 pt-4">
            <Spinner size="lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>This reset link is invalid or has expired.</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push("/auth/forgot-password")}>Request New Link</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            {email ? `For ${email}` : "Create a new password for your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
