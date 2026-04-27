import { Award, Compass, Dumbbell, Medal, Sparkles, Target } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PublicLayout } from "@/components/public/PublicLayout";

export const metadata = {
  title: "About Yura Min | YM Movement",
  description:
    "Learn about Yura Min, Olympic ice dancer and elite coach dedicated to developing the next generation of skating champions.",
};

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* Hero Section - Text left, skating photo right with left-edge fade */}
      <section className="relative aspect-[1.6/1] md:aspect-[1.9/1] bg-[#0f172a] flex items-center overflow-hidden">
        {/* Skating photo positioned on the right, fading into background on left */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image
            src="/images/yura-dynamic-upscaled.png"
            alt="Yura Min in skating position"
            fill
            className="object-cover object-bottom"
            priority
          />
          {/* Left side fade — hides partner completely */}
          <div className="absolute inset-y-0 left-0 w-[60%] bg-gradient-to-r from-[#0f172a] from-40% via-[#0f172a]/95 to-transparent z-10" />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-[15%] bg-gradient-to-t from-[#0f172a] to-transparent z-10" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 w-full">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            About Yura Min
          </h1>
          <p className="text-xl md:text-2xl text-slate-200 max-w-2xl leading-relaxed">
            Two-time Olympic Ice Dancer redefining high-performance coaching through precision,
            artistry, and unwavering resilience.
          </p>
        </div>
      </section>

      {/* Bio Section */}
      <section className="py-24 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-cyan-400 mb-4">
                The Journey
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-8">
                From Olympic Ice to Elite Coaching
              </h2>
              <div className="space-y-6 text-slate-300 leading-relaxed">
                <p>
                  Yura Min&apos;s journey to the Olympics was defined by a relentless pursuit of
                  perfection and an unyielding competitive spirit. Representing South Korea at the
                  2018 PyeongChang Winter Olympics, she captured the hearts of millions with her
                  dynamic presence and technical prowess on the ice.
                </p>
                <p>
                  Following her competitive career, Yura identified a critical gap in
                  high-performance figure skating training. She founded YM Movement to bridge the
                  technical demands of elite skating with the athletic conditioning required to
                  sustain it.
                </p>
                <p>
                  Today, YM Movement is more than a coaching program; it is a philosophy. We train
                  athletes to move with intention, bridging the gap between raw athleticism and
                  refined artistry.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-transform duration-300">
                <Image
                  src="/images/yura-min1.jpeg"
                  alt="Portrait of Yura Min"
                  fill
                  className="object-cover object-top"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Olympic Credentials */}
      <section className="py-24 bg-[#0f172a] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-cyan-400 mb-2">
              Elite Pedigree
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Proven on the World Stage
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Credential Card 1 */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 hover:-translate-y-2 transition-transform duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6">
                <Medal className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                Two-Time Olympian
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Represented South Korea at the highest level of international competition, including
                the historic 2018 PyeongChang Games.
              </p>
            </div>
            {/* Credential Card 2 */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 hover:-translate-y-2 transition-transform duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-6">
                <Award className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                World Championships
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Consistent top-tier performances at the ISU World Figure Skating Championships
                against the globe&apos;s elite dancers.
              </p>
            </div>
            {/* Credential Card 3 */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 hover:-translate-y-2 transition-transform duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                Four Continents
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Multiple appearances and distinguished rankings at the prestigious Four Continents
                Figure Skating Championships.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Coaching Philosophy - 3 Pillar Cards */}
      <section className="py-24 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-cyan-400 mb-2">
              The YM Method
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Our Coaching Philosophy
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Pillar 1 - Precision */}
            <div className="relative overflow-hidden bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 hover:-translate-y-2 transition-transform duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.2)] group">
              <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
                <Compass className="h-24 w-24 text-white" />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white tracking-tight mb-4">Precision</h3>
                <p className="text-slate-400 leading-relaxed">
                  Meticulous breakdown of biomechanics. We focus on blade mastery, edge quality, and
                  the physics of jumping and spinning to build an unbreakable technical foundation.
                </p>
              </div>
            </div>
            {/* Pillar 2 - Artistry */}
            <div className="relative overflow-hidden bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 hover:-translate-y-2 transition-transform duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.2)] group">
              <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
                <Sparkles className="h-24 w-24 text-white" />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-cyan-400 tracking-tight mb-4">Artistry</h3>
                <p className="text-slate-400 leading-relaxed">
                  Translating movement into emotion. We cultivate musicality, choreographic
                  expression, and the commanding ice presence required to captivate judges and
                  audiences alike.
                </p>
              </div>
            </div>
            {/* Pillar 3 - Resilience */}
            <div className="relative overflow-hidden bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 hover:-translate-y-2 transition-transform duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.2)] group">
              <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
                <Dumbbell className="h-24 w-24 text-white" />
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-purple-400 tracking-tight mb-4">
                  Resilience
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Mental fortitude and athletic conditioning. We train athletes to withstand the
                  rigorous demands of elite competition, focusing on injury prevention and peak
                  performance mindset.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#0f172a] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-6 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to Train with Yura?
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-xl mx-auto">
            Take the first step in your skating journey. Sign up to book lessons and start training
            with an Olympic athlete.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center bg-gradient-to-r from-cyan-500 to-[#0891b2] text-white font-bold px-8 py-4 rounded-lg hover:scale-105 transition-all duration-200 shadow-[0_0_20px_rgba(8,145,178,0.4)]"
          >
            Get Started Today
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
