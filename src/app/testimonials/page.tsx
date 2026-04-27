import { MessageSquareQuote } from "lucide-react";
import Link from "next/link";
import { PublicLayout } from "@/components/public/PublicLayout";

export const metadata = {
  title: "Testimonials | YM Movement",
  description:
    "Hear from students, parents, and fellow coaches about their experience training with Yura Min.",
};

export default function TestimonialsPage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="py-24 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 text-center">
          <div className="inline-flex items-center rounded-full bg-cyan-500/10 px-4 py-1.5 text-sm font-medium text-cyan-400 mb-6">
            <MessageSquareQuote className="w-4 h-4 mr-2" />
            What People Say
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-6">
            Testimonials
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Hear from students, parents, and fellow coaches about their experience training with
            Yura Min.
          </p>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-24 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500/20">
              <MessageSquareQuote className="h-10 w-10 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Coming Soon</h2>
            <p className="text-slate-400">
              We&apos;re gathering testimonials from our amazing community of skaters, parents, and
              coaches. Check back soon to hear their stories!
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#0f172a] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-6 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to Start Your Journey?
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-xl mx-auto">
            Join the YM Movement community and experience Olympic-level coaching for yourself.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center bg-gradient-to-r from-cyan-500 to-[#0891b2] text-white font-bold px-8 py-4 rounded-lg hover:scale-105 transition-all duration-200 shadow-[0_0_20px_rgba(8,145,178,0.4)]"
          >
            Sign Up Today
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
