"use client";

import type { RentalRequestStatus } from "@prisma/client";
import { format } from "date-fns";
import { ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { formatCurrencyFromCents } from "@/lib/utils";
import { RentalStatusBadge } from "./RentalStatusBadge";

const VALID_TABS = ["pending", "approved", "active", "past", "other"] as const;
type TabKey = (typeof VALID_TABS)[number];

function parseTab(raw: string | null): TabKey {
  if (raw && VALID_TABS.includes(raw as TabKey)) {
    return raw as TabKey;
  }
  return "pending";
}

export function MyRentalsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));

  const setTab = (next: TabKey) => {
    const params = new URLSearchParams(searchParams);
    if (next === "pending") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">My rentals</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track your rental requests and active rentals.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="other">History</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <PendingTab />
        </TabsContent>
        <TabsContent value="approved">
          <ApprovedTab />
        </TabsContent>
        <TabsContent value="active">
          <ActiveTab />
        </TabsContent>
        <TabsContent value="past">
          <PastTab />
        </TabsContent>
        <TabsContent value="other">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PendingTab() {
  const utils = api.useUtils();
  const query = api.wardrobe.requests.mine.useQuery();
  const cancelMutation = api.wardrobe.requests.cancel.useMutation({
    onSuccess: () => {
      toast.success("Request canceled");
      utils.wardrobe.requests.mine.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to cancel"),
  });

  if (query.isLoading) {
    return <TabLoading />;
  }
  const rows = (query.data ?? []).filter((r) => r.status === "PENDING");
  if (rows.length === 0) {
    return <EmptyState message="No pending requests" />;
  }

  return (
    <ul className="space-y-3 mt-4">
      {rows.map((r) => (
        <RequestRow
          key={r.id}
          request={r}
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={cancelMutation.isPending && cancelMutation.variables?.requestId === r.id}
              onClick={() => {
                if (window.confirm("Cancel this rental request?")) {
                  cancelMutation.mutate({ requestId: r.id });
                }
              }}
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              Cancel
            </Button>
          }
        />
      ))}
    </ul>
  );
}

function ApprovedTab() {
  const query = api.wardrobe.requests.mine.useQuery();
  if (query.isLoading) {
    return <TabLoading />;
  }
  const rows = (query.data ?? []).filter((r) => r.status === "APPROVED");
  if (rows.length === 0) {
    return <EmptyState message="No approved requests awaiting payment" />;
  }
  return (
    <ul className="space-y-3 mt-4">
      {rows.map((r) => (
        <RequestRow key={r.id} request={r} />
      ))}
    </ul>
  );
}

function ActiveTab() {
  const query = api.wardrobe.requests.myRentals.useQuery();
  if (query.isLoading) {
    return <TabLoading />;
  }
  const rows = (query.data ?? []).filter(
    (r) => (r.paymentStatus === "AWAITING_PAYMENT" || r.paymentStatus === "PAID") && !r.returnedAt,
  );
  if (rows.length === 0) {
    return <EmptyState message="No active rentals" />;
  }
  return (
    <ul className="space-y-3 mt-4">
      {rows.map((r) => (
        <RentalRow key={r.id} rental={r} />
      ))}
    </ul>
  );
}

function PastTab() {
  const query = api.wardrobe.requests.myRentals.useQuery();
  if (query.isLoading) {
    return <TabLoading />;
  }
  const rows = (query.data ?? []).filter((r) => r.returnedAt != null);
  if (rows.length === 0) {
    return <EmptyState message="No past rentals" />;
  }
  return (
    <ul className="space-y-3 mt-4">
      {rows.map((r) => (
        <RentalRow key={r.id} rental={r} />
      ))}
    </ul>
  );
}

function HistoryTab() {
  const query = api.wardrobe.requests.mine.useQuery();
  if (query.isLoading) {
    return <TabLoading />;
  }
  const rows = (query.data ?? []).filter((r) =>
    (["CANCELED", "DECLINED", "CONVERTED"] as RentalRequestStatus[]).includes(r.status),
  );
  if (rows.length === 0) {
    return <EmptyState message="No prior requests" />;
  }
  return (
    <ul className="space-y-3 mt-4">
      {rows.map((r) => (
        <RequestRow key={r.id} request={r} />
      ))}
    </ul>
  );
}

function TabLoading() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center mt-4">
      <p className="text-sm text-slate-600">{message}</p>
      <Link
        href="/wardrobe"
        className="mt-3 inline-flex items-center text-sm text-[#0891b2] hover:underline"
      >
        Browse the wardrobe
      </Link>
    </div>
  );
}

