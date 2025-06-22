// src/features/admin/components/layout/AdminHeader.tsx
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationsPopover } from "@/features/notifications/components/NotificationsPopover";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export const AdminHeader = () => {
  const router = useRouter();
  const { user, logout } = useAuth(); // Use our custom Auth context
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    try {
      await logout();
      toast("Logged out", {
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error", {
        description: "There was a problem logging out.",
      });
    }
  };


  return (
    <header className="h-16 bg-white border-b shadow-sm safe-top">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-2">
          <div className="rounded-lg bg-blue-500 p-1.5">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Scheduler Logo</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-xl font-semibold">YM Movement</span>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex items-center gap-2 mr-4">
            <span className="text-sm font-medium">{user?.name || "Yura Min"}</span>
          </div>

          {/* Notifications Popover */}
          <NotificationsPopover />

          <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10">
                <LogOut className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className={isMobile ? "w-[90%] max-w-md mx-auto" : ""}>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to log out? You will need to log in again to access your
                  account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>Log Out</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  );
};
