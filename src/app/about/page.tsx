import { Award, Heart, Medal, Star, Target, Users } from "lucide-react";
import Image from "next/image";
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
      <section className="relative py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Photo */}
            <div className="relative order-2 lg:order-1">
              <div className="relative aspect-[4/5] w-full max-w-md mx-auto overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-2xl">
                {/* Placeholder for Yura's photo */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-16 h-16 text-primary/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">Photo of Yura Min</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      (Replace with actual image)
                    </p>
                  </div>
                </div>
                {/* Uncomment and update when you have the actual image:
                <Image
                  src="/images/yura-min.jpg"
                  alt="Yura Min - Olympic Ice Dancer"
                  fill
                  className="object-cover"
                  priority
                />
                */}
              </div>
              {/* Decorative elements */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
              <div className="absolute -top-4 -left-4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            {/* Bio intro */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                <Medal className="w-4 h-4 mr-2" />
                Olympic Ice Dancer
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl mb-6">
                Yura Min
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                A world-renowned ice dancer who represented South Korea at the Winter Olympics, Yura
                brings her passion for skating excellence to every student she coaches.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 text-primary" />
                  <span>Olympic Athlete</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Award className="w-4 h-4 text-primary" />
                  <span>World Competitor</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="w-4 h-4 text-primary" />
                  <span>Dedicated Coach</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">The Journey</h2>
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
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
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="py-20 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
            Achievements & Credentials
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                icon: Medal,
                title: "Olympic Competitor",
                description: "Represented South Korea at the Winter Olympics in ice dance",
              },
              {
                icon: Award,
                title: "World Championships",
                description: "Multiple appearances at ISU World Figure Skating Championships",
              },
              {
                icon: Star,
                title: "Four Continents",
                description: "Competed at Four Continents Figure Skating Championships",
              },
              {
                icon: Target,
                title: "Grand Prix Circuit",
                description: "Competed on the ISU Grand Prix of Figure Skating circuit",
              },
              {
                icon: Users,
                title: "Certified Coach",
                description: "Professional coaching certification with years of experience",
              },
              {
                icon: Heart,
                title: "Choreographer",
                description: "Creates award-winning programs for competitive skaters",
              },
            ].map((achievement, index) => (
              <div
                key={index}
                className="rounded-xl bg-white border border-gray-200/60 p-6 shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <achievement.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{achievement.title}</h3>
                <p className="text-sm text-muted-foreground">{achievement.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-8">Coaching Philosophy</h2>
            <blockquote className="text-2xl font-medium text-foreground italic mb-8">
              &ldquo;Every skater has a unique voice waiting to be heard on the ice. My job is to
              help them find it and express it beautifully.&rdquo;
            </blockquote>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Yura&apos;s coaching approach combines rigorous technical training with artistic
              development. She believes in building strong fundamentals while nurturing each
              skater&apos;s individual style and expression. Her programs are designed to challenge,
              inspire, and bring out the best in every student.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Train with Yura?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Take the first step in your skating journey. Sign up to book lessons and start training
            with an Olympic athlete.
          </p>
          <a
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Get Started Today
          </a>
        </div>
      </section>
    </PublicLayout>
  );
}
