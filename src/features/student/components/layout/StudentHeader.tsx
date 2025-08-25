// src/features/student/components/layout/StudentHeader.tsx
"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { TouchIconButton } from "@/components/ui/touch-button";
import { NotificationsPopover } from "@/features/notifications/components/NotificationsPopover";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useTouchTarget } from "@/hooks/useTouchTarget";

export const StudentHeader = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isMobile = useIsMobile();
  const breadcrumbs = useBreadcrumbs();
  const { getTouchSpacing } = useTouchTarget();

  const handleLogout = async () => {
    try {
      await signOut({
        redirect: false,
        callbackUrl: "/auth/login",
      });

      toast("Logged out", {
        description: "You have been successfully logged out.",
      });

      // Small delay to ensure cleanup completes before navigation
      setTimeout(() => {
        router.push("/auth/login");
      }, 100);
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error", {
        description: "There was a problem logging out.",
      });
      // Force navigation even if signOut fails
      router.push("/auth/login");
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center">
              <BreadcrumbItem>
                {item.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Actions */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{session?.user?.name || "Student"}</span>
        </div>

        <div className={`flex items-center ${getTouchSpacing("gap-2")}`}>
          {/* Notifications Popover */}
          <NotificationsPopover />

          <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
            <AlertDialogTrigger asChild>
              <TouchIconButton variant="ghost" aria-label="Log out">
                <LogOut className="h-5 w-5" />
              </TouchIconButton>
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
    </div>
  );
};
