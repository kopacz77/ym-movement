// src/features/admin/components/students/StudentPricingForm.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface StudentPricingFormProps {
  studentId: string;
  initialData: {
    customPricingEnabled: boolean;
    privateLessonPrice: number | null;
    groupLessonPrice: number | null;
    choreographyPrice: number | null;
    competitionPrepPrice: number | null;
  };
  defaultPrices: {
    privateLessonPrice: number;
    groupLessonPrice: number;
    choreographyPrice: number;
    competitionPrice: number;
  };
}

export function StudentPricingForm({
  studentId,
  initialData,
  defaultPrices,
}: StudentPricingFormProps) {
  // Form state
  const [isEnabled, setIsEnabled] = useState(initialData.customPricingEnabled);
  const [privatePrice, setPrivatePrice] = useState(
    initialData.privateLessonPrice?.toString() || defaultPrices.privateLessonPrice.toString(),
  );
  const [groupPrice, setGroupPrice] = useState(
    initialData.groupLessonPrice?.toString() || defaultPrices.groupLessonPrice.toString(),
  );
  const [choreographyPrice, setChoreographyPrice] = useState(
    initialData.choreographyPrice?.toString() || defaultPrices.choreographyPrice.toString(),
  );
  const [competitionPrice, setCompetitionPrice] = useState(
    initialData.competitionPrepPrice?.toString() || defaultPrices.competitionPrice.toString(),
  );

  // Get mutation function
  const updatePricing = api.admin.student.updateStudentPricing.useMutation({
    onSuccess: () => {
      toast.success("Pricing updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update pricing", {
        description: error.message,
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      studentId,
      customPricingEnabled: isEnabled,
      privateLessonPrice: isEnabled ? Number.parseFloat(privatePrice) : null,
      groupLessonPrice: isEnabled ? Number.parseFloat(groupPrice) : null,
      choreographyPrice: isEnabled ? Number.parseFloat(choreographyPrice) : null,
      competitionPrepPrice: isEnabled ? Number.parseFloat(competitionPrice) : null,
    };

    updatePricing.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Pricing</CardTitle>
        <CardDescription>
          Set custom lesson prices for this student. If disabled, default pricing will be used.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="pricing-toggle">Enable Custom Pricing</Label>
              <p className="text-sm text-muted-foreground">
                Override the default pricing for this student
              </p>
            </div>
            <Switch id="pricing-toggle" checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="private-price">Private Lesson Price ($)</Label>
                <div className="flex items-center">
                  <Input
                    id="private-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={privatePrice}
                    onChange={(e) => setPrivatePrice(e.target.value)}
                    disabled={!isEnabled}
                  />
                </div>
                {!isEnabled && (
                  <p className="text-xs text-muted-foreground">
                    Default: ${defaultPrices.privateLessonPrice}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-price">Group Lesson Price ($)</Label>
                <div className="flex items-center">
                  <Input
                    id="group-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={groupPrice}
                    onChange={(e) => setGroupPrice(e.target.value)}
                    disabled={!isEnabled}
                  />
                </div>
                {!isEnabled && (
                  <p className="text-xs text-muted-foreground">
                    Default: ${defaultPrices.groupLessonPrice}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="choreography-price">Choreography Price ($)</Label>
                <div className="flex items-center">
                  <Input
                    id="choreography-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={choreographyPrice}
                    onChange={(e) => setChoreographyPrice(e.target.value)}
                    disabled={!isEnabled}
                  />
                </div>
                {!isEnabled && (
                  <p className="text-xs text-muted-foreground">
                    Default: ${defaultPrices.choreographyPrice}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="competition-price">Competition Prep Price ($)</Label>
                <div className="flex items-center">
                  <Input
                    id="competition-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={competitionPrice}
                    onChange={(e) => setCompetitionPrice(e.target.value)}
                    disabled={!isEnabled}
                  />
                </div>
                {!isEnabled && (
                  <p className="text-xs text-muted-foreground">
                    Default: ${defaultPrices.competitionPrice}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updatePricing.isPending}>
              {updatePricing.isPending ? "Saving..." : "Save Pricing"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
