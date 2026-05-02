// src/app/(protected)/admin/payments/page.tsx
"use client";

import type { PaymentStatus } from "@prisma/client";
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  DollarSign,
  Search,
  TrendingUp,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { showPaymentConfirmation, showUnverifyConfirmation } from "@/lib/toast-confirmations";
import { formatCurrency } from "@/lib/utils";

const PaymentDetail = dynamic(
  () =>
    import("@/features/admin/components/payments/PaymentDetail").then((mod) => ({
      default: mod.PaymentDetail,
    })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

const PaymentNoteForm = dynamic(
  () =>
    import("@/features/admin/components/payments/PaymentNoteForm").then((mod) => ({
      default: mod.PaymentNoteForm,
    })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

const PaymentTable = dynamic(
  () =>
    import("@/features/admin/components/payments/PaymentTable").then((mod) => ({
      default: mod.PaymentTable,
    })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

type SortOption =
  | "date-desc"
  | "date-asc"
  | "name-asc"
  | "name-desc"
  | "amount-desc"
  | "amount-asc";

type DateRange = "30days" | "this-month" | "3months" | "this-year" | "all";

export default function PaymentsPage() {
  const { status: sessionStatus } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [coachFilter, setCoachFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const utils = api.useUtils();

  // Fetch coaches for filter dropdown
  const { data: coaches } = api.admin.payment.getCoachesForFilter.useQuery(undefined, {
    enabled: sessionStatus === "authenticated",
  });

  // Fetch payments with filters - only when authenticated to prevent 401 race condition
  const { data: payments, isLoading } = api.admin.payment.getPayments.useQuery(
    {
      search: searchQuery || undefined,
      status: statusFilter !== "ALL" ? statusFilter : undefined,
      sortBy,
      coachId: coachFilter,
    },
    {
      enabled: sessionStatus === "authenticated",
    },
  );

  // Get selected payment details
  const { data: selectedPayment } = api.admin.payment.getPaymentById.useQuery(
    { paymentId: selectedPaymentId || "" },
    { enabled: !!selectedPaymentId },
  );

  // Compute KPI data from payments
  const kpiData = useMemo(() => {
    if (!payments?.payments) {
      return { totalRevenue: 0, outstanding: 0, thisMonth: 0, pendingCount: 0 };
    }

    const allPayments = payments.payments;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalRevenue = allPayments
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayments = allPayments.filter((p) => p.status === "PENDING");
    const outstanding = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    const thisMonth = allPayments
      .filter((p) => p.status === "COMPLETED" && new Date(p.lesson_date) >= startOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalRevenue,
      outstanding,
      thisMonth,
      pendingCount: pendingPayments.length,
    };
  }, [payments]);

  // Filter payments by date range client-side
  const filteredByDatePayments = useMemo(() => {
    if (!payments?.payments) {
      return [];
    }
    if (dateRange === "all") {
      return payments.payments;
    }

    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "this-month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "3months":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "this-year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return payments.payments;
    }

    return payments.payments.filter((p) => new Date(p.lesson_date) >= startDate);
  }, [payments, dateRange]);

  // Verify payment mutation
  const verifyPayment = api.admin.payment.verifyPayment.useMutation({
    onSuccess: () => {
      toast("Payment verified", {
        description: "The payment has been marked as completed.",
      });
      utils.admin.payment.getPayments.invalidate();
      setSelectedPaymentId(null);
    },
    onError: (error) => {
      toast.error("Verification failed", {
        description: error.message,
      });
    },
  });

  // Unverify payment mutation
  const unverifyPayment = api.admin.payment.unverifyPayment.useMutation({
    onSuccess: () => {
      toast("Payment reverted", {
        description: "The payment has been set back to pending.",
      });
      utils.admin.payment.getPayments.invalidate();
      setSelectedPaymentId(null);
    },
    onError: (error) => {
      toast.error("Failed to undo verification", {
        description: error.message,
      });
    },
  });

  // Send reminder mutation
  const sendReminder = api.admin.payment.sendPaymentReminder.useMutation({
    onSuccess: () => {
      toast("Reminder sent", {
        description: "Payment reminder has been sent to the student.",
      });
      utils.admin.payment.getPayments.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to send reminder", {
        description: error.message,
      });
    },
  });

  // Add note mutation
  const addNote = api.admin.payment.addPaymentNote.useMutation({
    onSuccess: () => {
      toast("Note added", {
        description: "The note has been added to the payment.",
      });
      if (selectedPaymentId) {
        utils.admin.payment.getPaymentById.invalidate({
          paymentId: selectedPaymentId,
        });
      }
      setIsNoteDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to add note", {
        description: error.message,
      });
    },
  });

  const handleVerifyPayment = (paymentId: string) => {
    const payment = payments?.payments.find((p) => p.id === paymentId);
    if (!payment) {
      toast.error("Payment not found", {
        description: "Unable to verify payment. Please try again.",
      });
      return;
    }

    const studentName = payment.Student?.User?.name || "Unknown Student";
    const paymentMethod = payment.method;
    const amount = payment.amount;

    showPaymentConfirmation(
      amount,
      studentName,
      paymentMethod,
      () => {
        verifyPayment.mutate({
          paymentId,
          verifiedBy: "admin",
        });
      },
      () => {
        toast.info("Payment verification cancelled", {
          description: "The payment was not marked as paid.",
        });
      },
    );
  };

  const handleUnverifyPayment = (paymentId: string) => {
    const payment = payments?.payments.find((p) => p.id === paymentId);
    if (!payment) return;

    const studentName = payment.Student?.User?.name || "Unknown Student";

    showUnverifyConfirmation(
      payment.amount,
      studentName,
      () => {
        unverifyPayment.mutate({ paymentId });
      },
      () => {
        toast.info("Smart choice!", {
          description: "The payment stays verified.",
        });
      },
    );
  };

  const handleSendReminder = (paymentId: string) => {
    sendReminder.mutate({ paymentId });
  };

  const handleAddNote = (note: string) => {
    if (!selectedPaymentId) {
      return;
    }
    addNote.mutate({ paymentId: selectedPaymentId, notes: note });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">Payments</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track revenue, manage outstanding payments, and send reminders.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="group relative bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Total Revenue
              </p>
              <p className="text-3xl font-bold text-[#1a3a5c] tracking-tight">
                {formatCurrency(kpiData.totalRevenue)}
              </p>
              <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                All-time completed
              </p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <DollarSign className="h-7 w-7 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Outstanding */}
        <div className="group relative bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/40 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                Outstanding
              </p>
              <p className="text-3xl font-bold text-[#1a3a5c] tracking-tight">
                {formatCurrency(kpiData.outstanding)}
              </p>
              <p className="flex items-center gap-1 text-xs font-medium text-rose-600">
                <AlertTriangle className="h-3 w-3" />
                {kpiData.pendingCount} payment{kpiData.pendingCount !== 1 ? "s" : ""} pending
              </p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-rose-100 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <AlertTriangle className="h-7 w-7 text-rose-600" />
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="group relative bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/40 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                This Month
              </p>
              <p className="text-3xl font-bold text-[#1a3a5c] tracking-tight">
                {formatCurrency(kpiData.thisMonth)}
              </p>
              <p className="flex items-center gap-1 text-xs font-medium text-[#0891b2]">
                <Calendar className="h-3 w-3" />
                Current billing period
              </p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-cyan-100 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <Calendar className="h-7 w-7 text-[#0891b2]" />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Card */}
      <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.08)] border-0">
        <CardContent className="p-0">
          {/* Card Header with Filters */}
          <div className="px-6 pt-6 pb-4 space-y-4">
            {/* Title Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-[#1a3a5c]">Recent Transactions</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  {filteredByDatePayments.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    className="pl-8 w-[180px] h-9 text-sm border-slate-200 focus:border-[#0891b2] focus:ring-[#0891b2]/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {/* Sort */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 border-slate-200">
                      {sortBy.startsWith("date") &&
                        (sortBy === "date-desc" ? (
                          <ArrowDownAZ className="h-4 w-4" />
                        ) : (
                          <ArrowUpAZ className="h-4 w-4" />
                        ))}
                      {sortBy.startsWith("name") &&
                        (sortBy === "name-desc" ? (
                          <ArrowDownAZ className="h-4 w-4" />
                        ) : (
                          <ArrowUpAZ className="h-4 w-4" />
                        ))}
                      {sortBy.startsWith("amount") &&
                        (sortBy === "amount-desc" ? (
                          <ArrowDownAZ className="h-4 w-4" />
                        ) : (
                          <ArrowUpAZ className="h-4 w-4" />
                        ))}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy("date-desc")}>
                      Newest First
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("date-asc")}>
                      Oldest First
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy("name-asc")}>
                      Name A-Z
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("name-desc")}>
                      Name Z-A
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSortBy("amount-desc")}>
                      Amount High-Low
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("amount-asc")}>
                      Amount Low-High
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value: PaymentStatus | "ALL") => setStatusFilter(value)}
              >
                <SelectTrigger className="w-[150px] h-9 text-sm border-slate-200">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range Filter */}
              <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
                <SelectTrigger className="w-[160px] h-9 text-sm border-slate-200">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                </SelectContent>
              </Select>

              {/* Coach Filter */}
              {coaches && coaches.length > 0 && (
                <Select
                  value={coachFilter ?? "ALL"}
                  onValueChange={(value) => setCoachFilter(value === "ALL" ? undefined : value)}
                >
                  <SelectTrigger className="w-[150px] h-9 text-sm border-slate-200">
                    <SelectValue placeholder="All Coaches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Coaches</SelectItem>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.name || "Unnamed Coach"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Table */}
          <PaymentTable
            payments={filteredByDatePayments}
            isLoading={isLoading}
            onViewPayment={setSelectedPaymentId}
            onVerifyPayment={handleVerifyPayment}
            onUnverifyPayment={handleUnverifyPayment}
            onSendReminder={handleSendReminder}
            isVerifying={verifyPayment.isPending}
            isUnverifying={unverifyPayment.isPending}
            isSendingReminder={sendReminder.isPending}
          />
        </CardContent>
      </Card>

      {/* Payment Detail Dialog */}
      {selectedPaymentId && (
        <Dialog
          open={!!selectedPaymentId}
          onOpenChange={(open) => !open && setSelectedPaymentId(null)}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
            </DialogHeader>
            {selectedPayment ? (
              <PaymentDetail
                payment={selectedPayment}
                onVerify={() => handleVerifyPayment(selectedPaymentId)}
                onUnverify={() => handleUnverifyPayment(selectedPaymentId)}
                onAddNote={() => setIsNoteDialogOpen(true)}
                onSendReminder={() => handleSendReminder(selectedPaymentId)}
                isProcessing={verifyPayment.isPending || sendReminder.isPending || unverifyPayment.isPending}
              />
            ) : (
              <div className="py-4">Loading payment details...</div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Add Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment Note</DialogTitle>
          </DialogHeader>
          <PaymentNoteForm
            onSubmit={handleAddNote}
            isSubmitting={addNote.isPending}
            onCancel={() => setIsNoteDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
