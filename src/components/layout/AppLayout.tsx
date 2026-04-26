"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AdminCommandPalette } from "@/features/admin/components/layout/AdminCommandPalette";
import { AdminHeader } from "@/features/admin/components/layout/AdminHeader";
import { CoachCommandPalette } from "@/features/coach/components/layout/CoachCommandPalette";
import { CoachHeader } from "@/features/coach/components/layout/CoachHeader";
import { StudentCommandPalette } from "@/features/student/components/layout/StudentCommandPalette";
import { StudentHeader } from "@/features/student/components/layout/StudentHeader";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ArrowLeftRight, getNavigationForRole, LogOut } from "@/lib/navigation-config";

interface AppLayoutProps {
  role: "admin" | "student" | "coach";
  children: React.ReactNode;
}

export function AppLayout({ role, children }: AppLayoutProps) {
  const HeaderComponent =
    role === "admin" ? AdminHeader : role === "coach" ? CoachHeader : StudentHeader;
  const pathname = usePathname() ?? "";
  const currentUser = useCurrentUser();

  // Safety check to prevent React #130 errors
  if (!HeaderComponent) {
    console.error("HeaderComponent is undefined for role:", role);
    return <div>Error: Invalid role configuration</div>;
  }

  return (
    <>
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>

      {/* Desktop Layout - Beautiful fixed sidebar (NEVER CHANGE) */}
      {/* Breakpoint at 1300px: above half-screen on 2560px displays (1280px) */}
      <div className="hidden min-[1300px]:flex min-h-screen bg-background">
        {/* Sidebar - Fixed width, always visible on desktop */}
        <div className="w-64 flex-col fixed inset-y-0">
          <AppSidebar role={role} coachId={currentUser.coachId} isAdmin={currentUser.isAdmin} />
        </div>

        {/* Main content area - offset by sidebar width on desktop */}
        <div className="flex-1 pl-64">
          {/* Header - h-24 matches sidebar header for border alignment */}
          <header className="sticky top-0 z-10 h-24 border-b border-border bg-white/80 backdrop-blur-xl shadow-sm px-8 flex items-center">
            <HeaderComponent />
          </header>

          <main id="main-content" className="flex-1 p-8">
            <div className="mx-auto w-full max-w-[1800px]">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile/Split-screen Layout - Full width with overlay sidebar */}
      <div className="min-[1300px]:hidden min-h-screen bg-background">
        <SidebarProvider defaultOpen={false}>
          {/* Mobile Sidebar - Overlay only */}
          <Sidebar collapsible="offcanvas" className="border-r border-white/10 bg-slate-900">
            <SidebarHeader className="h-16 px-4 border-b border-white/10 flex items-center bg-slate-900">
              <div className="flex flex-col items-center gap-1 w-full">
                <Image
                  src="/ym-logo-full.svg"
                  alt="YM Movement"
                  width={140}
                  height={84}
                  className="h-10 w-auto brightness-0 invert"
                />
                <span className="text-xs text-white/50">
                  {role === "admin"
                    ? "Elite Coaching Platform"
                    : role === "coach"
                      ? "Coach Portal"
                      : "Student Portal"}
                </span>
              </div>
            </SidebarHeader>

            <SidebarContent className="px-3 py-4 bg-slate-900">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1">
                    {getNavigationForRole(role).map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;

                      return (
                        <SidebarMenuItem key={item.name}>
                          <SidebarMenuButton asChild>
                            <Link
                              href={item.href}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 w-full ${
                                isActive
                                  ? "border-l-[3px] border-cyan-500 bg-white/10 text-white font-semibold"
                                  : "text-white/60 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="font-medium">{item.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {/* New Session Button - Mobile */}
              {(role === "admin" || role === "coach") && (
                <SidebarGroup>
                  <SidebarGroupContent>
                    <div className="px-2 pt-2">
                      <Link
                        href={role === "admin" ? "/admin/schedule" : "/coach/schedule"}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-500 text-white rounded-lg font-medium hover:scale-[1.02] transition-transform duration-200 shadow-md"
                      >
                        <Plus className="h-5 w-5" />
                        <span>New Session</span>
                      </Link>
                    </div>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

              {/* Role Switch Link - Mobile */}
              {role === "admin" && currentUser.coachId && (
                <SidebarGroup>
                  <SidebarGroupContent>
                    <div className="pt-2 mt-2 border-t border-white/10">
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link
                              href="/coach/dashboard"
                              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200 w-full"
                            >
                              <ArrowLeftRight className="h-4 w-4 shrink-0" />
                              <span className="font-medium">Coach View</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </div>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
              {role === "coach" && currentUser.isAdmin && (
                <SidebarGroup>
                  <SidebarGroupContent>
                    <div className="pt-2 mt-2 border-t border-white/10">
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link
                              href="/admin/dashboard"
                              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200 w-full"
                            >
                              <ArrowLeftRight className="h-4 w-4 shrink-0" />
                              <span className="font-medium">Admin View</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </div>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
              {/* Sign Out - Mobile */}
              <SidebarGroup>
                <SidebarGroupContent>
                  <div className="pt-2 mt-2 border-t border-white/10">
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <button
                            onClick={() => signOut({ callbackUrl: "/auth/login" })}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:bg-white/10 hover:text-red-400 transition-all duration-200 w-full"
                          >
                            <LogOut className="h-4 w-4 shrink-0" />
                            <span className="font-medium">Sign Out</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          {/* Main content area - Full width */}
          <SidebarInset className="w-full">
            {/* CRITICAL: Perfect mobile header spacing */}
            <header className="flex h-24 shrink-0 items-center gap-2 border-b border-border bg-white/80 backdrop-blur-xl shadow-sm px-4 py-2">
              <SidebarTrigger className="shrink-0" />
              <div className="flex-1 min-w-0 py-1">
                <HeaderComponent />
              </div>
            </header>

            <main id="main-content" className="flex-1 p-4">
              <div className="mx-auto w-full">{children}</div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>

      {/* Command Palettes */}
      {role === "admin" ? (
        <AdminCommandPalette />
      ) : role === "coach" ? (
        <CoachCommandPalette />
      ) : (
        <StudentCommandPalette />
      )}
    </>
  );
}
