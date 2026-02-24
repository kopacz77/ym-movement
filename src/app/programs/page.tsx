"use client";

import { ArrowLeft, Calendar, Play, Trophy, Users, Video } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { VideoModal } from "@/components/public/VideoModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Types
interface AthleteVideo {
  id: string;
  title: string; // e.g., "Short Program", "Free Dance", "Exhibition"
  year: number;
  competition?: string; // e.g., "Nationals", "Grand Prix", "Worlds"
  videoUrl: string;
  thumbnail?: string;
}

interface Athlete {
  id: number;
  name: string;
  discipline: string; // e.g., "Ice Dance", "Singles", "Pairs"
  photo: string;
  bio?: string;
  videos: AthleteVideo[];
  imagePosition?: "top" | "center" | "bottom"; // Control how the photo is cropped
}

// Athlete data with real YouTube links
const athletes: Athlete[] = [
  {
    id: 1,
    name: "Hannah Kim",
    discipline: "Solo Ice Dance",
    photo: "/images/athletes/hannah-kim.jpeg",
    imagePosition: "top",
    bio: "Multi-season solo ice dancer with programs choreographed by Yura from 2022-2025.",
    videos: [
      {
        id: "1-1",
        title: "Rhythm Dance",
        year: 2025,
        videoUrl: "https://www.youtube.com/watch?v=jK-WW9NpRc4",
      },
      {
        id: "1-2",
        title: "Free Dance",
        year: 2025,
        videoUrl: "https://www.youtube.com/watch?v=7a6jROcdNEg",
      },
      {
        id: "1-3",
        title: "Rhythm Dance",
        year: 2024,
        videoUrl: "https://www.youtube.com/watch?v=NjXx5G4MYu0",
      },
      {
        id: "1-4",
        title: "Free Dance",
        year: 2024,
        videoUrl: "https://www.youtube.com/watch?v=d-3ZVf368yE",
      },
      {
        id: "1-5",
        title: "Rhythm Dance",
        year: 2023,
        videoUrl: "https://www.youtube.com/watch?v=eVHvBt2nTF0",
      },
      {
        id: "1-6",
        title: "Free Dance",
        year: 2023,
        videoUrl: "https://www.youtube.com/watch?v=gl-HaMjoPsQ",
      },
      {
        id: "1-7",
        title: "Rhythm Dance",
        year: 2022,
        videoUrl: "https://www.youtube.com/watch?v=-mN93wW3YEQ",
      },
      {
        id: "1-8",
        title: "Free Dance",
        year: 2022,
        videoUrl: "https://www.youtube.com/watch?v=Kqc_L-nlR9k",
      },
    ],
  },
  {
    id: 2,
    name: "Qihan Zhao",
    discipline: "Singles",
    photo: "/images/athletes/qihan-zhao.jpeg",
    videos: [
      {
        id: "2-1",
        title: "Short Program",
        year: 2025,
        videoUrl: "https://www.youtube.com/watch?v=IQv8YRXFf7M",
      },
      {
        id: "2-2",
        title: "Long Program",
        year: 2025,
        videoUrl: "https://www.youtube.com/watch?v=TAipSyvZ6jA",
      },
    ],
  },
  {
    id: 3,
    name: "Krystal Yeuk Kwan Zhu",
    discipline: "Singles",
    photo: "/images/athletes/krystal-zhu.jpeg",
    bio: "Junior level competitor.",
    videos: [
      {
        id: "3-1",
        title: "Junior Short Program",
        year: 2025,
        videoUrl: "https://www.youtube.com/watch?v=LwaKkS6_q2A",
      },
      {
        id: "3-2",
        title: "Junior Long Program",
        year: 2025,
        videoUrl: "https://www.youtube.com/watch?v=vH4oTYPmGNE",
      },
    ],
  },
  {
    id: 4,
    name: "Candice Leung",
    discipline: "Singles",
    photo: "/images/athletes/candice-leung.jpeg",
    bio: "Novice level competitor.",
    videos: [
      {
        id: "4-1",
        title: "Short Program",
        year: 2025,
        videoUrl: "https://www.youtube.com/watch?v=4VLeVLM6Ing",
      },
      {
        id: "4-2",
        title: "Novice Free Skate",
        year: 2025,
        videoUrl: "https://www.youtube.com/watch?v=z-Y2I5oTIUk",
      },
    ],
  },
  {
    id: 5,
    name: "Anastasia Balinsky",
    discipline: "Singles",
    photo: "/images/athletes/anastasia-balinsky.jpeg",
    bio: "Novice level competitor.",
    videos: [
      {
        id: "5-1",
        title: "Novice Short Program",
        year: 2025,
        videoUrl: "https://www.youtube.com/watch?v=KJ1NhV7995o",
      },
      {
        id: "5-2",
        title: "Novice Free Skate",
        year: 2025,
        videoUrl: "https://www.youtube.com/watch?v=IuTBDlhNS2w",
      },
    ],
  },
  {
    id: 6,
    name: "Iris Huang",
    discipline: "Singles",
    photo: "/images/athletes/iris-huang.jpeg",
    bio: "Progressing from Juvenile to Intermediate level.",
    videos: [
      {
        id: "6-1",
        title: "Intermediate Free Skate",
        year: 2025,
        videoUrl: "https://www.youtube.com/watch?v=kxp7Th_qAZM",
      },
      {
        id: "6-2",
        title: "Juvenile Free Skate",
        year: 2024,
        videoUrl: "https://www.youtube.com/watch?v=zrcN66mQmpg",
      },
    ],
  },
  {
    id: 7,
    name: "Allison Yoon",
    discipline: "Singles",
    photo: "/images/athletes/allison-yoon.jpeg",
    bio: "Rising skater progressing through the levels.",
    videos: [
      {
        id: "7-1",
        title: "Juvenile Free Skate",
        year: 2025,
        videoUrl: "https://www.youtube.com/watch?v=_2bLOinIaMM",
      },
      {
        id: "7-2",
        title: "Preliminary Free Skate",
        year: 2024,
        videoUrl: "https://www.youtube.com/watch?v=x_ChJB0IzN4",
      },
      {
        id: "7-3",
        title: "Pre-Preliminary Free Skate",
        year: 2023,
        videoUrl: "https://www.youtube.com/watch?v=Srt0oAa7RVI",
      },
    ],
  },
  {
    id: 8,
    name: "Chelsea Liu & Ryan Bedard",
    discipline: "Pairs",
    photo: "/images/athletes/chelsea-liu_ryan-bedard.jpeg",
    bio: "Pairs team coached by Yura Min.",
    videos: [
      {
        id: "8-1",
        title: "Pairs Performance",
        year: 2025,
        videoUrl: "https://www.youtube.com/watch?v=_XB11lm8dlU&t=52s",
      },
    ],
  },
  {
    id: 9,
    name: "Katie McBeath & Daniil Parkman",
    discipline: "Pairs",
    photo: "/images/athletes/katie-mcbeath_daniil-parkman.jpeg",
    bio: "Pairs team coached by Yura Min.",
    videos: [
      {
        id: "9-1",
        title: "Pairs Performance",
        year: 2025,
        videoUrl: "https://www.youtube.com/watch?v=y4KWwWKpDCw",
      },
    ],
  },
  {
    id: 10,
    name: "Ice Explosion 2023",
    discipline: "Group Choreography",
    photo: "/images/athletes/black-pink.jpeg",
    bio: "Group choreography created by Yura Min for the Ice Explosion 2023 event.",
    videos: [
      {
        id: "9-1",
        title: "Group Performance",
        year: 2023,
        videoUrl: "https://www.youtube.com/watch?v=X6jCOZGm4ys",
      },
    ],
  },
];

