"use client";

import Link from "next/link";
import { PublicLayout } from "@/components/public/PublicLayout";

export function PoliciesContent() {
  return (
    <PublicLayout>
      <section className="py-24 bg-[#0f172a]">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-4">Lesson Policies</h1>
          <p className="text-slate-400 text-sm mb-12">Last Updated: March 2026</p>

          <div className="space-y-10 text-slate-300 leading-relaxed">
            <div>
              <h2 className="text-xl font-semibold text-white mb-3">Cancellation Policy</h2>
              <ul className="space-y-2 text-slate-400">
                <li>Lessons may be cancelled at any time before the scheduled start.</li>
                <li>
                  Cancellations made{" "}
                  <span className="font-medium text-slate-300">more than 24 hours</span> before the
                  lesson are free of charge.
                </li>
                <li>
                  Cancellations made{" "}
                  <span className="font-medium text-slate-300">within 24 hours</span> of the lesson
                  are considered late cancellations. You will be{" "}
                  <span className="font-medium text-slate-300">
                    responsible for the full lesson fee
                  </span>
                  .
                </li>
                <li>
                  To cancel a lesson, use the Cancel button on your lesson card or lesson details
                  page in the student portal.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">Payment Policy</h2>
              <ul className="space-y-2 text-slate-400">
                <li>Payment is expected for each scheduled lesson.</li>
                <li>Accepted payment methods: Venmo, Zelle, and Cash.</li>
                <li>
                  A payment reference code is provided after booking — include it with your payment
                  for tracking purposes.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-3">Booking Policy</h2>
              <ul className="space-y-2 text-slate-400">
                <li>Lessons are booked on a first-come, first-served basis.</li>
                <li>You may only book available time slots shown on the booking page.</li>
                <li>
                  If you need to switch lesson times, cancel the current lesson and book a new
                  available slot.
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-sm text-slate-500 mb-4">
              Questions about our policies? Contact your coach directly or reach out through the
              student portal.
            </p>
            <Link
              href="/auth/signup"
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              &larr; Back to Sign Up
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
