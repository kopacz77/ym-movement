// src/app/auth/login/page.tsx
"use client";
import { ArrowRight, Lock, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#1a3a5c] items-center justify-center overflow-hidden">
        {/* Background image overlay */}
        <div className="absolute inset-0 z-0 opacity-20 bg-cover bg-center mix-blend-overlay bg-[url('/ice-texture.jpg')]" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[hsl(195,85%,45%)] blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-[hsl(220,70%,50%)] blur-3xl" />
        </div>
        <div className="relative z-10 text-center px-12">
          <Image
            src="/ym-logo-full.svg"
            alt="YM Movement"
            width={6053}
            height={3654}
            className="mx-auto h-auto w-[280px] brightness-0 invert opacity-90"
          />
          <p className="mt-6 text-xl font-body font-light tracking-wide text-white/70 max-w-sm mx-auto">
            Elite Ice Dance Coaching
          </p>
        </div>
        <div className="absolute bottom-12 left-12 z-10">
          <p className="text-sm text-white/50">Founded by Yura Min</p>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center bg-background p-8 sm:p-12 lg:p-24 relative overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden w-full text-center mb-12">
          <Image
            src="/ym-logo-symbol.svg"
            alt="YM Movement"
            width={117}
            height={64}
            className="h-12 w-auto mx-auto"
          />
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-xl shadow-multi border border-border/30">
          <h2 className="text-2xl font-sans font-bold text-foreground tracking-tight mb-2">
            Welcome Back
          </h2>
          <p className="text-muted-foreground font-body mb-8">
            Sign in to access your coaching schedule.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-[0.15em]"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground/60">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="athlete@ymmovement.com"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-colors duration-200 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-muted-foreground uppercase tracking-[0.15em]"
                >
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-medium text-secondary hover:text-secondary/80 transition-colors duration-200"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground/60">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-colors duration-200 outline-none text-sm"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-3 h-auto text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                "Signing in..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* OR divider */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="h-px bg-border w-full" />
            <span className="text-muted-foreground text-sm bg-white px-2">OR</span>
            <div className="h-px bg-border w-full" />
          </div>

          {/* Additional actions */}
          <div className="mt-8 space-y-4">
            <Link
              href="/auth/signup"
              className="block w-full text-center py-3 px-4 border border-border rounded-lg text-foreground font-medium hover:bg-muted/50 transition-colors duration-200"
            >
              New Student? Sign Up
            </Link>
            <Link
              href="/auth/coach-signup"
              className="block w-full text-center py-3 px-4 text-muted-foreground font-medium hover:text-primary transition-colors duration-200"
            >
              Coach Registration
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
