// src/features/student/components/dashboard/OutstandingPayments.tsx
"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";

export function OutstandingPayments() {
  const { id: studentId } = useCurrentUser();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);

  const { data: lessons } = api.student.profile.getStudentLessons.useQuery(
    { studentId },
    { enabled: isReady && !!studentId, retry: false },
  );

  const pendingPayments = useMemo(() => {
    if (!lessons) return [];
    return lessons.filter((lesson) => lesson.Payment?.status === "PENDING");
  }, [lessons]);

  const pendingTotal = pendingPayments.reduce(
    (sum, p) => sum + (p.Payment?.amount || 0),
    0,
  );

  if (!isReady || pendingPayments.length === 0) {
    return null;
  }

  return (
    <Link href="/student/payments">
      <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100">
                <AlertCircle className="h-4 w-4 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {pendingPayments.length} outstanding {pendingPayments.length === 1 ? "payment" : "payments"}
                </p>
                <p className="text-xs text-amber-600/80">Tap to view details</p>
              </div>
            </div>
            <p className="text-lg font-bold text-amber-700">${pendingTotal.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
