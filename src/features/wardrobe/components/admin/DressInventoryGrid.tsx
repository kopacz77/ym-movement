// src/features/wardrobe/components/admin/DressInventoryGrid.tsx
//
// Admin dress inventory grid (Plan 14-05).
//
// Renders the full paginated dress catalog for the admin at /admin/wardrobe.
// Consumes `api.admin.wardrobe.list` (Plan 14-01) and composes the three Wave 1
// UI primitives (`DressStatusBadge`, `CategoryBadge`, `StatusFilterChips`) from
// Plan 14-02.
//
// Design contracts:
//   1. URL-state filtering: status selection, search text, and page index are
//      all encoded in `?statuses=...&q=...&page=...` so a deep link reproduces
//      the exact view and a refresh preserves filters. Defaults to
//      `?` (empty -> ["AVAILABLE"]) so the URL stays clean on first load.
//   2. Default selection is ["AVAILABLE"] -- admins typically want to see what
//      is live first. The empty-selection state is unreachable through this
//      UI because `parseStatusesParam` falls back to AVAILABLE.
//   3. All-status optimization: when all 7 enum variants are selected, the
//      query sends `statuses: undefined` so the server skips the WHERE IN
//      filter entirely.
//   4. Archive is soft-only (per Plan 14-01). Confirmation is the standard
//      `showDeleteConfirmation` toast pattern -- never `window.confirm`.
//      ARCHIVED rows render at opacity-60 and hide the archive action because
//      you cannot re-archive what is already archived.
//   5. Brand: cyan #0891b2 primary CTA, navy #1a3a5c headings, rose for
//      destructive ghost. Card shadow matches the CLAUDE.md standard.

"use client";

import type { DressStatus } from "@prisma/client";
import { format } from "date-fns";
import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusFilterChips } from "@/features/wardrobe/components/admin/StatusFilterChips";
import { CategoryBadge } from "@/features/wardrobe/components/CategoryBadge";
import { DressStatusBadge } from "@/features/wardrobe/components/DressStatusBadge";
import { api } from "@/lib/api";
import { showDeleteConfirmation } from "@/lib/toast-confirmations";
import { formatCurrencyFromCents } from "@/lib/utils";

const PAGE_SIZE = 20;

const ALL_STATUSES: DressStatus[] = [
  "AVAILABLE",
  "PENDING_APPROVAL",
  "PENDING",
  "RENTED",
  "MAINTENANCE",
  "REJECTED",
  "ARCHIVED",
];

/**
 * Parse the `?statuses=` query param into a typed DressStatus array.
 *
 * Empty/missing -> defaults to ["AVAILABLE"].
 * Unknown variants are filtered out, so a malformed link cannot crash the
 * server-side enum check.
 */
function parseStatusesParam(raw: string | null): DressStatus[] {
  if (!raw) {
    return ["AVAILABLE"];
  }
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => ALL_STATUSES.includes(s as DressStatus)) as DressStatus[];
  return parts.length > 0 ? parts : ["AVAILABLE"];
}

