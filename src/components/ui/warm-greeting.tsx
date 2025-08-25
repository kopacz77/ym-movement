"use client";

import { Coffee, Heart, Moon, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface WarmGreetingProps {
  name?: string;
  role?: "admin" | "student";
  className?: string;
}

export function WarmGreeting({ name, role = "student", className }: WarmGreetingProps) {
  const [greeting, setGreeting] = useState("");
  const [icon, setIcon] = useState<React.ReactNode>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();

    if (role === "admin") {
      // Loving messages for the fiancé
      if (hour < 6) {
        setGreeting("Good morning");
        setIcon(<Moon className="h-5 w-5 text-purple-500" />);
      } else if (hour < 12) {
        setGreeting("Good morning");
        setIcon(<Sun className="h-5 w-5 text-yellow-500" />);
      } else if (hour < 17) {
        setGreeting("Good afternoon");
        setIcon(<Coffee className="h-5 w-5 text-amber-600" />);
      } else if (hour < 20) {
        setGreeting("Good evening");
        setIcon(<Sparkles className="h-5 w-5 text-pink-500" />);
      } else {
        setGreeting("Hey there");
        setIcon(<Moon className="h-5 w-5 text-indigo-500" />);
      }
    } else {
      // Professional but warm messages for students
      if (hour < 12) {
        setGreeting("Good morning");
        setIcon(<Sun className="h-5 w-5 text-yellow-500" />);
      } else if (hour < 17) {
        setGreeting("Good afternoon");
        setIcon(<Coffee className="h-5 w-5 text-amber-600" />);
      } else {
        setGreeting("Good evening");
        setIcon(<Sparkles className="h-5 w-5 text-blue-500" />);
      }
    }
  }, [role]);

  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-5 w-5 bg-muted animate-pulse rounded-full" />
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  // Get randomized term of endearment for admin
  const getDisplayName = () => {
    if (role !== "admin") {
      return name || "";
    }

    // Extract first name from full name
    const firstName = name ? name.split(" ")[0] : "Beautiful";

    // Terms of endearment with international options - firstName appears more frequently
    const terms = [
      firstName, // Appears 3 times for higher probability
      firstName,
      firstName,
      "Beautiful",
      "Princess",
      "공주님", // Princess in Korean (gongju-nim)
      "사랑", // Love in Korean (sarang)
      "자기야", // Honey/Darling in Korean (jagiya)
      "Słoneczko", // Sunshine in Polish
      "Schätzi", // Darling in German
      "Kochanie", // Love/Darling in Polish
    ];

    // Use time + date + minutes for more frequent variation but still consistent within ~10 minutes
    const now = new Date();
    const hour = now.getHours();
    const date = now.getDate();
    const tenMinuteBlock = Math.floor(now.getMinutes() / 10);
    const randomIndex = (hour + date + tenMinuteBlock) % terms.length;

    return terms[randomIndex];
  };

  const displayName = getDisplayName();

  // Get randomized punctuation for varied personalization
  const getPunctuation = () => {
    // Use similar logic as name selection for consistency within ~10 minutes
    const now = new Date();
    const hour = now.getHours();
    const date = now.getDate();
    const tenMinuteBlock = Math.floor(now.getMinutes() / 10);
    const punctuations = ["!", ":)"];
    const randomIndex = (hour + date + tenMinuteBlock + 1) % punctuations.length;
    return punctuations[randomIndex];
  };

  const punctuation = getPunctuation();

  return (
    <div
      className={cn(
        "flex items-center gap-2 group transition-all duration-300 hover:scale-105",
        className,
      )}
    >
      <div className="transition-transform duration-300 group-hover:rotate-12">{icon}</div>
      <span className="text-lg font-medium bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
        {greeting} {displayName}
        {punctuation}
      </span>
      {role === "admin" && (
        <Heart className="h-4 w-4 text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse" />
      )}
    </div>
  );
}

// Special celebration greeting for special occasions
export function CelebrationGreeting({
  name = "Love",
  occasion = "Amazing Day",
  className,
}: {
  name?: string;
  occasion?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200/50 shadow-sm",
        className,
      )}
    >
      <div className="flex gap-1">
        <Sparkles className="h-5 w-5 text-pink-500 animate-pulse" />
        <Heart className="h-5 w-5 text-red-500 animate-pulse" style={{ animationDelay: "0.5s" }} />
        <Sparkles
          className="h-5 w-5 text-purple-500 animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>
      <div>
        <div className="text-lg font-semibold text-gray-800">
          Happy {occasion}, {name}!
        </div>
        <div className="text-sm text-gray-600">Hope your day is as wonderful as you are ✨</div>
      </div>
    </div>
  );
}
