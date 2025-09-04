"use client";

// Navigation configurations for mobile sidebar
import {
  BarChart2,
  Calendar,
  Clock,
  CreditCard,
  LayoutDashboard,
  Settings,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
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
import { StudentCommandPalette } from "@/features/student/components/layout/StudentCommandPalette";
import { StudentHeader } from "@/features/student/components/layout/StudentHeader";

const adminNavigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Schedule", href: "/admin/schedule", icon: Calendar },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Reports", href: "/admin/reports", icon: BarChart2 },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const studentNavigation = [
  { name: "Dashboard", href: "/student/dashboard", icon: Clock },
  { name: "Book Lessons", href: "/student/book", icon: Calendar },
  { name: "My Schedule", href: "/student/schedule", icon: Calendar },
  { name: "Payments", href: "/student/payments", icon: CreditCard },
  { name: "Profile", href: "/student/profile", icon: User },
  { name: "Settings", href: "/student/settings", icon: Settings },
];

interface AppLayoutProps {
  role: "admin" | "student";
  children: React.ReactNode;
}

export function AppLayout({ role, children }: AppLayoutProps) {
  const HeaderComponent = role === "admin" ? AdminHeader : StudentHeader;
  const pathname = usePathname() ?? "";

  // Safety check to prevent React #130 errors
  if (!HeaderComponent) {
    console.error("HeaderComponent is undefined for role:", role);
    return <div>Error: Invalid role configuration</div>;
  }

  return (
    <>
      {/* Desktop Layout - Beautiful fixed sidebar (NEVER CHANGE) */}
      <div className="hidden lg:flex min-h-screen bg-background">
        {/* Sidebar - Fixed width, always visible on desktop */}
        <div className="w-64 flex-col fixed inset-y-0">
          <AppSidebar role={role} />
        </div>

        {/* Main content area - offset by sidebar width on desktop */}
        <div className="flex-1 pl-64">
          {/* Beautiful Header with proper styling */}
          <header className="sticky top-0 z-10 border-b bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 px-6 py-4">
            <HeaderComponent />
          </header>

          <main className="flex-1 p-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile Layout - Full width with overlay sidebar */}
      <div className="lg:hidden min-h-screen bg-background">
        <SidebarProvider>
          {/* Mobile Sidebar - Overlay only */}
          <Sidebar collapsible="offcanvas" className="border-r bg-white">
            <SidebarHeader className="h-16 px-4 border-b flex items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-2 shadow-lg">
                  <svg
                    className="h-5 w-5 text-white"
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
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-foreground">YM Movement</span>
                  <span className="text-xs text-muted-foreground">
                    {role === "admin" ? "Admin Dashboard" : "Student Portal"}
                  </span>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent className="px-3 py-4 bg-white">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1">
                    {(role === "admin" ? adminNavigation : studentNavigation).map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;

                      return (
                        <SidebarMenuItem key={item.name}>
                          <SidebarMenuButton asChild>
                            <Link
                              href={item.href}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 w-full ${
                                isActive
                                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
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
            </SidebarContent>
          </Sidebar>

          {/* Main content area - Full width */}
          <SidebarInset className="w-full">
            {/* CRITICAL: Perfect mobile header spacing */}
            <header className="flex h-24 shrink-0 items-center gap-2 border-b bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 px-4 py-2">
              <SidebarTrigger className="shrink-0" />
              <div className="flex-1 min-w-0 py-1">
                <HeaderComponent />
              </div>
            </header>

            <main className="flex-1 p-4">
              <div className="mx-auto w-full">{children}</div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>

      {/* Command Palettes */}
      {role === "admin" ? <AdminCommandPalette /> : <StudentCommandPalette />}
    </>
  );
}
