// src/app/auth/signup/page.tsx
"use client";

import { Level } from "@prisma/client";

// Cloudflare Turnstile global type
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          execution?: "render" | "execute";
          appearance?: "always" | "execute" | "interaction-only";
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      execute: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox"; // Added import for Checkbox
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatEmail, formatPhoneNumber, toProperCase } from "@/lib/utils";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState<Level>(Level.PRE_PRELIMINARY);
  const [parentConsent, setParentConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Layer 1: Honeypot field (invisible to humans, bots auto-fill it)
  const [honeypot, setHoneypot] = useState("");

  // Layer 2: Cloudflare Turnstile token
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // Wait for Turnstile script to load
  useEffect(() => {
    // Poll for Turnstile availability
    const checkTurnstile = setInterval(() => {
      if (typeof window !== "undefined" && window.turnstile) {
        setTurnstileReady(true);
        clearInterval(checkTurnstile);
      }
    }, 100);

    // Cleanup after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkTurnstile);
      if (!window.turnstile) {
        console.error("Turnstile script failed to load after 10 seconds");
      }
    }, 10000);

    return () => {
      clearInterval(checkTurnstile);
      clearTimeout(timeout);
    };
  }, []);

  // Initialize Turnstile widget once script is ready
  useEffect(() => {
    if (!turnstileReady || typeof window === "undefined" || !window.turnstile) {
      return;
    }

    const container = turnstileContainerRef.current;
    if (!container) {
      console.error("Turnstile container ref not found");
      return;
    }

    // Render visible widget that user must click - ALWAYS requires fresh interaction
    turnstileWidgetId.current = window.turnstile.render(container, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
      // Force manual execution - widget won't auto-verify
      execution: "render",
      callback: (token: string) => {
        setTurnstileToken(token);
      },
      "error-callback": () => {
        console.error("Turnstile verification failed");
        setTurnstileToken(null);
        toast.error("Verification Failed", {
          description: "Please try refreshing the page.",
        });
      },
      "expired-callback": () => {
        setTurnstileToken(null);
        toast("Verification Expired", {
          description: "Please verify again before submitting.",
        });
      },
    });

    // CRITICAL: Reset immediately after render to clear any cached state
    if (turnstileWidgetId.current) {
      setTimeout(() => {
        if (turnstileWidgetId.current && window.turnstile) {
          window.turnstile.reset(turnstileWidgetId.current);
        }
      }, 100);
    }

    return () => {
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId.current);
        setTurnstileToken(null);
      }
    };
  }, [turnstileReady]);

  // REMOVED: Password validation - passwords are set during registration completion after approval

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Layer 1 Check: Honeypot validation (client-side first line of defense)
    if (honeypot) {
      toast.error("Error", {
        description: "Invalid form submission. Please try again.",
      });
      setIsLoading(false);
      return;
    }

    // Layer 2 Check: Ensure user completed verification
    if (!turnstileToken) {
      // Execute the Turnstile widget to show the challenge
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.execute(turnstileWidgetId.current);
      }
      toast.error("Verification Required", {
        description: "Please complete the security check above before submitting.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          level,
          parentConsent,
          maxLessonsPerWeek: 3, // Default value
          honeypot, // Layer 1: Send honeypot to server for verification
          turnstileToken, // Layer 2: Send Turnstile token to server for verification
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle detailed validation errors
        if (data.errors) {
          let errorMessage = data.message || "Validation failed";

          // Format password validation errors
          if (Array.isArray(data.errors)) {
            errorMessage += `:\n${data.errors.join("\n")}`;
          }
          // Format Zod validation errors
          else if (typeof data.errors === "object") {
            const errorList = [];
            for (const [field, fieldErrors] of Object.entries(data.errors)) {
              if (fieldErrors && typeof fieldErrors === "object" && "_errors" in fieldErrors) {
                const messages = (fieldErrors as { _errors: string[] })._errors;
                errorList.push(`${field}: ${messages.join(", ")}`);
              }
            }
            if (errorList.length > 0) {
              errorMessage += `:\n${errorList.join("\n")}`;
            }
          }

          throw new Error(errorMessage);
        }
        throw new Error(data.message || "Something went wrong");
      }

      if (data.welcomeEmailSent === false) {
        // Registration went through but our confirmation email never landed —
        // tell the user so they don't assume radio silence means failure, and
        // give them a direct contact path. Admin has separately been notified
        // (see welcomeEmailSent vs adminNotified in /api/auth/signup).
        toast("Registration submitted — confirmation email delayed", {
          description:
            "Your registration was received, but our confirmation email couldn't be delivered right now. An admin has been alerted and will review your account. If you don't hear back within 48 hours, reach out to info@ym-movement.com.",
          duration: 15000,
        });
      } else {
        toast("Registration submitted", {
          description:
            "Your registration has been submitted for admin approval. You'll receive an email to complete setup once approved.",
        });
      }

      // Redirect to login page after successful signup
      router.push("/auth/login");
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "An error occurred during sign up",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div className="flex min-h-screen">
        {/* Left: Branded visual panel (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[hsl(220,70%,20%)] via-[hsl(220,60%,30%)] to-[hsl(195,85%,35%)] items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-[hsl(195,85%,45%)] blur-3xl" />
            <div className="absolute bottom-1/3 left-1/4 w-64 h-64 rounded-full bg-[hsl(220,70%,50%)] blur-3xl" />
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
              Begin your journey with Olympic-level ice dance coaching.
            </p>
          </div>
        </div>

        {/* Right: Signup form */}
        <div className="flex-1 flex justify-center items-center p-6 bg-background overflow-y-auto">
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
              <CardTitle className="font-display text-2xl">Join YM Movement</CardTitle>
              <CardDescription>Submit your registration for admin approval</CardDescription>
            </CardHeader>
            <CardContent>
              <form id="signup-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={(e) => setName(toProperCase(e.target.value))}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={(e) => setEmail(formatEmail(e.target.value))}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={(e) => setPhone(formatPhoneNumber(e.target.value))}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Skating Level</Label>
                  <Select value={level} onValueChange={(value: Level) => setLevel(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select your level" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Level).map((lvl) => (
                        <SelectItem
                          key={lvl}
                          value={lvl}
                          style={{ whiteSpace: "nowrap", width: "100%", minWidth: "300px" }}
                        >
                          {lvl.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Layer 1: Honeypot field - invisible to humans, bots auto-fill it */}
                <div
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    opacity: 0,
                    pointerEvents: "none",
                    height: 0,
                    overflow: "hidden",
                  }}
                  aria-hidden="true"
                >
                  <Label htmlFor="website" className="sr-only">
                    Leave this field blank
                  </Label>
                  <Input
                    id="website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                {/* Parental Consent Checkbox */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="parentConsent"
                      checked={parentConsent}
                      onCheckedChange={(checked) => setParentConsent(checked === true)}
                    />
                    <Label
                      htmlFor="parentConsent"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      I am a parent/legal guardian creating this account for my child
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    For students under 13, accounts must be created and managed by a parent or legal
                    guardian.
                  </p>
                </div>

                {/* Layer 2: Cloudflare Turnstile CAPTCHA - Visible checkbox */}
                <div className="flex justify-center">
                  <div ref={turnstileContainerRef} />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || !turnstileToken}>
                  {isLoading ? "Submitting..." : "Submit Registration"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-primary hover:underline">
                  Login
                </Link>
              </p>
              <p className="text-xs text-center text-muted-foreground/70 mt-2">
                By signing up, you agree to our{" "}
                <Link href="/terms" className="text-primary/80 hover:underline">
                  Terms of Service
                </Link>
                ,{" "}
                <Link href="/privacy" className="text-primary/80 hover:underline">
                  Privacy Policy
                </Link>
                , and{" "}
                <Link href="/policies" className="text-primary/80 hover:underline">
                  Lesson Policies
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
