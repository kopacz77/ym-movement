// src/app/auth/complete-registration/CompleteRegistrationForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Level } from "@prisma/client";
import { Check, Loader2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordStrength } from "@/components/ui/password-strength";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

// Client-side password validation (matches server-side logic)
function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (password.length > 128) {
    errors.push("Password must be less than 128 characters long");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push("Password must contain at least one special character (@$!%*?&)");
  }

  // Check for common weak passwords
  const commonPasswords = [
    "password",
    "123456789",
    "qwerty",
    "abc123",
    "password123",
    "admin",
    "letmein",
    "welcome",
    "123456",
    "password1",
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Password is too common and easily guessable");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Enhanced password requirements component
function PasswordRequirements({ password }: { password: string }) {
  const validation = validatePasswordStrength(password);

  const requirements = [
    {
      text: "At least 8 characters long",
      met: password.length >= 8,
    },
    {
      text: "Contains lowercase letter (a-z)",
      met: /[a-z]/.test(password),
    },
    {
      text: "Contains uppercase letter (A-Z)",
      met: /[A-Z]/.test(password),
    },
    {
      text: "Contains number (0-9)",
      met: /\d/.test(password),
    },
    {
      text: "Contains special character (@$!%*?&)",
      met: /[@$!%*?&]/.test(password),
    },
    {
      text: "Not a common password",
      met: ![
        "password",
        "123456789",
        "qwerty",
        "abc123",
        "password123",
        "admin",
        "letmein",
        "welcome",
        "123456",
        "password1",
      ].includes(password.toLowerCase()),
    },
  ];

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="text-xs font-medium text-gray-700 mb-3">Password Requirements:</div>
      <div className="grid grid-cols-1 gap-1.5">
        {requirements.map((req, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 text-xs transition-colors duration-200 ${req.met ? "text-green-600" : "text-gray-500"}`}
          >
            {req.met ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-gray-400" />
            )}
            <span className={req.met ? "font-medium" : ""}>{req.text}</span>
          </div>
        ))}
      </div>
      {validation.isValid && (
        <div className="flex items-center gap-2 text-xs text-green-600 font-medium mt-3 pt-2 border-t border-green-100">
          <Check className="h-3 w-3" />
          <span>Password meets all requirements!</span>
        </div>
      )}
    </div>
  );
}

// Schema for registration completion form
const registrationSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine((password) => {
        const validation = validatePasswordStrength(password);
        return validation.isValid;
      }, "Password does not meet security requirements"),
    confirmPassword: z.string(),
    level: z.nativeEnum(Level),
    phone: z.string().optional(),
    dateOfBirth: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    emergencyContactRelationship: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegistrationFormValues = z.infer<typeof registrationSchema>;

export function CompleteRegistrationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const hasVerifiedToken = useRef(false);

  // Verify token mutation
  const verifyTokenMutation = api.admin.auth.verifyResetToken.useMutation({
    onSuccess: (result) => {
      if (result?.valid) {
        setIsValidToken(true);
        setEmail(result?.email || "");
        setName(result?.name || result?.email?.split("@")[0] || "");
      } else {
        setIsValidToken(false);
        toast.error("Invalid or expired registration link", {
          description: "Please contact support for assistance",
        });
      }
      setIsLoading(false);
    },
    onError: () => {
      setIsValidToken(false);
      setIsLoading(false);
      toast.error("Error verifying registration link", {
        description: "Please try again or contact support",
      });
    },
  });

  // Complete registration mutation
  const completeRegistrationMutation = api.admin.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Registration completed successfully!", {
        description: "You can now log in with your credentials",
      });
      router.push("/auth/login");
    },
    onError: (error) => {
      toast.error("Failed to complete registration", {
        description: error.message || "Please try again",
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
      toast.error("Missing registration token", {
        description: "Please use the link from your approval email",
      });
    }
  }, [token, verifyTokenMutation]); // Now safe to include verifyTokenMutation since we use ref guard

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
      level: Level.PRE_PRELIMINARY,
      phone: "",
      dateOfBirth: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
      notes: "",
    },
  });

  // Update form when name is loaded from token verification
  React.useEffect(() => {
    if (name && name !== form.getValues("name")) {
      form.setValue("name", name);
    }
  }, [name, form]);

  // Watch password field for validation
  const watchedPassword = form.watch("password");
  React.useEffect(() => {
    if (watchedPassword) {
      const validation = validatePasswordStrength(watchedPassword);
      setIsPasswordValid(validation.isValid);
    } else {
      setIsPasswordValid(false);
    }
  }, [watchedPassword]);

  function onSubmit(values: RegistrationFormValues) {
    if (!token) {
      toast.error("Missing registration token");
      return;
    }

    // Complete the password setup and update name if changed
    completeRegistrationMutation.mutate({
      token,
      password: values.password,
      name: values.name,
    });
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Verifying Registration Link</CardTitle>
          <CardDescription>Please wait...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8 pt-4">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!isValidToken) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Invalid Registration Link</CardTitle>
          <CardDescription>This registration link is invalid or has expired.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-gray-500 mb-4">
            Please contact support at info@ym-movement.com for assistance.
          </p>
          <Button onClick={() => router.push("/auth/login")}>Go to Login</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        {/* YM Movement Logo */}
        <div className="flex justify-center mb-4">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 shadow-lg">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
        </div>
        <CardTitle className="text-2xl mb-2">Welcome to YM Movement!</CardTitle>
        <CardDescription>
          Complete your registration to get started with professional ice dance coaching and
          training.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
            {/* Account Info */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-medium text-gray-800">Account Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-900">Email</label>
                  <Input value={email} disabled className="bg-zinc-50" />
                </div>
              </div>

              {/* Password Section - Single Column for Better Layout */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} />
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
                          <Input type="password" placeholder="Confirm your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Password Requirements - Full Width Below */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <PasswordStrength password={form.watch("password")} showErrors={false} />
                  <PasswordRequirements password={form.watch("password")} />
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-medium text-gray-800">Profile Information</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={Level.PRE_PRELIMINARY}>Pre-Preliminary</SelectItem>
                          <SelectItem value={Level.PRELIMINARY}>Preliminary</SelectItem>
                          <SelectItem value={Level.PRE_JUVENILE}>Pre-Juvenile</SelectItem>
                          <SelectItem value={Level.JUVENILE}>Juvenile</SelectItem>
                          <SelectItem value={Level.INTERMEDIATE}>Intermediate</SelectItem>
                          <SelectItem value={Level.NOVICE}>Novice</SelectItem>
                          <SelectItem value={Level.JUNIOR}>Junior</SelectItem>
                          <SelectItem value={Level.SENIOR}>Senior</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Phone Number <span className="text-gray-400">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Date of Birth <span className="text-gray-400">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end">
                  <div className="text-sm text-gray-500 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="font-medium text-blue-800 mb-1">💡 Why we need this info:</p>
                    <p>
                      Helps us tailor your coaching experience and ensure proper emergency
                      protocols.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium text-gray-800">Emergency Contact</h3>
                <span className="text-sm text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                  Optional
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="emergencyContactRelationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <FormControl>
                      <Input placeholder="Parent, Spouse, Friend, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Additional Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Additional Notes <span className="text-gray-400">(Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your skating goals, experience, or any questions you have for your coach..."
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Section */}
            <div className="pt-4 border-t border-gray-100">
              {!isPasswordValid && watchedPassword && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800">
                    <X className="h-4 w-4" />
                    <p className="text-sm font-medium">Password Requirements Not Met</p>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    Please ensure your password meets all security requirements before proceeding.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
                disabled={completeRegistrationMutation.isPending || !isPasswordValid}
              >
                {completeRegistrationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing Registration...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Complete Registration
                  </>
                )}
              </Button>

              {isPasswordValid && (
                <p className="text-xs text-center text-green-600 mt-2 flex items-center justify-center gap-1">
                  <Check className="h-3 w-3" />
                  Ready to complete registration!
                </p>
              )}
            </div>
          </form>
        </Form>
      </CardContent>

      {/* Footer with branding */}
      <div className="px-6 pb-6">
        <div className="text-center text-sm text-gray-500 border-t pt-4">
          <p className="mb-2">
            Welcome to <span className="font-semibold text-blue-600">YM Movement</span> -
            Professional Ice Dance Coaching
          </p>
          <p>
            Need help? Contact us at{" "}
            <a href="mailto:info@ym-movement.com" className="text-blue-600 hover:underline">
              info@ym-movement.com
            </a>
          </p>
        </div>
      </div>
    </Card>
  );
}
