// src/app/(protected)/student/payments/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { format } from "date-fns";
import { AlertCircle, ChevronDown, ChevronRight, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";
import { formatUtcDate } from "@/lib/date-utils";

export default function StudentPaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const { id: studentId } = useCurrentUser();
  const [isReady, setIsReady] = useState(false);

  // Only fetch data when studentId is available
  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);

  // Get student lessons with payments
  const {
    data: lessons,
    isLoading,
    error,
  } = api.student.profile.getStudentLessons.useQuery(
    { studentId },
    {
      enabled: isReady && !!studentId,
      retry: false,
    },
  );

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast.error("Error loading payments", {
        description: error.message,
      });
    }
  }, [error]);

  // Filter lessons to only include those with payments
  const paymentsData = lessons ? lessons.filter((lesson) => lesson.Payment !== null) : [];

  // Convert to our expected type
  const payments = paymentsData.map((lesson) => ({
    ...lesson,
    payment: lesson.Payment,
  }));

  // Filter payments based on search query and tab
  const filteredPayments = payments.filter((lesson) => {
    const formattedDate = formatUtcDate(lesson.startTime);
    const matchesSearch = searchQuery
      ? lesson.payment?.referenceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formattedDate.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesTab =
      activeTab === "all" ? true : lesson.payment?.status.toLowerCase() === activeTab.toLowerCase();
    return matchesSearch && matchesTab;
  });

  // Group payments by month
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, typeof filteredPayments> = {};
    for (const payment of filteredPayments) {
      const date = new Date(payment.startTime);
      const monthKey = format(date, "yyyy-MM");
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(payment);
    }
    // Sort keys descending (newest first)
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map((key) => ({
      key,
      label: format(new Date(key + "-01"), "MMMM yyyy"),
      payments: groups[key],
    }));
  }, [filteredPayments]);

  // Auto-expand the current month
  useEffect(() => {
    if (groupedByMonth.length > 0 && expandedMonths.size === 0) {
      setExpandedMonths(new Set([groupedByMonth[0].key]));
    }
  }, [groupedByMonth, expandedMonths.size]);

  // Outstanding payments
  const pendingPayments = payments.filter((p) => p.payment?.status === "PENDING");
  const pendingTotal = pendingPayments.reduce((sum, p) => sum + (p.payment?.amount || 0), 0);

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Paid</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case "FAILED":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payments</h1>
      </div>

      {/* Outstanding Payments Summary */}
      {!isLoading && isReady && pendingPayments.length > 0 && (
        <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100">
                  <AlertCircle className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {pendingPayments.length} outstanding {pendingPayments.length === 1 ? "payment" : "payments"}
                  </p>
                  <p className="text-xs text-amber-600/80 mt-0.5">Please submit payment within 24 hours of booking</p>
                </div>
              </div>
              <p className="text-xl font-bold text-amber-700">${pendingTotal.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by reference code or date..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Payments grouped by month */}
      {!isReady || isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading payments...</p>
          </CardContent>
        </Card>
      ) : filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No payments found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedByMonth.map((group) => (
            <Card key={group.key} className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]">
              <button
                onClick={() => toggleMonth(group.key)}
                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/50 transition-colors rounded-t-lg"
              >
                <div className="flex items-center gap-3">
                  {expandedMonths.has(group.key) ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="font-semibold text-slate-800">{group.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {group.payments.length} {group.payments.length === 1 ? "payment" : "payments"}
                  </Badge>
                </div>
                <span className="text-sm font-medium text-slate-600">
                  {group.payments.length} {group.payments.length === 1 ? "lesson" : "lessons"}
                </span>
              </button>

              {expandedMonths.has(group.key) && (
                <CardContent className="pt-0 pb-4 px-4 sm:px-5">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Lesson</TableHead>
                          <TableHead className="hidden md:table-cell">Coach</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead className="hidden sm:table-cell">Reference</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.payments.map((lesson) => (
                          <TableRow key={lesson.id} className="hover:bg-slate-50/50">
                            <TableCell className="whitespace-nowrap text-sm">
                              {formatUtcDate(lesson.startTime)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {lesson.type.replace("_", " ")}
                            </TableCell>
                            <TableCell className="hidden md:table-cell whitespace-nowrap text-sm">
                              {(lesson as any).Coach?.User?.name || "Instructor"}
                            </TableCell>
                            <TableCell className="font-semibold">${lesson.payment?.amount.toFixed(2)}</TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                              {lesson.payment?.referenceCode}
                            </TableCell>
                            <TableCell>{getStatusBadge(lesson.payment?.status || "")}</TableCell>
                            <TableCell>
                              <Link href={`/student/schedule/${lesson.id}`}>
                                <Button variant="ghost" size="sm" className="hover:text-cyan-700">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Payment Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Payment Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              We accept payments via Venmo, Zelle, or Cash. Please make payments within 24 hours of
              booking your lesson to avoid automatic cancellation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-cyan-100 bg-cyan-50/50 rounded-xl p-4 hover:-translate-y-0.5 transition-all duration-200">
                <h3 className="font-semibold text-cyan-800">Venmo</h3>
                <p className="text-sm mt-1 text-cyan-700 font-medium">@yura-min</p>
              </div>
              <div className="border border-emerald-100 bg-emerald-50/50 rounded-xl p-4 hover:-translate-y-0.5 transition-all duration-200">
                <h3 className="font-semibold text-emerald-800">Zelle</h3>
                <p className="text-sm mt-1 text-emerald-700 font-medium">+1 (714) 743-7071</p>
              </div>
              <div className="border border-amber-100 bg-amber-50/50 rounded-xl p-4 hover:-translate-y-0.5 transition-all duration-200">
                <h3 className="font-semibold text-amber-800">Cash</h3>
                <p className="text-sm mt-1 text-amber-700 font-medium">Bring exact amount to lesson</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 text-sm">Important</h3>
              <p className="text-sm text-slate-600 mt-1">
                Always include your payment reference code in the payment notes to ensure your
                payment is properly tracked.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
