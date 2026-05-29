import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart2,
  BookOpen,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Shirt,
  Tag,
  User,
  Users,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export const adminNavigation: NavItem[] = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Schedule", href: "/admin/schedule", icon: Calendar },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Coaches", href: "/admin/coaches", icon: GraduationCap },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Reports", href: "/admin/reports", icon: BarChart2 },
  { name: "Wardrobe", href: "/admin/wardrobe", icon: Shirt },
  { name: "Consigned", href: "/wardrobe/consigned", icon: Tag },
  { name: "Settings", href: "/admin/settings", icon: Settings },
  { name: "Guide", href: "/admin/guide", icon: BookOpen },
];

export const studentNavigation: NavItem[] = [
  { name: "Dashboard", href: "/student/dashboard", icon: Clock },
  { name: "Book Lessons", href: "/student/book", icon: Calendar },
  { name: "My Schedule", href: "/student/schedule", icon: Calendar },
  { name: "Payments", href: "/student/payments", icon: CreditCard },
  { name: "Policies", href: "/student/policies", icon: FileText },
  { name: "Profile", href: "/student/profile", icon: User },
  { name: "Wardrobe", href: "/wardrobe", icon: Shirt },
  { name: "Consigned", href: "/wardrobe/consigned", icon: Tag },
  { name: "Settings", href: "/student/settings", icon: Settings },
  { name: "Guide", href: "/student/guide", icon: BookOpen },
];

export const coachNavigation: NavItem[] = [
  { name: "Dashboard", href: "/coach/dashboard", icon: LayoutDashboard },
  { name: "Schedule", href: "/coach/schedule", icon: Calendar },
  { name: "Students", href: "/coach/students", icon: Users },
  { name: "Earnings", href: "/coach/earnings", icon: CreditCard },
  { name: "Proposals", href: "/coach/proposals", icon: Clock },
  { name: "Consigned", href: "/wardrobe/consigned", icon: Tag },
  { name: "Profile", href: "/coach/profile", icon: User },
  { name: "Guide", href: "/coach/guide", icon: BookOpen },
];

export function getNavigationForRole(role: "admin" | "student" | "coach"): NavItem[] {
  switch (role) {
    case "admin":
      return adminNavigation;
    case "coach":
      return coachNavigation;
    case "student":
      return studentNavigation;
  }
}

export { ArrowLeftRight, LogOut };
