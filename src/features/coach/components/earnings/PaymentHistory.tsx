"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";

const statusConfig: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
  FAILED: { label: "Failed", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

function formatLessonType(type: string | null | undefined): string {
  if (!type) {
    return "Private";
  }
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PaymentHistory() {
  const { data: payments, isLoading } = api.coach.earnings.getPaymentHistory.useQuery();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : payments?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Lesson Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => {
                const status = statusConfig[payment.status] ?? statusConfig.PENDING;
                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.Lesson?.startTime
                        ? format(new Date(payment.Lesson.startTime), "MMM d, yyyy")
                        : format(new Date(payment.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{payment.Student?.User?.name ?? "Unknown"}</TableCell>
                    <TableCell>{formatLessonType(payment.Lesson?.type)}</TableCell>
                    <TableCell className="font-medium">${payment.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={status.className}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.method ?? "N/A"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">No payment records yet</p>
        )}
      </CardContent>
    </Card>
  );
}
