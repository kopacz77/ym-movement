import type { LessonType, PaymentStatus } from "@prisma/client";
import { format, isPast } from "date-fns";
import { Check, MoreVertical, Send, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Lesson?: {
    Coach?: {
      User?: {
        name?: string | null;
      };
    } | null;
    type?: LessonType | null;
    duration?: number | null;
  } | null;
}

interface PaymentTableProps {
  payments: Payment[];
  isLoading: boolean;
  onViewPayment: (paymentId: string) => void;
  onVerifyPayment: (paymentId: string) => void;
  onUnverifyPayment?: (paymentId: string) => void;
  onSendReminder: (paymentId: string) => void;
  isVerifying: boolean;
  isUnverifying?: boolean;
  isSendingReminder: boolean;
  filterStatus?: PaymentStatus;
}

const INITIALS_COLORS = ["bg-[#1a3a5c]", "bg-violet-600", "bg-slate-400", "bg-[#0891b2]"];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getInitialsColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length];
}

function formatLessonType(type: LessonType | null | undefined): string {
  if (!type) {
    return "Private";
  }
  switch (type) {
    case "PRIVATE":
      return "Private";
    case "GROUP":
      return "Group";
    case "CHOREOGRAPHY":
      return "Choreography";
    case "COMPETITION_PREP":
      return "Competition Prep";
    case "OFF_ICE_DANCE":
      return "Off-Ice Dance";
    default:
      return String(type).replace("_", " ");
  }
}

function formatMethodBadge(method: string) {
  const normalized = method.toUpperCase();
  switch (normalized) {
    case "VENMO":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#008CFF]/10 text-[#008CFF] border border-[#008CFF]/20">
          Venmo
        </span>
      );
    case "ZELLE":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-violet-500/10 text-violet-600 border border-violet-500/20">
          Zelle
        </span>
      );
    case "CASH":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
          Cash
        </span>
      );
    case "CARD":
    case "CREDIT_CARD":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          Card
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
          {method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()}
        </span>
      );
  }
}

function getStatusBadge(status: PaymentStatus) {
  switch (status) {
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Paid
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Pending
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
          {status}
        </span>
      );
  }
}

export const PaymentTable = ({
  payments,
  isLoading,
  onViewPayment,
  onVerifyPayment,
  onUnverifyPayment,
  onSendReminder,
  isVerifying,
  isUnverifying,
  isSendingReminder,
  filterStatus,
}: PaymentTableProps) => {
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
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
            <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 min-w-[180px]">
              Student
            </TableHead>
            <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 min-w-[100px]">
              Amount
            </TableHead>
            <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 min-w-[100px]">
              Date
            </TableHead>
            <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 min-w-[90px]">
              Method
            </TableHead>
            <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 min-w-[100px]">
              Status
            </TableHead>
            <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 min-w-[140px]">
              Lesson Type
            </TableHead>
            <TableHead className="uppercase tracking-[0.15em] text-xs text-slate-500 font-medium py-4 px-6 min-w-[140px]">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPayments.map((payment) => {
            const studentName = payment.Student?.User?.name || "Unknown";
            const initials = getInitials(studentName);
            const initialsColor = getInitialsColor(studentName);
            const lessonDate = new Date(payment.lesson_date);
            const isOverdue = payment.status === "PENDING" && isPast(lessonDate);
            const lessonType = payment.Lesson?.type;
            const duration = payment.Lesson?.duration;

            return (
              <TableRow
                key={payment.id}
                className={
                  isOverdue
                    ? "border-l-2 border-l-rose-500 bg-rose-50/30 hover:bg-rose-50/50"
                    : "hover:bg-slate-50/50"
                }
              >
                {/* Student Name with Initials */}
                <TableCell className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full ${initialsColor} text-white flex items-center justify-center text-xs font-bold shrink-0`}
                    >
                      {initials}
                    </div>
                    <span className="font-medium text-[#1a3a5c]">{studentName}</span>
                  </div>
                </TableCell>

                {/* Amount */}
                <TableCell className="py-4 px-6">
                  <span className="font-semibold text-[#1a3a5c]">
                    {formatCurrency(payment.amount)}
                  </span>
                </TableCell>

                {/* Date */}
                <TableCell className="py-4 px-6">
                  <span className={isOverdue ? "text-rose-600 font-medium" : "text-slate-600"}>
                    {format(lessonDate, "MMM d, yyyy")}
                  </span>
                </TableCell>

                {/* Method */}
                <TableCell className="py-4 px-6">{formatMethodBadge(payment.method)}</TableCell>

                {/* Status */}
                <TableCell className="py-4 px-6">{getStatusBadge(payment.status)}</TableCell>

                {/* Lesson Type */}
                <TableCell className="py-4 px-6">
                  <span className="text-sm text-slate-500">
                    {formatLessonType(lessonType)}
                    {duration ? ` - ${duration}m` : ""}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    {payment.status === "PENDING" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onVerifyPayment(payment.id)}
                          disabled={isVerifying}
                          className="h-8 text-xs font-medium border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Verify
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSendReminder(payment.id)}
                          disabled={isSendingReminder}
                          className="h-8 text-xs font-medium border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Remind
                        </Button>
                      </>
                    )}
                    {payment.status === "COMPLETED" && onUnverifyPayment && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUnverifyPayment(payment.id)}
                        disabled={isUnverifying}
                        className="h-8 text-xs font-medium border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                      >
                        <Undo2 className="h-3 w-3 mr-1" />
                        Undo
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewPayment(payment.id)}>
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
