import { Calendar, Medal, TrendingUp } from "lucide-react";
import Link from "next/link";
import { HeroSection } from "@/components/landing/HeroSection";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation Header */}
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between px-6 md:px-8 h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        {/* Left: Wordmark */}
        <Link
          href="/"
          className="text-xl font-black text-[#1a3a5c] tracking-tight"
        >
          YM Movement
        </Link>

        {/* Center: Navigation Links */}
        <ul className="hidden md:flex gap-8 items-center">
          <li>
            <Link
              href="/about"
              className="text-slate-500 font-medium hover:text-[#0891b2] transition-colors"
            >
              About
            </Link>
          </li>
          <li>
            <Link
              href="/programs"
              className="text-slate-500 font-medium hover:text-[#0891b2] transition-colors"
            >
              Programs
            </Link>
          </li>
          <li>
            <Link
              href="/testimonials"
              className="text-slate-500 font-medium hover:text-[#0891b2] transition-colors"
            >
              Testimonials
            </Link>
          </li>
          <li>
            <Link
              href="#contact"
              className="text-slate-500 font-medium hover:text-[#0891b2] transition-colors"
            >
              Contact
            </Link>
          </li>
        </ul>

        {/* Right: Auth buttons */}
        <div className="flex gap-3">
          <Link
            href="/auth/login"
            className="hidden md:block text-[#1a3a5c] font-bold px-4 py-2 rounded-lg hover:text-[#0891b2] transition-colors active:scale-95 duration-200"
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="bg-[#1a3a5c] text-white font-bold px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors active:scale-95 duration-200"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
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
                  Data-driven performance analysis focusing on technical precision, edge quality, and
                  artistic development over time.
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
      </main>

      {/* Footer */}
      <footer className="w-full py-16 px-6 md:px-8 border-t border-white/10 bg-[#1a3a5c]" id="contact">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-7xl mx-auto text-sm">
          <div className="col-span-2 md:col-span-1">
            <div className="text-2xl font-black tracking-tighter text-white mb-4">
              YM Movement
            </div>
            <p className="text-slate-300 mt-4 leading-relaxed">
              Elite figure skating coaching platform founded by Olympic athlete Yura Min. Precision
              in Motion.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 tracking-wider uppercase text-xs">
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-slate-300 hover:text-cyan-400 transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/programs"
                  className="text-slate-300 hover:text-cyan-400 transition-colors"
                >
                  Programs
                </Link>
              </li>
              <li>
                <Link
                  href="/testimonials"
                  className="text-slate-300 hover:text-cyan-400 transition-colors"
                >
                  Testimonials
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 tracking-wider uppercase text-xs">
              Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-slate-300 hover:text-cyan-400 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-slate-300 hover:text-cyan-400 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 tracking-wider uppercase text-xs">
              Contact
            </h4>
            <address className="not-italic text-slate-300">
              <p>Email: info@ym-movement.com</p>
            </address>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 text-slate-400 text-xs text-center">
          © {new Date().getFullYear()} YM Movement. Precision in Motion.
        </div>
      </footer>
    </div>
  );
}
