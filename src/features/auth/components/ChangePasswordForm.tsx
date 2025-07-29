// src/features/auth/components/ChangePasswordForm.tsx
"use client";
import type { TRPCClientErrorLike } from "@trpc/client";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "@/components/ui/password-strength";
import { useSanitizedInput } from "@/hooks/useSanitizedInput";
import { api } from "@/lib/api";
import type { AppRouter } from "@/lib/root";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { sanitizeInput } = useSanitizedInput();

  // Use the correct admin.auth router path since authRouter is nested under adminRouter
  const changePassword = api.admin.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password Changed", {
        description: "Your password has been successfully updated.",
      });
      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Sanitize inputs
    const sanitizedCurrentPassword = sanitizeInput(currentPassword);
    const sanitizedNewPassword = sanitizeInput(newPassword);
    const sanitizedConfirmPassword = sanitizeInput(confirmPassword);

    if (sanitizedNewPassword !== sanitizedConfirmPassword) {
      toast.error("Passwords don't match", {
        description: "New password and confirmation password must match.",
      });
      return;
    }

    // Basic client-side validation (server will do comprehensive validation)
    if (sanitizedNewPassword.length < 8) {
      toast.error("Password too short", {
        description: "New password must be at least 8 characters long.",
      });
      return;
    }

    setIsLoading(true);

    try {
      changePassword.mutate({
        currentPassword: sanitizedCurrentPassword,
        newPassword: sanitizedNewPassword,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password"
          required
          minLength={8}
        />
        <PasswordStrength password={newPassword} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
        />
      </div>
      <Button type="submit" className="mt-2" disabled={isLoading || changePassword.isPending}>
        {isLoading || changePassword.isPending ? "Updating..." : "Update Password"}
      </Button>
    </form>
  );
}
