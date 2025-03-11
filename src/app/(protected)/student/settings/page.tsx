// src/app/(protected)/student/settings/page.tsx
"use client";
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BellRing, Lock, PaintBucket } from 'lucide-react';
import { toast } from "sonner";
import ChangePasswordForm from '@/features/auth/components/ChangePasswordForm';

export default function StudentSettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [reminderNotifications, setReminderNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  
  const handleSaveSettings = () => {
    // In a real app, this would save the settings to the backend
    toast("Settings saved", {
      description: "Your preferences have been updated.",
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>
      
      <Tabs defaultValue="notifications">
        <TabsList className="mb-4">
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
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how you receive notifications from YM Movement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications about lesson bookings, cancellations, and updates.
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="reminder-notifications" className="font-medium">Lesson Reminders</Label>
                  <p className="text-sm text-muted-foreground">
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
              
              <div className="flex justify-end mt-4">
                <Button onClick={handleSaveSettings}>Save Notification Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the visual appearance of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use dark color theme for the application.
                  </p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
              
              <div className="flex justify-end mt-4">
                <Button onClick={handleSaveSettings}>Save Appearance Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Password Security</CardTitle>
              <CardDescription>
                Change your password to keep your account secure
              </CardDescription>
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