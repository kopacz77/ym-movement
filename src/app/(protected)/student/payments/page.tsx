// src/app/(protected)/student/payments/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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
import { formatUtcDate } from "@/lib/date-utils"; // Import our UTC-aware date formatting

export default function StudentPaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-emerald-50 text-emerald-700">Completed</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-50 text-amber-700">Pending</Badge>;
      case "FAILED":
        return <Badge className="bg-rose-50 text-rose-700">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by reference code or date..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <Card>
        <CardHeader className="pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-4">
          {!isReady || isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p>Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payments found.</p>
            </div>
          ) : (
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
                {filteredPayments.map((lesson) => (
                  <TableRow key={lesson.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatUtcDate(lesson.startTime)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {lesson.type.replace("_", " ")} Lesson
                    </TableCell>
                    <TableCell className="hidden md:table-cell whitespace-nowrap">
                      {(lesson as any).Coach?.User?.name || "Instructor"}
                    </TableCell>
                    <TableCell>${lesson.payment?.amount.toFixed(2)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {lesson.payment?.referenceCode}
                    </TableCell>
                    <TableCell>{getStatusBadge(lesson.payment?.status || "")}</TableCell>
                    <TableCell>
                      <Link href={`/student/schedule/${lesson.id}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" /> View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Payment Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>
              We accept payments via Venmo, Zelle, or Cash. Please make payments within 24 hours of
              booking your lesson to avoid automatic cancellation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium">Venmo</h3>
                <p className="text-sm mt-1">@yura-min</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-medium">Zelle</h3>
                <p className="text-sm mt-1">+1 (714) 743-7071</p>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-medium">Cash</h3>
                <p className="text-sm mt-1">Bring exact amount to lesson</p>
              </div>
            </div>
            <div className="bg-secondary/10 border border-secondary/20 rounded-md p-4">
              <h3 className="font-medium text-foreground">Important</h3>
              <p className="text-sm text-foreground mt-1">
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
