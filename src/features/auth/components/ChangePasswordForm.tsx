// src/features/auth/components/ChangePasswordForm.tsx
"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PasswordStrength } from "@/components/ui/password-strength";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/server/api/roots";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Use the admin.auth path instead of auth directly, since that's your router structure
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

    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match", {
        description: "New password and confirmation password must match.",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password too short", {
        description: "New password must be at least 8 characters long.",
      });
      return;
    }

    setIsLoading(true);

    try {
      changePassword.mutate({
        currentPassword,
        newPassword,
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
