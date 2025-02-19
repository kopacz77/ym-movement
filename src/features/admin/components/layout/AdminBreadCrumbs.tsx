"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const AdminBreadcrumbs = () => {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      <Link href="/admin" className="hover:text-foreground">
        Admin
      </Link>
      {paths.slice(1).map((path, index) => (
        <div key={path} className="flex items-center">
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/admin/${paths.slice(1, index + 2).join('/')}`}
            className="capitalize ml-1 hover:text-foreground"
          >
            {path}
          </Link>
        </div>
      ))}
    </nav>
  );
};
