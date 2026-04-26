import { Award, Heart, Medal, Star, Target, Users } from "lucide-react";
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
      {/* Hero Section */}
      <section className="relative py-24 bg-[#0f172a]">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Photo */}
            <div className="relative order-2 lg:order-1">
              <div className="relative aspect-[2/3] w-full max-w-md mx-auto overflow-hidden rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <Image
                  src="/images/yura-min1.jpeg"
                  alt="Yura Min - Olympic Ice Dancer"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
              <div className="absolute -top-4 -left-4 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />
            </div>

            {/* Bio intro */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center rounded-full bg-cyan-500/10 px-4 py-1.5 text-sm font-medium text-cyan-400 mb-6">
                <Medal className="w-4 h-4 mr-2" />
                Olympic Ice Dancer
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6">
                Yura Min
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed mb-8">
                A world-renowned ice dancer who represented South Korea at the Winter Olympics, Yura
                brings her passion for skating excellence to every student she coaches.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Star className="w-4 h-4 text-cyan-400" />
                  <span>Olympic Athlete</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <span>World Competitor</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Heart className="w-4 h-4 text-cyan-400" />
                  <span>Dedicated Coach</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-cyan-400 mb-2">
              The Story
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              The Journey
            </h2>
          </div>
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center max-w-6xl mx-auto">
            <div className="space-y-6 text-slate-300 text-lg leading-relaxed">
              <p>
                Yura Min&apos;s skating journey began at a young age, driven by an unwavering
                passion for the artistry and athleticism of ice dance. Her dedication and talent
                propelled her to the international stage, where she competed against the
                world&apos;s best.
              </p>
              <p>
                As a representative of South Korea, Yura achieved the dream of every skater by
                competing at the Winter Olympics. Her performances captivated audiences worldwide,
                showcasing not only technical excellence but also the emotional depth that defines
                great ice dance.
              </p>
              <p>
                Today, Yura channels her competitive experience and artistic vision into coaching
                the next generation of skaters. She believes that every student has the potential
                for greatness, and her mission is to help them discover and develop their unique
                abilities on the ice.
              </p>
            </div>

            <div className="relative">
              <div className="relative aspect-[4/5] w-full max-w-md mx-auto overflow-hidden rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <Image
                  src="/images/yura-min2.jpeg"
                  alt="Yura Min performing on ice"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="py-24 bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-cyan-400 mb-2">
              Credentials
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Achievements
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                icon: Medal,
                title: "Olympic Competitor",
                description: "Represented South Korea at the Winter Olympics in ice dance",
                color: "cyan",
              },
              {
                icon: Award,
                title: "World Championships",
                description: "Multiple appearances at ISU World Figure Skating Championships",
                color: "purple",
              },
              {
                icon: Star,
                title: "Four Continents",
                description: "Competed at Four Continents Figure Skating Championships",
                color: "emerald",
              },
              {
                icon: Target,
                title: "Grand Prix Circuit",
                description: "Competed on the ISU Grand Prix of Figure Skating circuit",
                color: "cyan",
              },
              {
                icon: Users,
                title: "Certified Coach",
                description: "Professional coaching certification with years of experience",
                color: "purple",
              },
              {
                icon: Heart,
                title: "Choreographer",
                description: "Creates award-winning programs for competitive skaters",
                color: "emerald",
              },
            ].map((achievement, index) => {
              const colorMap = {
                cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
                purple: { bg: "bg-purple-500/20", text: "text-purple-400" },
                emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
              };
              const c = colorMap[achievement.color as keyof typeof colorMap];
              return (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 hover:-translate-y-2 transition-transform duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center mb-6`}
                  >
                    <achievement.icon className={`h-6 w-6 ${c.text}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                    {achievement.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">{achievement.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 bg-[#0f172a] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-6 md:px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-cyan-400 mb-2">
            Approach
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-10 tracking-tight">
            Coaching Philosophy
          </h2>
          <blockquote className="text-2xl font-medium text-white italic mb-10 leading-relaxed">
            &ldquo;Every skater has a unique voice waiting to be heard on the ice. My job is to
            help them find it and express it beautifully.&rdquo;
          </blockquote>
          <p className="text-lg text-slate-300 leading-relaxed">
            Yura&apos;s coaching approach combines rigorous technical training with artistic
            development. She believes in building strong fundamentals while nurturing each
            skater&apos;s individual style and expression. Her programs are designed to challenge,
            inspire, and bring out the best in every student.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#0f172a]">
        <div className="max-w-3xl mx-auto px-6 md:px-8 text-center">
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
