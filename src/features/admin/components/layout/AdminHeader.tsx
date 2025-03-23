// src/features/admin/components/layout/AdminHeader.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut, Bell } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/useMediaQuery";
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

export const AdminHeader = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      toast("Logged out", {
        description: "You have been successfully logged out.",
      });
      router.push("/auth/login");
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
            <span className="text-sm font-medium">{session?.user?.name || "Admin"}</span>
          </div>

          <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10">
            <Bell className="h-5 w-5" />
          </Button>

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
