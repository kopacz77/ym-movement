// src/app/(protected)/admin/payments/page.tsx
"use client";

import type { PaymentStatus } from "@prisma/client";
import { ArrowDownAZ, ArrowUpAZ, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { showPaymentConfirmation } from "@/lib/toast-confirmations";

const PaymentDetail = dynamic(
  () =>
    import("@/features/admin/components/payments/PaymentDetail").then((mod) => ({
      default: mod.PaymentDetail,
    })),
  {
    loading: () => <LoadingSkeleton />,
  },
);

const PaymentFilter = dynamic(
  () =>
    import("@/features/admin/components/payments/PaymentFilter").then((mod) => ({
      default: mod.PaymentFilter,
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

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const utils = api.useUtils();

  // Fetch payments with filters
  const { data: payments, isLoading } = api.admin.payment.getPayments.useQuery({
    search: searchQuery || undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    sortBy,
  });

  // Get selected payment details
  const { data: selectedPayment } = api.admin.payment.getPaymentById.useQuery(
    { paymentId: selectedPaymentId || "" },
    { enabled: !!selectedPaymentId },
  );

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
    // Find the payment to get details for confirmation
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

    // Show confirmation before verifying
    showPaymentConfirmation(
      amount,
      studentName,
      paymentMethod,
      () => {
        // User confirmed - proceed with verification
        verifyPayment.mutate({
          paymentId,
          verifiedBy: "admin", // In a real app, use the current user's ID
        });
      },
      () => {
        // User cancelled - show cancellation message
        toast.info("Payment verification cancelled", {
          description: "The payment was not marked as paid.",
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
    <div className="container mx-auto py-4 lg:py-6 space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payments</h1>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name or reference code..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                {sortBy === "date-desc" && (
                  <>
                    <ArrowDownAZ className="mr-2 h-4 w-4" />
                    Newest First
                  </>
                )}
                {sortBy === "date-asc" && (
                  <>
                    <ArrowUpAZ className="mr-2 h-4 w-4" />
                    Oldest First
                  </>
                )}
                {sortBy === "name-asc" && (
                  <>
                    <ArrowUpAZ className="mr-2 h-4 w-4" />
                    Name A-Z
                  </>
                )}
                {sortBy === "name-desc" && (
                  <>
                    <ArrowDownAZ className="mr-2 h-4 w-4" />
                    Name Z-A
                  </>
                )}
                {sortBy === "amount-desc" && (
                  <>
                    <ArrowDownAZ className="mr-2 h-4 w-4" />
                    Amount High-Low
                  </>
                )}
                {sortBy === "amount-asc" && (
                  <>
                    <ArrowUpAZ className="mr-2 h-4 w-4" />
                    Amount Low-High
                  </>
                )}
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
              <DropdownMenuItem onClick={() => setSortBy("name-asc")}>Name A-Z</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name-desc")}>Name Z-A</DropdownMenuItem>
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
        <div className="self-start">
          <PaymentFilter currentFilter={statusFilter} onFilterChange={setStatusFilter} />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 lg:w-fit lg:grid-cols-auto">
          <TabsTrigger value="all" className="text-sm">
            All Payments
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-sm">
            Pending
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-sm">
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <PaymentTable
                payments={payments?.payments || []}
                isLoading={isLoading}
                onViewPayment={setSelectedPaymentId}
                onVerifyPayment={handleVerifyPayment}
                onSendReminder={handleSendReminder}
                isVerifying={verifyPayment.isPending}
                isSendingReminder={sendReminder.isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              <PaymentTable
                payments={payments?.payments || []}
                isLoading={isLoading}
                onViewPayment={setSelectedPaymentId}
                onVerifyPayment={handleVerifyPayment}
                onSendReminder={handleSendReminder}
                isVerifying={verifyPayment.isPending}
                isSendingReminder={sendReminder.isPending}
                filterStatus="PENDING"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardContent className="p-0">
              <PaymentTable
                payments={payments?.payments || []}
                isLoading={isLoading}
                onViewPayment={setSelectedPaymentId}
                onVerifyPayment={handleVerifyPayment}
                onSendReminder={handleSendReminder}
                isVerifying={verifyPayment.isPending}
                isSendingReminder={sendReminder.isPending}
                filterStatus="COMPLETED"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                onAddNote={() => setIsNoteDialogOpen(true)}
                onSendReminder={() => handleSendReminder(selectedPaymentId)}
                isProcessing={verifyPayment.isPending || sendReminder.isPending}
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
