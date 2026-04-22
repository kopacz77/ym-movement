// src/features/admin/components/coaches/management/NewCoachDialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const newCoachSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  bio: z.string().max(500).optional().or(z.literal("")),
  skills: z.string().optional().or(z.literal("")),
  certifications: z.string().max(1000).optional().or(z.literal("")),
  yearsExperience: z.string().optional().or(z.literal("")),
  privateLessonPrice: z.string().optional().or(z.literal("")),
  groupLessonPrice: z.string().optional().or(z.literal("")),
  choreographyPrice: z.string().optional().or(z.literal("")),
  competitionPrepPrice: z.string().optional().or(z.literal("")),
  offIceDancePrice: z.string().optional().or(z.literal("")),
  revenueSplitPercent: z.string().optional().or(z.literal("")),
});

type NewCoachFormValues = z.infer<typeof newCoachSchema>;

interface NewCoachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewCoachDialog: React.FC<NewCoachDialogProps> = ({ open, onOpenChange }) => {
  const queryClient = useQueryClient();

  const form = useForm<NewCoachFormValues>({
    resolver: zodResolver(newCoachSchema),
    defaultValues: {
      name: "",
      email: "",
      bio: "",
      skills: "",
      certifications: "",
      yearsExperience: "",
      privateLessonPrice: "",
      groupLessonPrice: "",
      choreographyPrice: "",
      competitionPrepPrice: "",
      offIceDancePrice: "",
      revenueSplitPercent: "70",
    },
  });

  const createCoachMutation = api.admin.coach.management.createCoach.useMutation({
    onSuccess: (data) => {
      if (data.emailSent) {
        toast.success("Coach created", {
          description: "Registration email sent.",
        });
      } else {
        toast.error("Coach created, but email failed to send", {
          description:
            data.emailError || "Use 'Resend Invitation' from the coach's row menu to try again.",
          duration: 10000,
        });
      }
      queryClient.invalidateQueries({ queryKey: [["admin", "coach"]] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to create coach", { description: error.message });
    },
  });

  const onSubmit = (data: NewCoachFormValues) => {
    const skillsArray = data.skills
      ? data.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    createCoachMutation.mutate({
      name: data.name,
      email: data.email,
      bio: data.bio || undefined,
      skills: skillsArray,
      certifications: data.certifications || undefined,
      yearsExperience: data.yearsExperience ? Number.parseInt(data.yearsExperience, 10) : undefined,
      privateLessonPrice: data.privateLessonPrice
        ? Number.parseFloat(data.privateLessonPrice)
        : undefined,
      groupLessonPrice: data.groupLessonPrice
        ? Number.parseFloat(data.groupLessonPrice)
        : undefined,
      choreographyPrice: data.choreographyPrice
        ? Number.parseFloat(data.choreographyPrice)
        : undefined,
      competitionPrepPrice: data.competitionPrepPrice
        ? Number.parseFloat(data.competitionPrepPrice)
        : undefined,
      offIceDancePrice: data.offIceDancePrice
        ? Number.parseFloat(data.offIceDancePrice)
        : undefined,
      revenueSplitPercent: data.revenueSplitPercent
        ? Number.parseFloat(data.revenueSplitPercent)
        : 70,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Coach</DialogTitle>
          <DialogDescription>
            Create a new coach account. They will receive an email to complete registration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="Coach name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="coach@example.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Coach bio (optional)"
              rows={2}
              {...form.register("bio")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="skills">Skills</Label>
              <Input
                id="skills"
                placeholder="Ice dance, Pairs (comma-separated)"
                {...form.register("skills")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearsExperience">Years Experience</Label>
              <Input
                id="yearsExperience"
                type="number"
                min="0"
                max="99"
                placeholder="0"
                {...form.register("yearsExperience")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="certifications">Certifications</Label>
            <Input
              id="certifications"
              placeholder="PSA, ISI (optional)"
              {...form.register("certifications")}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Pricing (optional)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="privateLessonPrice">Private Lesson ($)</Label>
                <Input
                  id="privateLessonPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("privateLessonPrice")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupLessonPrice">Group Lesson ($)</Label>
                <Input
                  id="groupLessonPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("groupLessonPrice")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="choreographyPrice">Choreography ($)</Label>
                <Input
                  id="choreographyPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("choreographyPrice")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="competitionPrepPrice">Competition Prep ($)</Label>
                <Input
                  id="competitionPrepPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("competitionPrepPrice")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offIceDancePrice">Off-Ice Dance ($)</Label>
                <Input
                  id="offIceDancePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("offIceDancePrice")}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="revenueSplitPercent">Revenue Split (%)</Label>
            <Input
              id="revenueSplitPercent"
              type="number"
              min="0"
              max="100"
              placeholder="70"
              {...form.register("revenueSplitPercent")}
            />
            <p className="text-xs text-muted-foreground">
              Percentage of lesson revenue the coach receives. Default is 70%.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCoachMutation.isPending}>
              {createCoachMutation.isPending ? "Creating..." : "Create Coach"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