interface RequestRowProps {
  request: {
    id: string;
    startDate: Date;
    endDate: Date;
    competitionName: string | null;
    status: RentalRequestStatus;
    createdAt: Date;
    Dress: {
      id: string;
      title: string;
      sizeLabel: string;
      color: string;
      Images: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
    };
  };
  actions?: React.ReactNode;
}

function RequestRow({ request, actions }: RequestRowProps) {
  const img =
    request.Dress.Images.find((i) => i.isPrimary)?.url ?? request.Dress.Images[0]?.url ?? null;
  return (
    <li className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <Link href={`/wardrobe/${request.Dress.id}`} className="flex-shrink-0">
        <div className="relative h-20 w-20 rounded-lg bg-slate-50 overflow-hidden flex items-center justify-center">
          {img ? (
            <Image src={img} alt={request.Dress.title} fill sizes="80px" className="object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-slate-300" />
          )}
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/wardrobe/${request.Dress.id}`}
              className="font-medium text-slate-900 hover:text-[#0891b2]"
            >
              {request.Dress.title}
            </Link>
            <p className="text-xs text-slate-500">
              {request.Dress.color} · Size {request.Dress.sizeLabel}
            </p>
          </div>
          <RentalStatusBadge status={request.status} />
        </div>
        <p className="mt-2 text-sm text-slate-700">
          {format(request.startDate, "MMM d")} – {format(request.endDate, "MMM d, yyyy")}
          {request.competitionName ? ` · ${request.competitionName}` : ""}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Requested {format(request.createdAt, "MMM d, yyyy")}
        </p>
      </div>
      {actions && <div className="flex items-start">{actions}</div>}
    </li>
  );
}

interface RentalRowProps {
  rental: {
    id: string;
    startDate: Date;
    endDate: Date;
    totalCharged: number;
    paymentStatus: string;
    returnedAt: Date | null;
    Dress: {
      id: string;
      title: string;
      sizeLabel: string;
      color: string;
      Images: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
    };
  };
}

function RentalRow({ rental }: RentalRowProps) {
  const img =
    rental.Dress.Images.find((i) => i.isPrimary)?.url ?? rental.Dress.Images[0]?.url ?? null;
  // Visible status: if returned, show "Returned"; else fall back to paymentStatus
  const displayStatus = rental.returnedAt
    ? "RETURNED"
    : (rental.paymentStatus as "AWAITING_PAYMENT" | "PAID");
  return (
    <li className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <Link href={`/wardrobe/${rental.Dress.id}`} className="flex-shrink-0">
        <div className="relative h-20 w-20 rounded-lg bg-slate-50 overflow-hidden flex items-center justify-center">
          {img ? (
            <Image src={img} alt={rental.Dress.title} fill sizes="80px" className="object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-slate-300" />
          )}
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/wardrobe/${rental.Dress.id}`}
              className="font-medium text-slate-900 hover:text-[#0891b2]"
            >
              {rental.Dress.title}
            </Link>
            <p className="text-xs text-slate-500">
              {rental.Dress.color} · Size {rental.Dress.sizeLabel}
            </p>
          </div>
          <RentalStatusBadge status={displayStatus} />
        </div>
        <p className="mt-2 text-sm text-slate-700">
          {format(rental.startDate, "MMM d")} – {format(rental.endDate, "MMM d, yyyy")}
        </p>
        <p className="text-sm font-medium text-slate-900 mt-1">
          {formatCurrencyFromCents(rental.totalCharged)}
        </p>
      </div>
    </li>
  );
}
