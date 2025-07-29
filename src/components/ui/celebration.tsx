"use client";

import * as React from "react";
import { CheckCircle, Heart, Star, Sparkles, Trophy, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CelebrationProps {
  type?: "success" | "achievement" | "milestone" | "love" | "progress";
  title: string;
  message?: string;
  userRole?: "admin" | "student";
  autoClose?: boolean;
  duration?: number;
  onClose?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export function Celebration({
  type = "success",
  title,
  message,
  userRole = "student",
  autoClose = true,
  duration = 5000,
  onClose,
  onAction,
  actionLabel,
  className,
}: CelebrationProps) {
  const [isVisible, setIsVisible] = React.useState(true);
  const [progress, setProgress] = React.useState(100);

  React.useEffect(() => {
    if (!autoClose) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 100));
        if (newProgress <= 0) {
          setIsVisible(false);
          onClose?.();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [autoClose, duration, onClose]);

  if (!isVisible) return null;

  const isAdmin = userRole === "admin";

  const celebrationConfig = {
    success: {
      icon: CheckCircle,
      colors: {
        admin: "from-green-400 via-emerald-500 to-green-600",
        student: "from-green-500 to-emerald-600",
      },
      bgGradient: {
        admin: "from-green-50 via-emerald-50 to-green-50",
        student: "from-green-50 to-emerald-50",
      },
      iconColor: "text-green-600",
      decorativeElements: ["✨", "🎉", "💫"],
    },
    achievement: {
      icon: Trophy,
      colors: {
        admin: "from-yellow-400 via-orange-500 to-yellow-600",
        student: "from-yellow-500 to-orange-600",
      },
      bgGradient: {
        admin: "from-yellow-50 via-orange-50 to-yellow-50",
        student: "from-yellow-50 to-orange-50",
      },
      iconColor: "text-yellow-600",
      decorativeElements: ["🏆", "🌟", "🎊"],
    },
    milestone: {
      icon: Star,
      colors: {
        admin: "from-purple-400 via-pink-500 to-purple-600",
        student: "from-purple-500 to-pink-600",
      },
      bgGradient: {
        admin: "from-purple-50 via-pink-50 to-purple-50",
        student: "from-purple-50 to-pink-50",
      },
      iconColor: "text-purple-600",
      decorativeElements: ["⭐", "🌙", "✨"],
    },
    love: {
      icon: Heart,
      colors: {
        admin: "from-pink-400 via-red-500 to-pink-600",
        student: "from-pink-500 to-red-600",
      },
      bgGradient: {
        admin: "from-pink-50 via-red-50 to-pink-50",
        student: "from-pink-50 to-red-50",
      },
      iconColor: "text-pink-600",
      decorativeElements: ["💕", "💖", "🌹"],
    },
    progress: {
      icon: Sparkles,
      colors: {
        admin: "from-blue-400 via-indigo-500 to-blue-600",
        student: "from-blue-500 to-indigo-600",
      },
      bgGradient: {
        admin: "from-blue-50 via-indigo-50 to-blue-50",
        student: "from-blue-50 to-indigo-50",
      },
      iconColor: "text-blue-600",
      decorativeElements: ["🚀", "⚡", "🌟"],
    },
  };

  const config = celebrationConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 max-w-sm w-full",
      "transform transition-all duration-500 ease-out",
      isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
      className
    )}>
      <div className={cn(
        "relative overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm",
        `bg-gradient-to-br ${config.bgGradient[isAdmin ? "admin" : "student"]}`,
        "border-white/20"
      )}>
        {/* Animated background sparkles for admin */}
        {isAdmin && (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.5}s`,
                  fontSize: "1.5rem",
                }}
              >
                {config.decorativeElements[i % config.decorativeElements.length]}
              </div>
            ))}
          </div>
        )}

        <div className="relative p-6">
          {/* Header with icon */}
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex-shrink-0 p-2 rounded-full",
              `bg-gradient-to-br ${config.colors[isAdmin ? "admin" : "student"]}`,
              "shadow-lg"
            )}>
              <Icon className="h-6 w-6 text-white animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className={cn(
                "text-lg font-bold leading-tight mb-2",
                isAdmin 
                  ? `bg-gradient-to-r ${config.colors.admin} bg-clip-text text-transparent`
                  : "text-foreground"
              )}>
                {title}
              </h3>

              {/* Message */}
              {message && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {message}
                </p>
              )}

              {/* Action button */}
              {onAction && actionLabel && (
                <Button
                  onClick={onAction}
                  size="sm"
                  className={cn(
                    "mb-3",
                    `bg-gradient-to-r ${config.colors[isAdmin ? "admin" : "student"]}`,
                    "hover:scale-105 transition-transform duration-200"
                  )}
                >
                  {actionLabel}
                </Button>
              )}
            </div>

            {/* Close button */}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsVisible(false);
                  onClose();
                }}
                className="flex-shrink-0 h-6 w-6 p-0 hover:bg-white/20"
              >
                ×
              </Button>
            )}
          </div>

          {/* Progress bar for auto-close */}
          {autoClose && (
            <div className="mt-4">
              <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-100 ease-linear",
                    `bg-gradient-to-r ${config.colors[isAdmin ? "admin" : "student"]}`
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Special admin love note */}
          {isAdmin && type === "love" && (
            <div className="mt-3 text-center">
              <p className="text-xs italic text-pink-600/70">
                Made with infinite love for an incredible coach 💕
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Specialized celebration components for common scenarios
export function SuccessCelebration({ 
  title, 
  message, 
  userRole,
  onClose 
}: {
  title: string;
  message?: string;
  userRole?: "admin" | "student";
  onClose?: () => void;
}) {
  return (
    <Celebration
      type="success"
      title={title}
      message={message}
      userRole={userRole}
      onClose={onClose}
    />
  );
}

export function AchievementCelebration({ 
  title, 
  message, 
  userRole,
  onViewProgress 
}: {
  title: string;
  message?: string;
  userRole?: "admin" | "student";
  onViewProgress?: () => void;
}) {
  return (
    <Celebration
      type="achievement"
      title={title}
      message={message}
      userRole={userRole}
      onAction={onViewProgress}
      actionLabel="View Progress"
    />
  );
}

export function LoveCelebration({ 
  title, 
  message,
  onClose 
}: {
  title: string;
  message?: string;
  onClose?: () => void;
}) {
  return (
    <Celebration
      type="love"
      title={title}
      message={message}
      userRole="admin"
      onClose={onClose}
      duration={7000}
    />
  );
}