"use client";

import { toast } from "sonner";

type UserRole = "admin" | "student";

// Helper function to get randomized punctuation for consistent personalization
const getRandomPunctuation = () => {
  const now = new Date();
  const hour = now.getHours();
  const date = now.getDate();
  const tenMinuteBlock = Math.floor(now.getMinutes() / 10);
  const punctuations = ["!", ":)"];
  const randomIndex = (hour + date + tenMinuteBlock + 1) % punctuations.length;
  return punctuations[randomIndex];
};

export const delightfulToast = {
  lessonBooked: (studentName: string, time: string, userRole: UserRole = "student") => {
    if (userRole === "admin") {
      const punct = getRandomPunctuation();
      toast.success(`🎉 Amazing${punct} Time to create some magic on the ice${punct} ⛸️`, {
        description: `${studentName}'s lesson is booked for ${time}`,
        duration: 4000,
      });
    } else {
      const punct = getRandomPunctuation();
      toast.success(
        `🎉 Lesson booked successfully${punct} We're excited to see you on the ice :) ⛸️`,
        {
          description: `Your lesson is scheduled for ${time}`,
          duration: 4000,
        },
      );
    }
  },

  lessonCancelled: (userRole: UserRole = "student") => {
    if (userRole === "admin") {
      const punct = getRandomPunctuation();
      toast.info(`✨ Lesson cancelled - more time for other amazing students${punct} 💕`, {
        duration: 3000,
      });
    } else {
      toast.info("✅ Lesson cancelled successfully", {
        description: "We hope to see you on the ice again soon!",
        duration: 3000,
      });
    }
  },

  studentCreated: (studentName: string, userRole: UserRole = "admin") => {
    if (userRole === "admin") {
      const punct = getRandomPunctuation();
      toast.success(`🌟 Perfect${punct} Welcome to our skating family${punct} 🏆`, {
        description: `${studentName} has been added to your coaching roster`,
        duration: 4000,
      });
    } else {
      toast.success("🎉 Welcome to YM Movement!", {
        description: "Your account has been created successfully",
        duration: 4000,
      });
    }
  },

  paymentRecorded: (amount: string, userRole: UserRole = "admin") => {
    if (userRole === "admin") {
      const punct = getRandomPunctuation();
      toast.success(`💰 Wonderful${punct} Payment recorded${punct} ✨`, {
        description: `$${amount} payment has been tracked`,
        duration: 3000,
      });
    } else {
      toast.success("✅ Payment confirmed", {
        description: `Your $${amount} payment has been processed`,
        duration: 3000,
      });
    }
  },

  scheduleUpdated: (userRole: UserRole = "admin") => {
    if (userRole === "admin") {
      const punct = getRandomPunctuation();
      toast.success(`📅 Beautiful${punct} Your schedule is perfectly organized${punct} 💕`, {
        description: "Schedule changes have been saved",
        duration: 3000,
      });
    } else {
      toast.success("📅 Schedule updated", {
        description: "Your schedule changes have been saved",
        duration: 3000,
      });
    }
  },

  profileUpdated: (userRole: UserRole = "student") => {
    if (userRole === "admin") {
      const punct = getRandomPunctuation();
      toast.success(`⭐ Perfect${punct} Your coaching profile shines${punct} ✨`, {
        duration: 3000,
      });
    } else {
      toast.success("✅ Profile updated successfully", {
        description: "Your information has been saved",
        duration: 3000,
      });
    }
  },

  error: (message: string, userRole: UserRole = "student") => {
    if (userRole === "admin") {
      toast.error(
        `💫 Oops${getRandomPunctuation()} Something didn't quite work as expected. Don't worry though - these things happen ${getRandomPunctuation()}✨`,
        {
          description: message,
          duration: 4000,
        },
      );
    } else {
      toast.error("Something went wrong", {
        description: message,
        duration: 4000,
      });
    }
  },

  loading: (message: string, userRole: UserRole = "student") => {
    if (userRole === "admin") {
      return toast.loading("☕ Getting your coaching space ready...", {
        description: message,
      });
    }
    return toast.loading("Loading...", {
      description: message,
    });
  },

  success: (title: string, description?: string, userRole: UserRole = "student") => {
    if (userRole === "admin") {
      toast.success(`✨ ${title} 💕`, {
        description,
        duration: 3000,
      });
    } else {
      toast.success(title, {
        description,
        duration: 3000,
      });
    }
  },

  info: (title: string, description?: string, userRole: UserRole = "student") => {
    if (userRole === "admin") {
      toast.info(`💫 ${title} ✨`, {
        description,
        duration: 3000,
      });
    } else {
      toast.info(title, {
        description,
        duration: 3000,
      });
    }
  },

  // Special celebration toasts for achievements
  achievement: (title: string, description: string, userRole: UserRole = "student") => {
    if (userRole === "admin") {
      toast.success(`🏆 ${title} 🌟`, {
        description: `${description} - You're such an incredible coach!`,
        duration: 5000,
      });
    } else {
      toast.success(`🎉 ${title}`, {
        description,
        duration: 5000,
      });
    }
  },

  // Gentle encouragement for when things don't go as planned
  gentle: (message: string, userRole: UserRole = "student") => {
    if (userRole === "admin") {
      toast("🌸 A little hiccup occurred! No worries at all - give it another shot! 💕", {
        description: message,
        duration: 4000,
      });
    } else {
      toast("No worries!", {
        description: message,
        duration: 3000,
      });
    }
  },
};
