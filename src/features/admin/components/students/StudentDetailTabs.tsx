// src/features/admin/components/students/StudentDetailTabs.tsx
"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { StudentForm } from "./profile/StudentForm";
import { StudentNotes } from "./profile/StudentNotes";
import { StudentAttendance } from "./progress/StudentAttendance";
import { StudentPricingForm } from "./StudentPricingForm";
import type { Student } from "./types";

interface StudentDetailTabsProps {
  student: Student & {
    user: {
      id: string;
      name: string | null;
      email: string;
    };
    customPricingEnabled: boolean;
    privateLessonPrice: number | null;
    groupLessonPrice: number | null;
    choreographyPrice: number | null;
    competitionPrepPrice: number | null;
  };
}

export function StudentDetailTabs({ student }: StudentDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("profile");

  // Fetch default pricing for the pricing tab
  const { data: pricingData, isLoading: isPricingLoading } =
    api.admin.student.getDefaultPricing.useQuery(
      undefined,
      { enabled: activeTab === "pricing" }, // Only fetch when pricing tab is active
    );

  // Fetch student pricing data
  const { data: studentPricing, isLoading: isStudentPricingLoading } =
    api.admin.student.getStudentPricing.useQuery(
      { studentId: student.id },
      { enabled: activeTab === "pricing" }, // Only fetch when pricing tab is active
    );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Tabs defaultValue="profile" className="w-full" onValueChange={handleTabChange}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
        <TabsTrigger value="attendance">Attendance</TabsTrigger>
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="space-y-4 mt-6">
        <StudentForm student={{ id: student.id }} />
      </TabsContent>

      <TabsContent value="notes" className="space-y-4 mt-6">
        <StudentNotes studentId={student.id} />
      </TabsContent>

      <TabsContent value="attendance" className="space-y-4 mt-6">
        <StudentAttendance studentId={student.id} />
      </TabsContent>

      <TabsContent value="pricing" className="space-y-4 mt-6">
        {isPricingLoading || isStudentPricingLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading pricing data...</span>
          </div>
        ) : pricingData && studentPricing ? (
          <StudentPricingForm
            studentId={student.id}
            initialData={{
              customPricingEnabled: student.customPricingEnabled,
              privateLessonPrice: student.privateLessonPrice, // Keep as null instead of converting to undefined
              groupLessonPrice: student.groupLessonPrice, // Keep as null instead of converting to undefined
              choreographyPrice: student.choreographyPrice, // Keep as null instead of converting to undefined
              competitionPrepPrice: student.competitionPrepPrice, // Keep as null instead of converting to undefined
            }}
            defaultPrices={{
              privateLessonPrice: pricingData.privateLessonPrice,
              groupLessonPrice: pricingData.groupLessonPrice,
              choreographyPrice: pricingData.choreographyPrice,
              competitionPrice: pricingData.competitionPrice,
            }}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">Failed to load pricing data</div>
        )}
      </TabsContent>
    </Tabs>
  );
}
