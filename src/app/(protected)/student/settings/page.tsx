// src/app/(protected)/student/settings/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { BellRing, Lock, PaintBucket, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChangePasswordForm from "@/features/auth/components/ChangePasswordForm";

export default function StudentSettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [reminderNotifications, setReminderNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = () => {
    // Simulate saving process
    setIsSaving(true);
    // In a real app, this would save the settings to the backend
    setTimeout(() => {
      setIsSaving(false);
      toast("Settings saved", {
        description: "Your preferences have been updated.",
      });
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="notifications">
        <TabsList className="w-full border-b mb-4 pb-0">
          <TabsTrigger value="notifications" className="flex items-center">
            <BellRing className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center">
            <PaintBucket className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center">
            <Lock className="h-4 w-4 mr-2" />
            Password
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Notification Preferences</CardTitle>
              <CardDescription>
                Manage how you receive notifications from YM Movement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <div>
                  <Label htmlFor="email-notifications" className="font-semibold text-slate-800">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Receive email notifications about lesson bookings, cancellations, and updates.
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <div>
                  <Label htmlFor="reminder-notifications" className="font-semibold text-slate-800">
                    Lesson Reminders
                  </Label>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Receive email reminders 24 hours before your scheduled lessons.
                  </p>
                </div>
                <Switch
                  id="reminder-notifications"
                  checked={reminderNotifications}
                  onCheckedChange={setReminderNotifications}
                  disabled={!emailNotifications}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Appearance</CardTitle>
              <CardDescription>Customize the visual appearance of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <div>
                  <Label htmlFor="dark-mode" className="font-semibold text-slate-400">
                    Dark Mode
                  </Label>
                  <p className="text-sm text-slate-400">Coming soon</p>
                </div>
                <Switch id="dark-mode" checked={false} disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Password Security</CardTitle>
              <CardDescription>Change your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
