"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/programs", label: "Programs" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/#contact", label: "Contact" },
];

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[#0f172a]">
      {/* Navigation Header */}
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-8">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/ym-logo-symbol.svg"
              alt="YM Movement"
              width={73}
              height={40}
              className="h-9 w-auto"
              priority
            />
          </Link>

          {/* Center: Navigation Links (Desktop) */}
          <nav className="hidden md:block">
            <ul className="flex gap-8 items-center">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "font-medium transition-colors hover:text-[#0891b2]",
                      pathname === link.href
                        ? "text-[#0891b2]"
                        : "text-slate-500",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right: Auth Buttons & Mobile Menu */}
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="hidden md:block text-[#1a3a5c] font-bold px-4 py-2 rounded-lg hover:text-[#0891b2] transition-colors active:scale-95 duration-200"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="hidden sm:block bg-[#1a3a5c] text-white font-bold px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors active:scale-95 duration-200"
            >
              Get Started
            </Link>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-slate-600 hover:text-slate-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <nav className="mx-auto max-w-7xl px-6 py-4">
              <div className="flex flex-col space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "font-medium transition-colors py-2",
                      pathname === link.href
                        ? "text-[#0891b2]"
                        : "text-slate-500 hover:text-[#0891b2]",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <Link
                    href="/auth/login"
                    className="flex-1 text-center text-[#1a3a5c] font-bold px-4 py-2 rounded-lg border border-slate-200"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="flex-1 text-center bg-[#1a3a5c] text-white font-bold px-4 py-2 rounded-lg"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-20">{children}</main>

      {/* Footer — dark luxury */}
      <footer
        className="w-full py-16 px-6 md:px-8 border-t border-white/10 bg-[#1a3a5c]"
        id="contact"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-7xl mx-auto text-sm">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/ym-logo-full.svg"
                alt="YM Movement"
                width={6053}
                height={3654}
                className="h-10 w-auto brightness-0 invert"
              />
            </Link>
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
                <Link href="/about" className="text-slate-300 hover:text-cyan-400 transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/programs" className="text-slate-300 hover:text-cyan-400 transition-colors">
                  Programs
                </Link>
              </li>
              <li>
                <Link href="/testimonials" className="text-slate-300 hover:text-cyan-400 transition-colors">
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
                <Link href="/privacy" className="text-slate-300 hover:text-cyan-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-300 hover:text-cyan-400 transition-colors">
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
