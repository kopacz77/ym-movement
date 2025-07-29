// src/features/admin/components/payments/PaymentDetail.tsx

import type { LessonType, PaymentMethod, PaymentStatus } from "@prisma/client";
import { Check, ExternalLink, FileText, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/date";
import { formatCurrency } from "@/lib/utils";

// Updated type definition to handle null values from database
interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  referenceCode: string;
  verifiedBy: string | null | undefined; // Changed to accept null
  verifiedAt?: Date | null; // Added null option
  reminderSentAt?: Date | null; // Added null option
  notes?: string | null; // Added null option
  createdAt: Date;
  updatedAt: Date;
  student?: {
    user?: {
      name?: string | null;
    };
  };
  lesson?: {
    startTime: Date;
    duration: number;
    type: LessonType;
    rink?: {
      name: string;
    } | null;
  };
}

interface PaymentDetailProps {
  payment: Payment;
  onVerify: () => void;
  onAddNote: () => void;
  onSendReminder: () => void;
  isProcessing: boolean;
}

export const PaymentDetail: React.FC<PaymentDetailProps> = ({
  payment,
  onVerify,
  onAddNote,
  onSendReminder,
  isProcessing,
}) => {
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Student</h3>
          <p className="text-base">{payment.student?.user?.name || "Unknown"}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
          <div className="pt-1">{getStatusBadge(payment.status)}</div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Amount</h3>
          <p className="text-base">{formatCurrency(payment.amount)}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Method</h3>
          <p className="text-base">{payment.method}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Reference Code</h3>
          <p className="text-base">{payment.referenceCode}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Created Date</h3>
          <p className="text-base">{formatDate(new Date(payment.createdAt))}</p>
        </div>
      </div>

      {payment.lesson && (
        <div className="pt-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Lesson Details</h3>
          <div className="bg-muted p-3 rounded-md">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Date & Time</p>
                <p className="text-sm">{formatDateTime(new Date(payment.lesson.startTime))}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lesson Type</p>
                <p className="text-sm">{payment.lesson.type.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm">{payment.lesson.duration} minutes</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm">{payment.lesson.rink?.name || "Unknown"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {payment.notes && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm whitespace-pre-wrap">{payment.notes}</p>
          </div>
        </div>
      )}

      {payment.verifiedAt && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Verification</h3>
          <p className="text-sm">
            Verified by {payment.verifiedBy || "Admin"} on{" "}
            {formatDateTime(new Date(payment.verifiedAt))}
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onAddNote}>
          <FileText className="h-4 w-4 mr-2" />
          Add Note
        </Button>

        {payment.status === "PENDING" && (
          <>
            <Button variant="outline" onClick={onSendReminder} disabled={isProcessing}>
              <Send className="h-4 w-4 mr-2" />
              Send Reminder
            </Button>
            <Button onClick={onVerify} disabled={isProcessing}>
              <Check className="h-4 w-4 mr-2" />
              Verify Payment
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
