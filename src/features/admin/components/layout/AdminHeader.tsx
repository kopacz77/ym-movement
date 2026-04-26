// src/features/admin/components/layout/AdminHeader.tsx
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { TouchIconButton } from "@/components/ui/touch-button";
import { WarmGreeting } from "@/components/ui/warm-greeting";
import { NotificationsPopover } from "@/features/notifications/components/NotificationsPopover";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useTouchTarget } from "@/hooks/useTouchTarget";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export function AdminHeader() {
  const router = useRouter();
  const { data: session } = useSession();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isMobile = useIsMobile();
  const breadcrumbs = useBreadcrumbs();
  const { getTouchSpacing } = useTouchTarget();

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false, callbackUrl: "/auth/login" });
      toast("Logged out", {
        description: "You have been successfully logged out.",
      });
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error", {
        description: "There was a problem logging out.",
      });
      router.push("/auth/login");
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center">
      {/* Breadcrumb Navigation */}
      <div className="mb-1 lg:mb-1">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => (
              <div key={index} className="flex items-center">
                <BreadcrumbItem>
                  {item.href ? (
                    <BreadcrumbLink asChild>
                      <Link
                        href={item.href}
                        className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item.label}
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="text-xs sm:text-sm font-medium">
                      {item.label}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 lg:gap-4 min-w-0 flex-1">
          <WarmGreeting name={session?.user?.name || "Beautiful"} />
        </div>

        <div className={`flex items-center shrink-0 ${getTouchSpacing("gap-2")}`}>
          {/* Notifications Popover */}
          <NotificationsPopover />

          {/* Profile Avatar */}
          <Link href="/admin/settings">
            <Avatar className="h-9 w-9 border border-slate-200 hover:ring-2 hover:ring-cyan-500 transition-all cursor-pointer">
              <AvatarFallback className="bg-slate-100 text-slate-600 text-sm font-semibold">
                {getInitials(session?.user?.name)}
              </AvatarFallback>
            </Avatar>
          </Link>

          <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
            <AlertDialogTrigger asChild>
              <TouchIconButton variant="ghost" aria-label="Log out">
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
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
}
