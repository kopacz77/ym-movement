import { MessageSquareQuote } from "lucide-react";
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
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <MessageSquareQuote className="w-4 h-4 mr-2" />
            What People Say
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-6">
            Testimonials
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Hear from students, parents, and fellow coaches about their experience training with
            Yura Min.
          </p>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <MessageSquareQuote className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Coming Soon</h2>
            <p className="text-muted-foreground">
              We&apos;re gathering testimonials from our amazing community of skaters, parents, and
              coaches. Check back soon to hear their stories!
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Start Your Journey?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Join the YM Movement community and experience Olympic-level coaching for yourself.
          </p>
          <a
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Sign Up Today
          </a>
        </div>
      </section>
    </PublicLayout>
  );
}
