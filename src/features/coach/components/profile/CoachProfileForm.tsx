"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const profileSchema = z.object({
  bio: z.string().max(500, "Bio must be 500 characters or less"),
  photoUrl: z.string().url("Must be a valid URL").or(z.literal("")),
  skills: z.string(),
  certifications: z.string().max(1000, "Certifications must be 1000 characters or less"),
  yearsExperience: z.coerce.number().int().min(0).max(99).optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function formatPrice(price: number | null | undefined): string {
  if (price == null) {
    return "Not set";
  }
  return `$${price.toFixed(2)}`;
}

export function CoachProfileForm() {
  const { data: profile, isLoading } = api.coach.profile.getProfile.useQuery();
  const utils = api.useUtils();

  const updateProfile = api.coach.profile.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      utils.coach.profile.getProfile.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to update profile", {
        description: error.message,
      });
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: "",
      photoUrl: "",
      skills: "",
      certifications: "",
      yearsExperience: null,
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        bio: profile.bio ?? "",
        photoUrl: profile.photoUrl ?? "",
        skills: (profile.skills ?? []).join(", "),
        certifications: profile.certifications ?? "",
        yearsExperience: profile.yearsExperience ?? null,
      });
    }
  }, [profile, form]);

  function onSubmit(values: ProfileFormValues) {
    const skillsArray = values.skills
      ? values.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    updateProfile.mutate({
      bio: values.bio || undefined,
      photoUrl: values.photoUrl || null,
      skills: skillsArray,
      certifications: values.certifications || null,
      yearsExperience: values.yearsExperience,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Read-only info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details (read-only)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Name</Label>
              <p className="font-medium">{profile?.User?.name ?? "Unknown"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="font-medium">{profile?.User?.email ?? "Unknown"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Member Since</Label>
              <p className="font-medium">
                {profile?.User?.createdAt
                  ? format(new Date(profile.User.createdAt), "MMM d, yyyy")
                  : "Unknown"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable profile form */}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Update your coaching profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell students about yourself and your coaching style..."
                {...form.register("bio")}
                className="min-h-[100px]"
              />
              {form.formState.errors.bio && (
                <p className="text-sm text-destructive">{form.formState.errors.bio.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {form.watch("bio")?.length ?? 0}/500 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photoUrl">Photo URL</Label>
              <Input
                id="photoUrl"
                type="url"
                placeholder="https://example.com/photo.jpg"
                {...form.register("photoUrl")}
              />
              {form.formState.errors.photoUrl && (
                <p className="text-sm text-destructive">{form.formState.errors.photoUrl.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Skills</Label>
              <Input
                id="skills"
                placeholder="Figure skating, Ice dance, Jumps, Spins..."
                {...form.register("skills")}
              />
              <p className="text-xs text-muted-foreground">Separate skills with commas</p>
              {profile?.skills && profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="certifications">Certifications</Label>
              <Textarea
                id="certifications"
                placeholder="List your certifications..."
                {...form.register("certifications")}
              />
              {form.formState.errors.certifications && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.certifications.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearsExperience">Years of Experience</Label>
              <Input
                id="yearsExperience"
                type="number"
                min={0}
                max={99}
                placeholder="0"
                {...form.register("yearsExperience")}
              />
              {form.formState.errors.yearsExperience && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.yearsExperience.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={updateProfile.isPending} className="w-full sm:w-auto">
              {updateProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Profile
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Read-only rates */}
      <Card>
        <CardHeader>
          <CardTitle>Your Lesson Rates</CardTitle>
          <CardDescription>
            Lesson rates are set by the admin. Contact your admin to update rates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Private</p>
              <p className="text-lg font-bold">{formatPrice(profile?.privateLessonPrice)}</p>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Group</p>
              <p className="text-lg font-bold">{formatPrice(profile?.groupLessonPrice)}</p>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Choreography</p>
              <p className="text-lg font-bold">{formatPrice(profile?.choreographyPrice)}</p>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Competition Prep</p>
              <p className="text-lg font-bold">{formatPrice(profile?.competitionPrepPrice)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="outline">Revenue Split: {profile?.revenueSplitPercent ?? 0}%</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
