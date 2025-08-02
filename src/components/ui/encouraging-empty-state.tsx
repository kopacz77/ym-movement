"use client";

import { Calendar, Clock, Coffee, CreditCard, FileText, Heart, Star, Users } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EncouragingEmptyStateProps {
  type: "lessons" | "students" | "schedule" | "payments" | "reports" | "general";
  userRole?: "admin" | "student";
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export function EncouragingEmptyState({
  type,
  userRole = "student",
  onAction,
  actionLabel,
  className,
}: EncouragingEmptyStateProps) {
  const isAdmin = userRole === "admin";

  const emptyStateConfig = {
    lessons: {
      icon: Calendar,
      admin: {
        title: "Ready to create some skating magic? ⛸️",
        description:
          "Your coaching space is beautifully organized and waiting for amazing lessons to fill it. Every great skating journey starts with that first time slot!",
        actionLabel: "Create Your First Time Slot",
        decorative: "✨💕",
      },
      student: {
        title: "Your skating journey awaits! 🌟",
        description:
          "No lessons scheduled yet, but that's about to change! Every skating champion started with their first lesson.",
        actionLabel: "Book Your First Lesson",
        decorative: "⛸️✨",
      },
    },
    students: {
      icon: Users,
      admin: {
        title: "Your coaching family is growing! 👨‍👩‍👧‍👦",
        description:
          "This space is ready to welcome amazing skaters into your world. Each student brings their own dreams and potential to nurture.",
        actionLabel: "Welcome Your First Student",
        decorative: "💕🌟",
      },
      student: {
        title: "Welcome to the community! 🤗",
        description:
          "You're part of something special here. Connect with fellow skaters and grow together.",
        actionLabel: "Explore Community",
        decorative: "🌟✨",
      },
    },
    schedule: {
      icon: Clock,
      admin: {
        title: "Time to organize your coaching brilliance! 📅",
        description:
          "Your beautiful schedule is a blank canvas waiting for you to paint it with incredible skating sessions and student progress.",
        actionLabel: "Design Your Schedule",
        decorative: "💫💕",
      },
      student: {
        title: "Your skating calendar is ready! 📅",
        description:
          "Plan your progress, track your lessons, and watch your skating journey unfold beautifully.",
        actionLabel: "View Available Times",
        decorative: "⛸️📅",
      },
    },
    payments: {
      icon: CreditCard,
      admin: {
        title: "Your coaching business is perfectly set up! 💰",
        description:
          "Every payment represents a student's investment in their dreams and your investment in their success. Beautiful things are coming!",
        actionLabel: "Record First Payment",
        decorative: "✨💕",
      },
      student: {
        title: "Investment in your skating future! 💪",
        description:
          "Your payment history will tell the story of your dedication and progress on the ice.",
        actionLabel: "View Payment Options",
        decorative: "🌟💳",
      },
    },
    reports: {
      icon: FileText,
      admin: {
        title: "Soon you'll see your coaching impact! 📊",
        description:
          "These reports will showcase the amazing progress of your students and the growth of your beautiful coaching practice.",
        actionLabel: "Generate First Report",
        decorative: "📈💕",
      },
      student: {
        title: "Track your skating progress! 📈",
        description:
          "Your progress reports will show how far you've come and inspire your next skating goals.",
        actionLabel: "View Progress",
        decorative: "🌟📊",
      },
    },
    general: {
      icon: Heart,
      admin: {
        title: "Everything is ready for your coaching magic! ✨",
        description:
          "Your space is beautifully prepared. Every tool, every feature, every detail designed to help you create incredible skating experiences.",
        actionLabel: "Get Started",
        decorative: "💕🌟",
      },
      student: {
        title: "Welcome to your skating journey! 🎉",
        description:
          "Everything you need to grow as a skater is right here. Let's make some beautiful progress together!",
        actionLabel: "Explore Features",
        decorative: "⛸️✨",
      },
    },
  };

  const config = emptyStateConfig[type];
  const content = config[isAdmin ? "admin" : "student"];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 md:p-12 text-center",
        "bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border-2 border-dashed border-slate-200",
        className,
      )}
    >
      {/* Decorative elements for admin */}
      {isAdmin && (
        <div className="absolute top-4 right-4 text-2xl opacity-50">{content.decorative}</div>
      )}

      {/* Main icon with animation */}
      <div
        className={cn(
          "mb-6 p-4 rounded-full",
          isAdmin
            ? "bg-gradient-to-br from-pink-100 to-purple-100"
            : "bg-gradient-to-br from-blue-100 to-indigo-100",
        )}
      >
        <Icon
          className={cn("h-12 w-12", isAdmin ? "text-pink-600" : "text-blue-600", "animate-pulse")}
        />
      </div>

      {/* Title with gradient for admin */}
      <h3
        className={cn(
          "text-xl md:text-2xl font-bold mb-3 leading-tight",
          isAdmin
            ? "bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent"
            : "text-foreground",
        )}
      >
        {content.title}
      </h3>

      {/* Description */}
      <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6 max-w-md">
        {content.description}
      </p>

      {/* Action button */}
      {onAction && (
        <Button
          onClick={onAction}
          size="lg"
          className={cn(
            "transition-all duration-300 hover:scale-105",
            isAdmin
              ? "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
          )}
        >
          {actionLabel || content.actionLabel}
        </Button>
      )}

      {/* Additional encouraging elements for admin */}
      {isAdmin && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Coffee className="h-4 w-4" />
          <span className="italic">Made with love for an incredible coach</span>
          <Heart className="h-4 w-4 text-pink-500" />
        </div>
      )}

      {/* Additional motivational elements for students */}
      {!isAdmin && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Star className="h-4 w-4 text-yellow-500" />
          <span className="italic">Every expert was once a beginner</span>
          <Star className="h-4 w-4 text-yellow-500" />
        </div>
      )}
    </div>
  );
}

// Specialized empty states for common scenarios
export function NoLessonsYet({
  userRole,
  onBookLesson,
}: {
  userRole?: "admin" | "student";
  onBookLesson?: () => void;
}) {
  return <EncouragingEmptyState type="lessons" userRole={userRole} onAction={onBookLesson} />;
}

export function NoStudentsYet({ onAddStudent }: { onAddStudent?: () => void }) {
  return <EncouragingEmptyState type="students" userRole="admin" onAction={onAddStudent} />;
}

export function NoScheduleYet({
  userRole,
  onCreateSchedule,
}: {
  userRole?: "admin" | "student";
  onCreateSchedule?: () => void;
}) {
  return <EncouragingEmptyState type="schedule" userRole={userRole} onAction={onCreateSchedule} />;
}
