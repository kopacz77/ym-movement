// src/features/student/components/profile/ProfileForm.tsx
"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const ProfileForm = () => {
  const { id: studentId } = useCurrentUser();
  const [isReady, setIsReady] = useState(false);

  // Profile form state
  const [phone, setPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only fetch data when studentId is available
  useEffect(() => {
    if (studentId) {
      setIsReady(true);
    }
  }, [studentId]);

  // Fetch student profile
  const { data: studentData, isLoading } = api.student.profile.getStudentProfile.useQuery(
    { studentId },
    { enabled: isReady && !!studentId },
  );

  // Initialize form with fetched data
  useEffect(() => {
    if (studentData) {
      // Handle phone number
      if (studentData.phone) {
        setPhone(studentData.phone);
      }

      // Handle emergency contact - using type assertions and explicit checks
      if (studentData.emergencyContact) {
        const emergencyContactObj = studentData.emergencyContact as Record<string, unknown>;

        // Individually check and set each property, ensuring it's a string
        if (emergencyContactObj && typeof emergencyContactObj === "object") {
          const nameValue = emergencyContactObj.name;
          if (nameValue && typeof nameValue === "string") {
            setEmergencyName(nameValue);
          }

          const phoneValue = emergencyContactObj.phone;
          if (phoneValue && typeof phoneValue === "string") {
            setEmergencyPhone(phoneValue);
          }

          const relationshipValue = emergencyContactObj.relationship;
          if (relationshipValue && typeof relationshipValue === "string") {
            setEmergencyRelationship(relationshipValue);
          }
        }
      }
    }
  }, [studentData]);

  const updateProfile = api.student.profile.updateStudentProfile.useMutation({
    onSuccess: () => {
      toast("Profile updated", {
        description: "Your profile has been updated successfully.",
      });
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast.error("Error updating profile", {
        description: error.message,
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      toast.error("Error", {
        description: "Student ID not available. Please try again later.",
      });
      return;
    }

    setIsSubmitting(true);

    updateProfile.mutate({
      studentId,
      phone: phone || undefined,
      emergencyContact: {
        name: emergencyName,
        phone: emergencyPhone,
        relationship: emergencyRelationship,
      },
    });
  };

  if (isLoading || !isReady || !studentData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <p>Loading profile...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Account Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={
                      (studentData.User &&
                        typeof studentData.User === "object" &&
                        "name" in studentData.User &&
                        studentData.User.name) ||
                      ""
                    }
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={
                      (studentData.User &&
                        typeof studentData.User === "object" &&
                        "email" in studentData.User &&
                        studentData.User.email) ||
                      ""
                    }
                    disabled
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="e.g. +1 (555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label>Level:</Label>
                <Badge>
                  {typeof studentData.level === "string"
                    ? studentData.level.replace("_", " ")
                    : "Unknown Level"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label>Weekly Lesson Limit:</Label>
                <span>{studentData.maxLessonsPerWeek || 0} lessons</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Emergency Contact</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="emergency-name">Contact Name</Label>
                <Input
                  id="emergency-name"
                  placeholder="Full name"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="emergency-phone">Contact Phone</Label>
                <Input
                  id="emergency-phone"
                  placeholder="e.g. +1 (555) 123-4567"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="emergency-relationship">Relationship</Label>
                <Input
                  id="emergency-relationship"
                  placeholder="e.g. Parent, Spouse, Friend"
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
