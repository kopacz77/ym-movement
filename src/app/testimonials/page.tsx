"use client";

import { MessageSquareQuote, Play, Quote, Star, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { VideoModal } from "@/components/public/VideoModal";

// Types
interface TextTestimonial {
  id: number;
  type: "text";
  name: string;
  role: string;
  quote: string;
  photo: string;
  rating?: number;
}

interface VideoTestimonial {
  id: number;
  type: "video";
  name: string;
  role: string;
  thumbnail: string;
  videoUrl: string;
  previewQuote: string;
}

type Testimonial = TextTestimonial | VideoTestimonial;

// Placeholder testimonial data - replace with real testimonials
const testimonials: Testimonial[] = [
  {
    id: 1,
    type: "text",
    name: "Parent Name 1",
    role: "Parent of Competitive Skater",
    quote:
      "Yura has transformed my daughter's skating. Her attention to detail and artistic vision have brought out abilities we didn't know existed. The improvement in just six months has been incredible.",
    photo: "/images/testimonials/person-1.jpg",
    rating: 5,
  },
  {
    id: 2,
    type: "video",
    name: "Skater Name 1",
    role: "Competitive Ice Dancer",
    thumbnail: "/images/testimonials/video-1.jpg",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    previewQuote: "Working with Yura changed everything for me...",
  },
  {
    id: 3,
    type: "text",
    name: "Adult Student",
    role: "Adult Beginner Skater",
    quote:
      "I started skating at 35 and was nervous about taking lessons. Yura made me feel welcome and never rushed me. Her patience and expertise helped me achieve goals I never thought possible.",
    photo: "/images/testimonials/person-2.jpg",
    rating: 5,
  },
  {
    id: 4,
    type: "text",
    name: "Parent Name 2",
    role: "Parent of Junior Skater",
    quote:
      "The choreography Yura created for my son's program was stunning. The judges commented on how mature and artistic it was. She truly understands how to highlight each skater's strengths.",
    photo: "/images/testimonials/person-3.jpg",
    rating: 5,
  },
  {
    id: 5,
    type: "video",
    name: "Skater Name 2",
    role: "National Competitor",
    thumbnail: "/images/testimonials/video-2.jpg",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    previewQuote: "The programs Yura choreographed took me to nationals...",
  },
  {
    id: 6,
    type: "text",
    name: "Fellow Coach",
    role: "Skating Coach",
    quote:
      "I've referred several of my students to Yura for choreography work. Her Olympic experience and artistic sensibility bring a level of professionalism that elevates every program she creates.",
    photo: "/images/testimonials/person-4.jpg",
    rating: 5,
  },
  {
    id: 7,
    type: "text",
    name: "Parent Name 3",
    role: "Parent of Teen Skater",
    quote:
      "Yura's scheduling system makes it so easy to book lessons. But more importantly, she genuinely cares about each student's progress. My daughter looks forward to every session.",
    photo: "/images/testimonials/person-5.jpg",
    rating: 5,
  },
  {
    id: 8,
    type: "video",
    name: "Skater Name 3",
    role: "Junior Competitor",
    thumbnail: "/images/testimonials/video-3.jpg",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    previewQuote: "Yura helped me find my style on the ice...",
  },
  {
    id: 9,
    type: "text",
    name: "Returning Student",
    role: "Former Competitive Skater",
    quote:
      "After a 10-year break from skating, I came back and found Yura. She helped me rebuild my skills with patience and understanding. It's never too late to return to the ice.",
    photo: "/images/testimonials/person-6.jpg",
    rating: 5,
  },
];

function TextTestimonialCard({ testimonial }: { testimonial: TextTestimonial }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="rounded-xl bg-white border border-gray-200/60 p-6 shadow-md hover:shadow-lg transition-shadow h-full flex flex-col">
      {/* Quote icon */}
      <Quote className="w-8 h-8 text-primary/20 mb-4" />

      {/* Quote text */}
      <blockquote className="text-muted-foreground leading-relaxed flex-1 mb-6">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>

      {/* Rating */}
      {testimonial.rating && (
        <div className="flex gap-1 mb-4">
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <Star key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" />
          ))}
        </div>
      )}

      {/* Author */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          {imageError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary/40" />
            </div>
          ) : (
            <Image
              src={testimonial.photo}
              alt={testimonial.name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          )}
        </div>
        <div>
          <p className="font-semibold text-foreground">{testimonial.name}</p>
          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
        </div>
      </div>
    </div>
  );
}

function VideoTestimonialCard({
  testimonial,
  onClick,
}: {
  testimonial: VideoTestimonial;
  onClick: () => void;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl overflow-hidden bg-white border border-gray-200/60 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col"
    >
      {/* Video thumbnail */}
      <div className="relative aspect-video w-full bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MessageSquareQuote className="w-12 h-12 text-primary/40 mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">Video Testimonial</p>
            </div>
          </div>
        ) : (
          <Image
            src={testimonial.thumbnail}
            alt={testimonial.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors duration-300">
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300 shadow-lg">
            <Play className="w-7 h-7 text-primary ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Video label */}
        <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1">
          <Play className="w-3 h-3" />
          Video
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground italic flex-1">
          &ldquo;{testimonial.previewQuote}&rdquo;
        </p>
        <div className="mt-4 pt-4 border-t">
          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {testimonial.name}
          </p>
          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
        </div>
      </div>
    </button>
  );
}

export default function TestimonialsPage() {
  const [selectedVideo, setSelectedVideo] = useState<VideoTestimonial | null>(null);

  const textTestimonials = testimonials.filter((t): t is TextTestimonial => t.type === "text");
  const videoTestimonials = testimonials.filter((t): t is VideoTestimonial => t.type === "video");

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

      {/* Video Testimonials Section */}
      {videoTestimonials.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-2">
              <Play className="w-6 h-6 text-primary" />
              Video Testimonials
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videoTestimonials.map((testimonial) => (
                <VideoTestimonialCard
                  key={testimonial.id}
                  testimonial={testimonial}
                  onClick={() => setSelectedVideo(testimonial)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Text Testimonials Section */}
      <section className="py-16 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-2">
            <Quote className="w-6 h-6 text-primary" />
            What Our Community Says
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {textTestimonials.map((testimonial) => (
              <TextTestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        </div>
      </section>

      {/* Note about placeholders */}
      <section className="py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground bg-muted/50 inline-block px-4 py-2 rounded-lg">
            Note: Replace placeholder data in{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              src/app/testimonials/page.tsx
            </code>{" "}
            with real testimonials, photos, and video links.
          </p>
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

      {/* Video Modal */}
      {selectedVideo && (
        <VideoModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoUrl={selectedVideo.videoUrl}
          title={`${selectedVideo.name} - Testimonial`}
        />
      )}
    </PublicLayout>
  );
}
