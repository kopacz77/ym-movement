// src/app/auth/login/page.tsx
"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import type { FormEvent } from "react";
import { useState } from "react";
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Login Failed", {
          description: result.error,
        });
        setIsLoading(false);
        return;
      }

      // Redirect to server-side route that reads role from JWT and redirects
      // This avoids an extra client-side network call to get the session
      router.push("/dashboard");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error("Login Error", {
        description: errorMessage,
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left: Branded visual panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[hsl(220,70%,20%)] via-[hsl(220,60%,30%)] to-[hsl(195,85%,35%)] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[hsl(195,85%,45%)] blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-[hsl(220,70%,50%)] blur-3xl" />
        </div>
        <div className="relative text-center px-12">
          <Image
            src="/ym-logo-full.svg"
            alt="YM Movement"
            width={6053}
            height={3654}
            className="mx-auto h-auto w-[280px] brightness-0 invert opacity-90"
          />
          <p className="mt-6 text-lg text-white/80 max-w-sm mx-auto">
            Olympic-level ice dance coaching. Elevate your artistry on ice.
          </p>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex-1 flex justify-center items-center p-6 bg-background">
        <Card className="w-full max-w-md border-0 shadow-none lg:shadow-sm lg:border">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4 lg:hidden">
              <Image
                src="/ym-logo-symbol.svg"
                alt="YM Movement"
                width={117}
                height={64}
                className="h-12 w-auto"
              />
            </div>
            <CardTitle className="font-display text-2xl">Welcome Back</CardTitle>
            <CardDescription>Login to your account</CardDescription>
          </CardHeader>
          <CardContent>
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
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <div className="text-right">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                onClick={(e) => {
                  if (isLoading) {
                    e.preventDefault();
                  }
                }}
              >
                {isLoading ? "Loading..." : "Login"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <p className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
