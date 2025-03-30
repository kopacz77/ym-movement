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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState("pricing");

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

    // Form validation - check for empty values when enabled
    if (isEnabled) {
      // Check each field
      if (!privatePrice.trim() || !groupPrice.trim() || 
          !choreographyPrice.trim() || !competitionPrice.trim()) {
        toast.error("Price fields cannot be empty when custom pricing is enabled");
        return;
      }
      
      // Check for valid numbers
      const prices = [privatePrice, groupPrice, choreographyPrice, competitionPrice];
      for (const price of prices) {
        const parsed = Number.parseFloat(price);
        if (Number.isNaN(parsed) || parsed < 0) {
          toast.error("All prices must be valid positive numbers");
          return;
        }
      }
    }

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

  // Calculate savings/additional cost
  const calculateDifference = (customPrice: string, defaultPrice: number): number => {
    return Number.parseFloat(customPrice) - defaultPrice;
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
        <TabsTrigger value="history">Payment History</TabsTrigger>
      </TabsList>

      <TabsContent value="pricing">
        <Card>
          <CardHeader>
            <CardTitle>Custom Pricing</CardTitle>
            <CardDescription>
              Set custom lesson prices for this student. If disabled, default pricing will be used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Custom pricing is applied to all new bookings. Existing bookings will keep their
                original prices.
              </AlertDescription>
            </Alert>

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
                        required={isEnabled}
                      />
                    </div>
                    {!isEnabled && (
                      <p className="text-xs text-muted-foreground">
                        Default: ${defaultPrices.privateLessonPrice}
                      </p>
                    )}
                    {isEnabled && (
                      <p
                        className={`text-xs ${
                          calculateDifference(privatePrice, defaultPrices.privateLessonPrice) < 0
                            ? "text-green-600"
                            : calculateDifference(privatePrice, defaultPrices.privateLessonPrice) > 0
                              ? "text-orange-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {calculateDifference(privatePrice, defaultPrices.privateLessonPrice) < 0
                          ? `$${Math.abs(
                              calculateDifference(privatePrice, defaultPrices.privateLessonPrice),
                            ).toFixed(2)} discount`
                          : calculateDifference(privatePrice, defaultPrices.privateLessonPrice) > 0
                            ? `$${calculateDifference(
                                privatePrice,
                                defaultPrices.privateLessonPrice,
                              ).toFixed(2)} additional`
                            : "Same as default"}
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
                        required={isEnabled}
                      />
                    </div>
                    {!isEnabled && (
                      <p className="text-xs text-muted-foreground">
                        Default: ${defaultPrices.groupLessonPrice}
                      </p>
                    )}
                    {isEnabled && (
                      <p
                        className={`text-xs ${
                          calculateDifference(groupPrice, defaultPrices.groupLessonPrice) < 0
                            ? "text-green-600"
                            : calculateDifference(groupPrice, defaultPrices.groupLessonPrice) > 0
                              ? "text-orange-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {calculateDifference(groupPrice, defaultPrices.groupLessonPrice) < 0
                          ? `$${Math.abs(
                              calculateDifference(groupPrice, defaultPrices.groupLessonPrice),
                            ).toFixed(2)} discount`
                          : calculateDifference(groupPrice, defaultPrices.groupLessonPrice) > 0
                            ? `$${calculateDifference(
                                groupPrice,
                                defaultPrices.groupLessonPrice,
                              ).toFixed(2)} additional`
                            : "Same as default"}
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
                        required={isEnabled}
                      />
                    </div>
                    {!isEnabled && (
                      <p className="text-xs text-muted-foreground">
                        Default: ${defaultPrices.choreographyPrice}
                      </p>
                    )}
                    {isEnabled && (
                      <p
                        className={`text-xs ${
                          calculateDifference(choreographyPrice, defaultPrices.choreographyPrice) < 0
                            ? "text-green-600"
                            : calculateDifference(
                                choreographyPrice,
                                defaultPrices.choreographyPrice,
                              ) > 0
                              ? "text-orange-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {calculateDifference(choreographyPrice, defaultPrices.choreographyPrice) < 0
                          ? `$${Math.abs(
                              calculateDifference(
                                choreographyPrice,
                                defaultPrices.choreographyPrice,
                              ),
                            ).toFixed(2)} discount`
                          : calculateDifference(
                                choreographyPrice,
                                defaultPrices.choreographyPrice,
                              ) > 0
                            ? `$${calculateDifference(
                                choreographyPrice,
                                defaultPrices.choreographyPrice,
                              ).toFixed(2)} additional`
                            : "Same as default"}
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
                        required={isEnabled}
                      />
                    </div>
                    {!isEnabled && (
                      <p className="text-xs text-muted-foreground">
                        Default: ${defaultPrices.competitionPrice}
                      </p>
                    )}
                    {isEnabled && (
                      <p
                        className={`text-xs ${
                          calculateDifference(competitionPrice, defaultPrices.competitionPrice) < 0
                            ? "text-green-600"
                            : calculateDifference(
                                competitionPrice,
                                defaultPrices.competitionPrice,
                              ) > 0
                              ? "text-orange-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {calculateDifference(competitionPrice, defaultPrices.competitionPrice) < 0
                          ? `$${Math.abs(
                              calculateDifference(
                                competitionPrice,
                                defaultPrices.competitionPrice,
                              ),
                            ).toFixed(2)} discount`
                          : calculateDifference(competitionPrice, defaultPrices.competitionPrice) > 0
                            ? `$${calculateDifference(
                                competitionPrice,
                                defaultPrices.competitionPrice,
                              ).toFixed(2)} additional`
                            : "Same as default"}
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
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              View this student's payment history and transaction details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Payment history will be implemented in a future update.</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}