export function DressInventoryGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();

  // -- URL-derived state ----------------------------------------------------
  const statuses = useMemo(() => parseStatusesParam(searchParams.get("statuses")), [searchParams]);
  const search = searchParams.get("q") ?? "";
  const consignedOnly = searchParams.get("consigned") === "1";
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10) || 1;

  // Local input state so keystrokes don't thrash the URL. Submit flushes.
  const [searchInput, setSearchInput] = useState(search);

  /**
   * Merge a partial state delta into the URL search params. Special-cases the
   * default ["AVAILABLE"] status selection to keep the URL clean. Resets page
   * whenever the filter set changes.
   */
  const updateParams = (next: {
    statuses?: DressStatus[];
    q?: string;
    consignedOnly?: boolean;
    page?: number;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (next.statuses !== undefined) {
      if (
        next.statuses.length === 0 ||
        (next.statuses.length === 1 && next.statuses[0] === "AVAILABLE")
      ) {
        params.delete("statuses");
      } else {
        params.set("statuses", next.statuses.join(","));
      }
      params.delete("page");
    }

    if (next.q !== undefined) {
      if (next.q === "") {
        params.delete("q");
      } else {
        params.set("q", next.q);
      }
      params.delete("page");
    }

    if (next.consignedOnly !== undefined) {
      if (next.consignedOnly) {
        params.set("consigned", "1");
      } else {
        params.delete("consigned");
      }
      params.delete("page");
    }

    if (next.page !== undefined) {
      if (next.page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(next.page));
      }
    }

    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  // -- Data fetch -----------------------------------------------------------
  // All-statuses optimization: when every variant is selected, send undefined
  // so the server skips the WHERE IN clause entirely.
  const { data, isLoading, isFetching } = api.admin.wardrobe.list.useQuery({
    statuses: statuses.length === ALL_STATUSES.length ? undefined : statuses,
    search: search || undefined,
    consignedOnly: consignedOnly || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const archive = api.admin.wardrobe.archive.useMutation({
    onSuccess: () => {
      utils.admin.wardrobe.list.invalidate();
      toast.success("Dress archived");
    },
    onError: (e) => toast.error("Failed to archive", { description: e.message }),
  });

  const handleArchive = (id: string, title: string) => {
    showDeleteConfirmation(`"${title}"`, () => archive.mutate({ id }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchInput.trim() });
  };

  const total = data?.total ?? 0;
  const dresses = data?.dresses ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Toolbar: search + Settings + Add dress */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 max-w-md">
            <Input
              type="search"
              placeholder="Search title or description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9"
            />
            <Button type="submit" variant="outline" size="sm" className="h-9">
              Search
            </Button>
          </form>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={consignedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => updateParams({ consignedOnly: !consignedOnly })}
            className={consignedOnly ? "bg-[#0891b2] hover:bg-[#06748f] text-white" : undefined}
            aria-pressed={consignedOnly}
          >
            {consignedOnly ? "Consigned only ✓" : "Consigned only"}
          </Button>
          <Link href="/admin/wardrobe/settings">
            <Button variant="outline" size="sm">
              Settings
            </Button>
          </Link>
          <Link href="/admin/wardrobe/new">
            <Button className="bg-[#0891b2] hover:bg-[#06748f] text-white" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add dress
            </Button>
          </Link>
        </div>
      </div>

      {/* Status filter chips */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">
          Filter by status
        </h3>
        <StatusFilterChips
          selected={statuses}
          onChange={(nextStatuses) => updateParams({ statuses: nextStatuses })}
        />
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {isLoading ? "Loading..." : `${total} ${total === 1 ? "dress" : "dresses"}`}
          {isFetching && !isLoading && " (updating...)"}
        </span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-72 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : dresses.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-16 text-center">
          <p className="text-sm text-slate-500">
            No dresses match the current filters.{" "}
            <Link href="/admin/wardrobe/new" className="text-[#0891b2] underline">
              Add the first one
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dresses.map((dress) => {
            const isArchived = dress.status === "ARCHIVED";
            const primaryImage = dress.Images?.[0]?.url;
            return (
              <div
                key={dress.id}
                className={`bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col ${
                  isArchived ? "opacity-60" : ""
                }`}
              >
                <div className="aspect-square bg-slate-100 relative">
                  {primaryImage ? (
                    <Image
                      src={primaryImage}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <DressStatusBadge status={dress.status} />
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-[#1a3a5c] line-clamp-1">{dress.title}</h4>
                    <CategoryBadge category={dress.category} />
                  </div>
                  <p className="text-xs text-slate-500">Owner: {dress.Owner?.email ?? "—"}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span>{dress.sizeLabel}</span>
                    <span className="font-semibold text-[#1a3a5c]">
                      {formatCurrencyFromCents(dress.competitionPrice)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{dress._count?.Images ?? 0} image(s)</span>
                    <span>{dress._count?.Rentals ?? 0} rental(s)</span>
                    <span className="ml-auto">
                      {format(new Date(dress.updatedAt), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <Link href={`/admin/wardrobe/${dress.id}/edit`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    {!isArchived && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(dress.id, dress.title)}
                        className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                        disabled={archive.isPending}
                        aria-label={`Archive ${dress.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateParams({ page: page - 1 })}
            disabled={page <= 1 || isLoading}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateParams({ page: page + 1 })}
            disabled={page >= totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
