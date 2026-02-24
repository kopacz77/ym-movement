import { Calendar, ChevronRight, Medal, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation Header */}
      <header className="fixed top-0 z-50 w-full border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Left: Logo */}
          <div>
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-primary">YM</span>
              <span className="text-lg font-semibold">Movement</span>
            </Link>
          </div>

          {/* Center: Navigation Links */}
          <div className="hidden md:block">
            <div className="flex space-x-8">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                About
              </Link>
              <Link
                href="/programs"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Programs
              </Link>
              <Link
                href="/testimonials"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Testimonials
              </Link>
              <Link href="#contact" className="text-sm text-muted-foreground hover:text-foreground">
                Contact
              </Link>
            </div>
          </div>

          {/* Right: Sign In */}
          <div>
            <Button variant="outline" className="mr-2" asChild>
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center pt-32 pb-12">
          <div className="container px-4 text-center">
            <div className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <span>Olympic-level Ice Dance Coaching</span>
            </div>

            <h1 className="mx-auto max-w-[800px] text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Elite Ice Dance Coaching with Yura Min
            </h1>

            <p className="mx-auto mt-6 max-w-[600px] text-lg text-muted-foreground">
              Transform your ice dancing journey with personalized coaching, expert guidance, and a
              supportive community of dedicated skaters.
            </p>

            <div className="mt-10 flex flex-col justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
              <Button size="lg" className="group" asChild>
                <Link href="/auth/signup">
                  Get Started
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/programs">See Our Programs</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/login">Already a Student? Login</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="py-12" id="about">
          <div className="container px-4">
            <h2 className="mb-10 text-center text-3xl font-bold text-foreground">
              Why Train With Us
            </h2>
            <div className="mx-auto grid gap-8 md:grid-cols-3">
              {/* Professional Coaching */}
              <div className="rounded-xl bg-gradient-to-br from-white to-gray-50/30 border border-gray-200/60 p-6 shadow-md hover:shadow-lg transition-shadow">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Medal className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                  Olympic Experience
                </h3>
                <p className="text-muted-foreground">
                  Learn from an Olympic athlete with years of international competitive experience
                  and technical expertise.
                </p>
              </div>

              {/* Flexible Scheduling */}
              <div className="rounded-xl bg-gradient-to-br from-white to-gray-50/30 border border-gray-200/60 p-6 shadow-md hover:shadow-lg transition-shadow">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                  Flexible Scheduling
                </h3>
                <p className="text-muted-foreground">
                  Book lessons that fit your schedule with our easy-to-use platform. Manage your
                  training calendar effortlessly.
                </p>
              </div>

              {/* Progress Tracking */}
              <div className="rounded-xl bg-gradient-to-br from-white to-gray-50/30 border border-gray-200/60 p-6 shadow-md hover:shadow-lg transition-shadow">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-card-foreground">
                  Progress Tracking
                </h3>
                <p className="text-muted-foreground">
                  Monitor your development with detailed progress tracking, personalized feedback,
                  and structured improvement plans.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary/5 py-16">
          <div className="container px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Ready to Elevate Your Ice Dancing?
            </h2>
            <p className="mx-auto mb-8 max-w-[600px] text-muted-foreground">
              Join our community of dedicated skaters and start your journey toward excellence
              today.
            </p>
            <Button size="lg" asChild>
              <Link href="/auth/signup">Sign Up Now</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background py-12" id="contact">
        <div className="container px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h3 className="mb-4 text-lg font-semibold">YM Movement</h3>
              <p className="text-sm text-muted-foreground">
                Professional ice dance coaching and development programs.
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/about" className="hover:text-foreground">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/programs" className="hover:text-foreground">
                    Programs
                  </Link>
                </li>
                <li>
                  <Link href="/testimonials" className="hover:text-foreground">
                    Testimonials
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold">Contact</h4>
              <address className="not-italic text-sm text-muted-foreground">
                <p>Email: info@ym-movement.com</p>
              </address>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} YM Movement. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
