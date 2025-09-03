// src/app/auth/signup/page.tsx
"use client";

import { Level } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState<Level>(Level.PRE_PRELIMINARY);
  const [parentConsent, setParentConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // REMOVED: Password validation - passwords are set during registration completion after approval

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle detailed validation errors
        if (data.errors) {
          let errorMessage = data.message || "Validation failed";
          
          // Format password validation errors
          if (Array.isArray(data.errors)) {
            errorMessage += ":\n" + data.errors.join("\n");
          } 
          // Format Zod validation errors
          else if (typeof data.errors === 'object') {
            const errorList = [];
            for (const [field, fieldErrors] of Object.entries(data.errors)) {
              if (fieldErrors && typeof fieldErrors === 'object' && '_errors' in fieldErrors) {
                const messages = (fieldErrors as { _errors: string[] })._errors;
                errorList.push(`${field}: ${messages.join(', ')}`);
              }
            }
            if (errorList.length > 0) {
              errorMessage += ":\n" + errorList.join("\n");
            }
          }
          
          throw new Error(errorMessage);
        } else {
          throw new Error(data.message || "Something went wrong");
        }
      }

      toast("Registration submitted", {
        description: "Your registration has been submitted for admin approval. You'll receive an email to complete setup once approved.",
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Submitting..." : "Submit Registration"}
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
