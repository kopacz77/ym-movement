import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Lesson Policies | YM Movement",
  description: "Cancellation, payment, and booking policies for YM Movement skating lessons",
};

export default function PoliciesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <h1 className="mb-8 text-3xl font-bold">Lesson Policies</h1>

      <div className="prose max-w-none">
        <p className="text-muted-foreground">Last Updated: March 2026</p>

        <h2 className="mt-8 text-xl font-semibold">Cancellation Policy</h2>
        <ul className="mt-2 space-y-2 text-gray-700">
          <li>Lessons may be cancelled at any time before the scheduled start.</li>
          <li>
            Cancellations made <strong>more than 24 hours</strong> before the lesson are free of
            charge.
          </li>
          <li>
            Cancellations made <strong>within 24 hours</strong> of the lesson are considered late
            cancellations. You will be <strong>responsible for the full lesson fee</strong>.
          </li>
          <li>
            To cancel a lesson, use the Cancel button on your lesson card or lesson details page in
            the student portal.
          </li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">Payment Policy</h2>
        <ul className="mt-2 space-y-2 text-gray-700">
          <li>Payment is expected for each scheduled lesson.</li>
          <li>Accepted payment methods: Venmo, Zelle, and Cash.</li>
          <li>
            A payment reference code is provided after booking — include it with your payment for
            tracking purposes.
          </li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">Booking Policy</h2>
        <ul className="mt-2 space-y-2 text-gray-700">
          <li>Lessons are booked on a first-come, first-served basis.</li>
          <li>You may only book available time slots shown on the booking page.</li>
          <li>
            If you need to switch lesson times, cancel the current lesson and book a new available
            slot.
          </li>
        </ul>

        <div className="mt-12 border-t pt-6">
          <p className="text-sm text-muted-foreground">
            Questions about our policies? Contact your coach directly or reach out through the
            student portal.
          </p>
          <p className="mt-4">
            <Link href="/auth/signup" className="text-blue-600 hover:underline">
              &larr; Back to Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
