// src/features/student/components/booking/CoachProfileCard.tsx
"use client";

import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface CoachProfile {
  id: string;
  name: string | null;
  bio: string | null;
  photoUrl: string | null;
  skills: string[];
  certifications: string | null;
  yearsExperience: number | null;
  privateLessonPrice: number | null;
  groupLessonPrice: number | null;
  choreographyPrice: number | null;
  competitionPrepPrice: number | null;
  availableSlots: number;
}

interface CoachProfileCardProps {
  coach: CoachProfile;
  onSelect: (coach: CoachProfile) => void;
}

function getInitials(name: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || null;
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getLowestPrice(coach: CoachProfile): number | null {
  const prices = [
    coach.privateLessonPrice,
    coach.groupLessonPrice,
    coach.choreographyPrice,
    coach.competitionPrepPrice,
  ].filter((p): p is number => p != null);

  if (prices.length === 0) return null;
  return Math.min(...prices);
}

export function CoachProfileCard({ coach, onSelect }: CoachProfileCardProps) {
  const initials = getInitials(coach.name);
  const lowestPrice = getLowestPrice(coach);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelect(coach)}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-12 w-12">
            {coach.photoUrl && <AvatarImage src={coach.photoUrl} alt={coach.name || "Coach"} />}
            <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-medium">
              {initials || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{coach.name || "Coach"}</h3>
            {coach.yearsExperience != null && (
              <p className="text-sm text-muted-foreground">
                {coach.yearsExperience} {coach.yearsExperience === 1 ? "year" : "years"} experience
              </p>
            )}
          </div>
        </div>

        {coach.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{coach.bio}</p>
        )}

        {coach.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {coach.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          {lowestPrice != null ? (
            <span className="text-sm font-medium">From ${lowestPrice}/hr</span>
          ) : (
            <span className="text-sm text-muted-foreground">Contact for pricing</span>
          )}
          <Badge variant="outline" className="text-xs">
            {coach.availableSlots} {coach.availableSlots === 1 ? "slot" : "slots"} available
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
