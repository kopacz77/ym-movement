// Create src/features/admin/components/analytics/PaymentStats.tsx
"use client";

import { CheckCircle, Clock, CreditCard } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export const PaymentStats = () => {
  const { data, isLoading, error } = api.admin.payment.getPaymentStats.useQuery();

  React.useEffect(() => {
    if (error) {
      toast.error("Error loading payment stats", {
        description: error.message,
      });
    }
  }, [error]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">
            <p>Loading payment statistics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-cyan-50 rounded-full">
              <CreditCard className="h-5 w-5 text-[#0891b2]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold">{data?.totalPayments || 0}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(data?.pendingAmount || 0)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="p-2 bg-emerald-50 rounded-full">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(data?.completedAmount || 0)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Then you can add it to your dashboard page:
// src/app/(protected)/admin/dashboard/page.tsx
// Import and add <PaymentStats /> component