// Helper to group videos by year
function groupVideosByYear(videos: AthleteVideo[]) {
  const grouped: Record<number, AthleteVideo[]> = {};
  for (const video of videos) {
    if (!grouped[video.year]) {
      grouped[video.year] = [];
    }
    grouped[video.year].push(video);
  }
  // Sort years descending
  return Object.entries(grouped)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([year, vids]) => ({ year: Number(year), videos: vids }));
}

function AthleteCard({ athlete, onClick }: { athlete: Athlete; onClick: () => void }) {
  const [imageError, setImageError] = useState(false);
  const videoCount = athlete.videos.length;

  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left rounded-xl overflow-hidden bg-white border border-gray-200/60 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[3/4] w-full bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-10 h-10 text-primary/40" />
              </div>
              <p className="text-xs text-muted-foreground px-4">Athlete Photo</p>
            </div>
          </div>
        ) : (
          <Image
            src={athlete.photo}
            alt={athlete.name}
            fill
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              athlete.imagePosition === "top"
                ? "object-top"
                : athlete.imagePosition === "center"
                  ? "object-center"
                  : "object-bottom"
            }`}
            onError={() => setImageError(true)}
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors duration-300">
          <div className="text-center transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <div className="w-14 h-14 mx-auto rounded-full bg-white/90 flex items-center justify-center shadow-lg mb-2">
              <Video className="w-7 h-7 text-primary" />
            </div>
            <span className="text-white text-sm font-medium">
              View {videoCount} Video{videoCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Video count badge */}
        <div className="absolute top-3 right-3 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
          <Play className="w-3 h-3" />
          {videoCount}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {athlete.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{athlete.discipline}</p>
      </div>
    </button>
  );
}

function AthleteDetailModal({
  athlete,
  isOpen,
  onClose,
  onPlayVideo,
}: {
  athlete: Athlete;
  isOpen: boolean;
  onClose: () => void;
  onPlayVideo: (video: AthleteVideo) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const groupedVideos = groupVideosByYear(athlete.videos);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{athlete.name} - Videos</DialogTitle>
        </DialogHeader>

        {/* Athlete header */}
        <div className="flex items-start gap-4 pb-4 border-b">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0">
            {imageError ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary/40" />
              </div>
            ) : (
              <Image
                src={athlete.photo}
                alt={athlete.name}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground">{athlete.name}</h2>
            <p className="text-sm text-primary font-medium">{athlete.discipline}</p>
            {athlete.bio && <p className="text-sm text-muted-foreground mt-2">{athlete.bio}</p>}
            <p className="text-xs text-muted-foreground mt-2">
              {athlete.videos.length} program{athlete.videos.length !== 1 ? "s" : ""} choreographed
              by Yura Min
            </p>
          </div>
        </div>

        {/* Videos by year */}
        <div className="space-y-6 mt-4">
          {groupedVideos.map(({ year, videos }) => (
            <div key={year}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                {year} Season
              </h3>
              <div className="grid gap-2">
                {videos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => onPlayVideo(video)}
                    className="group flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-primary/10 transition-colors text-left w-full"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Play className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {video.title}
                      </p>
                      {video.competition && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          {video.competition}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                      Watch →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Close button */}
        <div className="mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Athletes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProgramsPage() {
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [playingVideo, setPlayingVideo] = useState<{
    video: AthleteVideo;
    athleteName: string;
  } | null>(null);

  // Filter out athletes without a name or without any videos
  const visibleAthletes = athletes.filter(
    (athlete) =>
      athlete.name &&
      athlete.name.trim() !== "" &&
      !athlete.name.toLowerCase().includes("athlete name") &&
      athlete.videos &&
      athlete.videos.length > 0 &&
      athlete.videos.some((v) => v.videoUrl && v.videoUrl.trim() !== "")
  );

  const handlePlayVideo = (video: AthleteVideo) => {
    if (selectedAthlete) {
      setPlayingVideo({ video, athleteName: selectedAthlete.name });
    }
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Play className="w-4 h-4 mr-2" />
            Choreography Showcase
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-6">
            Programs by Yura Min
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore the competitive routines and exhibition programs choreographed by Yura Min.
            Click on any athlete to view their complete video library.
          </p>
        </div>
      </section>

      {/* Athlete Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {visibleAthletes.map((athlete) => (
              <AthleteCard
                key={athlete.id}
                athlete={athlete}
                onClick={() => setSelectedAthlete(athlete)}
              />
            ))}
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Want Yura to Choreograph Your Program?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Join YM Movement and work with Yura to create a custom program that showcases your
            unique style and abilities.
          </p>
          <a
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Sign Up Today
          </a>
        </div>
      </section>

      {/* Athlete Detail Modal */}
      {selectedAthlete && (
        <AthleteDetailModal
          athlete={selectedAthlete}
          isOpen={!!selectedAthlete}
          onClose={() => setSelectedAthlete(null)}
          onPlayVideo={handlePlayVideo}
        />
      )}

      {/* Video Player Modal */}
      {playingVideo && (
        <VideoModal
          isOpen={!!playingVideo}
          onClose={() => setPlayingVideo(null)}
          videoUrl={playingVideo.video.videoUrl}
          title={`${playingVideo.athleteName} - ${playingVideo.video.title} (${playingVideo.video.year})`}
        />
      )}
    </PublicLayout>
  );
}
