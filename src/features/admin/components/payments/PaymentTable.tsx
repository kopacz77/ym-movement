import type { PaymentStatus } from "@prisma/client";
import { format } from "date-fns";
import { Check, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  method: string;
  referenceCode: string;
  status: PaymentStatus;
  createdAt: string | Date;
  lesson_date: string | Date;
  Student?: {
    User?: {
      name?: string | null;
    };
  };
}

interface PaymentTableProps {
  payments: Payment[];
  isLoading: boolean;
  onViewPayment: (paymentId: string) => void;
  onVerifyPayment: (paymentId: string) => void;
  onSendReminder: (paymentId: string) => void;
  isVerifying: boolean;
  isSendingReminder: boolean;
  filterStatus?: PaymentStatus;
}

export const PaymentTable = ({
  payments,
  isLoading,
  onViewPayment,
  onVerifyPayment,
  onSendReminder,
  isVerifying,
  isSendingReminder,
  filterStatus,
}: PaymentTableProps) => {
  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredPayments = filterStatus
    ? payments.filter((payment) => payment.status === filterStatus)
    : payments;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="space-y-2">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto" />
          </div>
          <p className="text-sm text-muted-foreground">Loading payments...</p>
        </div>
      </div>
    );
  }

  if (!payments || filteredPayments.length === 0) {
    const emptyMessage = filterStatus
      ? `No ${filterStatus.toLowerCase()} payments found`
      : "No payments found";

    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[150px]">Student</TableHead>
            <TableHead className="min-w-[100px]">Date</TableHead>
            <TableHead className="min-w-[100px]">Amount</TableHead>
            <TableHead className="min-w-[100px]">Method</TableHead>
            <TableHead className="min-w-[120px]">Reference</TableHead>
            <TableHead className="min-w-[100px]">Status</TableHead>
            <TableHead className="min-w-[200px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPayments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">
                {payment.Student?.User?.name || "Unknown"}
              </TableCell>
              <TableCell>{format(new Date(payment.lesson_date), "PP")}</TableCell>
              <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
              <TableCell>{payment.method.charAt(0).toUpperCase() + payment.method.slice(1).toLowerCase()}</TableCell>
              <TableCell>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {payment.referenceCode}
                </code>
              </TableCell>
              <TableCell>{getStatusBadge(payment.status)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewPayment(payment.id)}
                    className="h-8"
                  >
                    View
                  </Button>
                  {payment.status === "PENDING" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onVerifyPayment(payment.id)}
                        disabled={isVerifying}
                        className="h-8"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Verify</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSendReminder(payment.id)}
                        disabled={isSendingReminder}
                        className="h-8"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Remind</span>
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
