"use client";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * AdminBreadcrumbs renders a breadcrumb navigation for admin pages.
 * The pathname is defaulted to an empty string if null.
 */
export const AdminBreadcrumbs = () => {
  // Use a default empty string in case pathname is null.
  const pathname = usePathname() ?? "";
  const paths = pathname.split("/").filter(Boolean);

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      <Link href="/admin" className="hover:text-foreground">
        Admin
      </Link>
      {paths.slice(1).map((path, index) => (
        <div key={path} className="flex items-center">
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/admin/${paths.slice(1, index + 2).join("/")}`}
            className="capitalize ml-1 hover:text-foreground"
          >
            {path}
          </Link>
        </div>
      ))}
    </nav>
  );
};
