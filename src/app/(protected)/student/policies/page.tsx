import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Lesson Policies",
  description: "Cancellation, payment, and booking policies for YM Movement",
};

export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Lesson Policies</h1>

      <Card>
        <CardContent className="py-6 space-y-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#0891b2]" />
            <h2 className="text-lg font-semibold">YM Movement Policies</h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-base">Cancellation Policy</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1.5">
                <li>Lessons may be cancelled at any time before the scheduled start.</li>
                <li>
                  Cancellations made <span className="font-medium">more than 24 hours</span> before
                  the lesson are free of charge.
                </li>
                <li>
                  Cancellations made <span className="font-medium">within 24 hours</span> of the
                  lesson are considered late cancellations. You will be{" "}
                  <span className="font-medium">responsible for the full lesson fee</span>.
                </li>
                <li>
                  To cancel a lesson, use the <span className="font-medium">Cancel</span> button on
                  your lesson card or lesson details page.
                </li>
              </ul>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-base">Payment Policy</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1.5">
                <li>Payment is expected for each scheduled lesson.</li>
                <li>Accepted payment methods: Venmo, Zelle, and Cash.</li>
                <li>
                  Your payment reference code is provided after booking — include it with your
                  payment for tracking purposes.
                </li>
              </ul>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold text-base">Booking Policy</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1.5">
                <li>Lessons are booked on a first-come, first-served basis.</li>
                <li>You may only book available time slots shown on the booking page.</li>
                <li>
                  If you need to switch lesson times, cancel the current lesson and book a new
                  available slot.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
