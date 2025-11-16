// src/app/auth/signup/page.tsx
"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Level } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
  const [isVerifying, setIsVerifying] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);

  // REMOVED: Password validation - passwords are set during registration completion after approval

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Layer 1 Check: Honeypot validation (client-side first line of defense)
    if (honeypot) {
      console.warn("Bot detected via honeypot field");
      toast.error("Error", {
        description: "Invalid form submission. Please try again.",
      });
      setIsLoading(false);
      return;
    }

    // Layer 2 Check: Trigger Turnstile verification if not already verified
    if (!turnstileToken && !isVerifying) {
      setIsVerifying(true);
      toast("Security Verification", {
        description: "Please wait while we verify you're human...",
      });
      // Trigger Turnstile challenge
      turnstileRef.current?.execute();
      return;
    }

    // Layer 2 Check: Wait for verification to complete
    if (isVerifying && !turnstileToken) {
      toast("Verification in Progress", {
        description: "Please wait for verification to complete.",
      });
      return;
    }

    // Layer 2 Check: Ensure token exists
    if (!turnstileToken) {
      toast.error("Verification Required", {
        description: "Please complete the security verification.",
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

      toast("Registration submitted", {
        description:
          "Your registration has been submitted for admin approval. You'll receive an email to complete setup once approved.",
      });

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
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join YM Movement</CardTitle>
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

            {/* Layer 2: Cloudflare Turnstile CAPTCHA - Invisible mode with manual execution */}
            <div style={{ display: "none" }}>
              <Turnstile
                ref={turnstileRef}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                options={{
                  size: "invisible",
                  execution: "execute",
                }}
                onSuccess={(token: string) => {
                  console.log("✅ Turnstile verification successful");
                  setTurnstileToken(token);
                  setIsVerifying(false);
                  toast.success("Verification Complete", {
                    description: "You've been verified! Submitting your registration...",
                  });
                  // Auto-submit after verification
                  setTimeout(() => {
                    document.getElementById("signup-form")?.dispatchEvent(
                      new Event("submit", { bubbles: true, cancelable: true })
                    );
                  }, 500);
                }}
                onError={() => {
                  console.error("❌ Turnstile verification failed");
                  setTurnstileToken(null);
                  setIsVerifying(false);
                  toast.error("Verification Failed", {
                    description: "Please try again or refresh the page.",
                  });
                }}
                onExpire={() => {
                  console.warn("⚠️ Turnstile token expired");
                  setTurnstileToken(null);
                  setIsVerifying(false);
                  toast("Verification Expired", {
                    description: "Please submit again to re-verify.",
                  });
                }}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Submitting..." : isVerifying ? "Verifying..." : "Submit Registration"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-sm text-center text-gray-500">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Login
            </Link>
          </p>
          <p className="text-xs text-center text-gray-400 mt-2">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-blue-500 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-blue-500 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
