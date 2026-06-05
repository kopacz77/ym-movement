// src/features/wardrobe/components/admin/WardrobeAdminNav.tsx
//
// Persistent workflow tab bar for the admin wardrobe surfaces. Before this,
// the four admin wardrobe routes (inventory, rental requests, active rentals,
// consigner pending-approval) were only reachable from notification deep-links
// — the pending-approval queue in particular had no UI entry point at all, so
// admins could review the approval UI only by clicking an email/in-app notif.
//
// Renders pill links with active-state highlight (cyan, matching brand) and a
// live count badge on Pending Approval so admins see queued consigner
// submissions at a glance from any wardrobe page.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Inventory", href: "/admin/wardrobe" },
  { label: "Requests", href: "/admin/wardrobe/requests" },
  { label: "Active Rentals", href: "/admin/wardrobe/rentals" },
  { label: "Pending Approval", href: "/admin/wardrobe/pending-approval", showPendingBadge: true },
] as const;

export function WardrobeAdminNav() {
  const pathname = usePathname();

  // Live count of consigner submissions awaiting review. limit:1 keeps the
  // payload tiny — we only read `total`. Shares React Query cache with the
  // queue page, so navigating there is instant.
  const { data: pending } = api.admin.wardrobe.listPendingApproval.useQuery({ page: 1, limit: 1 });
  const pendingCount = pending?.total ?? 0;

  return (
    <nav className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
      {TABS.map((tab) => {
        // Exact match for inventory root (so it isn't "active" on every
        // sub-route); prefix-free exact match for the others too since none
        // are nested under each other.
        const isActive = pathname === tab.href;
        const showBadge = "showPendingBadge" in tab && tab.showPendingBadge && pendingCount > 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-[#0891b2] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-[#1a3a5c]",
            )}
          >
            {tab.label}
            {showBadge && (
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold",
                  isActive ? "bg-white text-[#0891b2]" : "bg-rose-500 text-white",
                )}
              >
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
