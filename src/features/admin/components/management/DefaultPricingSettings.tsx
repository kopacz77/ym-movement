// src/features/admin/components/management/DefaultPricingSettings.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function DefaultPricingSettings() {
  // Get default pricing data
  const { data: defaultPricing, isLoading } = api.admin.student.getDefaultPricing.useQuery();

  // Form state
  const [privatePrice, setPrivatePrice] = useState(
    defaultPricing?.privateLessonPrice.toString() || "75",
  );
  const [groupPrice, setGroupPrice] = useState(defaultPricing?.groupLessonPrice.toString() || "45");
  const [choreographyPrice, setChoreographyPrice] = useState(
    defaultPricing?.choreographyPrice.toString() || "90",
  );
  const [competitionPrice, setCompetitionPrice] = useState(
    defaultPricing?.competitionPrice.toString() || "95",
  );

  // Get mutation function
  const updateDefaultPricing = api.admin.student.updateDefaultPricing.useMutation({
    onSuccess: () => {
      toast.success("Default pricing updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update default pricing", {
        description: error.message,
      });
    },
  });

  // Update state when data is loaded
  useEffect(() => {
    if (defaultPricing) {
      setPrivatePrice(defaultPricing.privateLessonPrice.toString());
      setGroupPrice(defaultPricing.groupLessonPrice.toString());
      setChoreographyPrice(defaultPricing.choreographyPrice.toString());
      setCompetitionPrice(defaultPricing.competitionPrice.toString());
    }
  }, [defaultPricing]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      privateLessonPrice: Number.parseFloat(privatePrice),
      groupLessonPrice: Number.parseFloat(groupPrice),
      choreographyPrice: Number.parseFloat(choreographyPrice),
      competitionPrice: Number.parseFloat(competitionPrice),
    };

    updateDefaultPricing.mutate(data);
  };

  if (isLoading) {
    return <div>Loading pricing settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default Lesson Pricing</CardTitle>
        <CardDescription>
          Set the default pricing for each lesson type. These values will be used for all students
          unless they have custom pricing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="default-private-price">Private Lesson Price ($)</Label>
              <Input
                id="default-private-price"
                type="number"
                step="0.01"
                min="0"
                value={privatePrice}
                onChange={(e) => setPrivatePrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-group-price">Group Lesson Price ($)</Label>
              <Input
                id="default-group-price"
                type="number"
                step="0.01"
                min="0"
                value={groupPrice}
                onChange={(e) => setGroupPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-choreography-price">Choreography Price ($)</Label>
              <Input
                id="default-choreography-price"
                type="number"
                step="0.01"
                min="0"
                value={choreographyPrice}
                onChange={(e) => setChoreographyPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-competition-price">Competition Prep Price ($)</Label>
              <Input
                id="default-competition-price"
                type="number"
                step="0.01"
                min="0"
                value={competitionPrice}
                onChange={(e) => setCompetitionPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateDefaultPricing.isPending}>
              {updateDefaultPricing.isPending ? "Saving..." : "Save Default Pricing"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
