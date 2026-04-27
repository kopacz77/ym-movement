import { Calendar, Medal, TrendingUp } from "lucide-react";
import Link from "next/link";
import { HeroSection } from "@/components/landing/HeroSection";
import { PublicLayout } from "@/components/public/PublicLayout";

export default function LandingPage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <HeroSection />

        {/* Why Train With Us */}
        <section className="py-24 bg-[#0f172a] relative">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-cyan-400 mb-2">
                The Advantage
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Why Train With Us
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Olympic Experience */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 hover:-translate-y-2 transition-transform duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-6">
                  <Medal className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4 tracking-tight">
                  Olympic Experience
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Direct mentorship from an Olympic athlete, bringing world-stage insights and
                  rigorous training methodologies to your practice.
                </p>
              </div>

              {/* Flexible Scheduling */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 hover:-translate-y-2 transition-transform duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6">
                  <Calendar className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4 tracking-tight">
                  Flexible Scheduling
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Adaptive lesson planning that works around your competitive season and personal
                  commitments without compromising intensity.
                </p>
              </div>

              {/* Progress Tracking */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 hover:-translate-y-2 transition-transform duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-6">
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4 tracking-tight">
                  Progress Tracking
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Data-driven performance analysis focusing on technical precision, edge quality,
                  and artistic development over time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-[#0f172a] relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />
          <div className="relative max-w-3xl mx-auto px-6 md:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              Ready to Elevate Your Ice Dancing?
            </h2>
            <p className="text-lg text-slate-300 mb-10 max-w-xl mx-auto">
              Join our community of dedicated skaters and start your journey toward excellence
              today.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center bg-gradient-to-r from-cyan-500 to-[#0891b2] text-white font-bold px-8 py-4 rounded-lg hover:scale-105 transition-all duration-200 shadow-[0_0_20px_rgba(8,145,178,0.4)]"
            >
              Sign Up Now
            </Link>
          </div>
        </section>
    </PublicLayout>
  );
}
