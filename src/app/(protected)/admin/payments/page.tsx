// src/app/(protected)/admin/payments/page.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from "sonner";
import { PaymentStatus } from '@prisma/client';
import { format } from 'date-fns';
import { Search, Check, X, Send, FileText } from 'lucide-react';
import { PaymentFilter } from '@/features/admin/components/payments/PaymentFilter';
import { PaymentDetail } from '@/features/admin/components/payments/PaymentDetail';
import { PaymentNoteForm } from '@/features/admin/components/payments/PaymentNoteForm';
import { formatCurrency } from '@/lib/utils';

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const utils = api.useUtils();

  // Fetch payments with filters
  const { data: payments, isLoading } = api.admin.payment.getPayments.useQuery({
    search: searchQuery || undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined
  });

  // Get selected payment details
  const { data: selectedPayment } = api.admin.payment.getPaymentById.useQuery(
    { paymentId: selectedPaymentId! },
    { enabled: !!selectedPaymentId }
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
    utils.admin.payment.getPaymentById.invalidate({ paymentId: selectedPaymentId! });
    setIsNoteDialogOpen(false);
  },
  onError: (error) => {
    toast.error("Failed to add note", {
      description: error.message,
    });
  },
});

  const handleVerifyPayment = (paymentId: string) => {
    verifyPayment.mutate({
      paymentId,
      verifiedBy: "admin" // In a real app, use the current user's ID
    });
  };

  const handleSendReminder = (paymentId: string) => {
    sendReminder.mutate({ paymentId });
  };

  const handleAddNote = (note: string) => {
    if (!selectedPaymentId) return;
    addNote.mutate({ paymentId: selectedPaymentId, notes: note });
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
      </div>

      <div className="flex justify-between items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student name or reference code..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <PaymentFilter
          currentFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Payments</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <p>Loading payments...</p>
                </div>
              ) : !payments || payments.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-muted-foreground">No payments found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.student?.user?.name || 'Unknown'}</TableCell>
                        <TableCell>{format(new Date(payment.createdAt), 'PP')}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell>{payment.referenceCode}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedPaymentId(payment.id)}
                            >
                              View
                            </Button>
                            {payment.status === 'PENDING' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerifyPayment(payment.id)}
                                  disabled={verifyPayment.isPending}
                                >
                                  <Check className="h-4 w-4 mr-1" /> Verify
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendReminder(payment.id)}
                                  disabled={sendReminder.isPending}
                                >
                                  <Send className="h-4 w-4 mr-1" /> Remind
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <p>Loading payments...</p>
                </div>
              ) : !payments || payments.filter(payment => payment.status === 'PENDING').length === 0 ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-muted-foreground">No pending payments found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments
                      .filter(payment => payment.status === 'PENDING')
                      .map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.student?.user?.name || 'Unknown'}</TableCell>
                          <TableCell>{format(new Date(payment.createdAt), 'PP')}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>{payment.method}</TableCell>
                          <TableCell>{payment.referenceCode}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedPaymentId(payment.id)}>
                                View
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleVerifyPayment(payment.id)} 
                                disabled={verifyPayment.isPending}
                              >
                                <Check className="h-4 w-4 mr-1" /> Verify
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleSendReminder(payment.id)} 
                                disabled={sendReminder.isPending}
                              >
                                <Send className="h-4 w-4 mr-1" /> Remind
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <p>Loading payments...</p>
                </div>
              ) : !payments || payments.filter(payment => payment.status === 'COMPLETED').length === 0 ? (
                <div className="flex justify-center items-center h-64">
                  <p className="text-muted-foreground">No completed payments found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments
                      .filter(payment => payment.status === 'COMPLETED')
                      .map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.student?.user?.name || 'Unknown'}</TableCell>
                          <TableCell>{format(new Date(payment.createdAt), 'PP')}</TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>{payment.method}</TableCell>
                          <TableCell>{payment.referenceCode}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedPaymentId(payment.id)}>
                                View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Detail Dialog */}
      {selectedPaymentId && (
        <Dialog open={!!selectedPaymentId} onOpenChange={(open) => !open && setSelectedPaymentId(null)}>
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