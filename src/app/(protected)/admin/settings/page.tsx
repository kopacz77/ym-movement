"use client";

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, DollarSign, MapPin, Save } from 'lucide-react';
import { PaymentMethod, RinkArea as PrismaRinkArea } from "@prisma/client";

// Define interfaces for the settings
interface OperationalSettings {
  days: {
    [key: string]: {
      active: boolean;
      startTime: string;
      endTime: string;
    }
  };
  defaultLessonDuration: string;
  minBookingNotice: number;
  cancellationDeadline: number;
  allowOverlapping: boolean;
  autoApproval: boolean;
}

interface PaymentSettings {
  methods: {
    venmo: {
      enabled: boolean;
      username: string;
    };
    zelle: {
      enabled: boolean;
      phone: string;
    };
    cash: {
      enabled: boolean;
    };
  };
  defaultPricing: {
    private: number;
    group: number;
    choreography: number;
    competition: number;
  };
  levelBasedPricing: {
    enabled: boolean;
    adjustments: {
      level: string;
      amount: number;
      type: 'percent' | 'fixed';
    }[];
  };
}

interface RinkAreaSettings {
  name: string;
  active: boolean;
  default: boolean;
}

interface Rink {
  id: string;
  name: string;
  address: string;
  timezone: string;
  maxCapacity: number | null;
}

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

  // State for settings
  const [operationalSettings, setOperationalSettings] = useState<OperationalSettings>({
    days: {
      monday: { active: true, startTime: '09:00', endTime: '18:00' },
      tuesday: { active: true, startTime: '09:00', endTime: '18:00' },
      wednesday: { active: true, startTime: '09:00', endTime: '18:00' },
      thursday: { active: true, startTime: '09:00', endTime: '18:00' },
      friday: { active: true, startTime: '09:00', endTime: '18:00' },
      saturday: { active: true, startTime: '09:00', endTime: '18:00' },
      sunday: { active: false, startTime: '', endTime: '' },
    },
    defaultLessonDuration: '60',
    minBookingNotice: 24,
    cancellationDeadline: 48,
    allowOverlapping: false,
    autoApproval: true,
  });

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    methods: {
      venmo: { enabled: true, username: '@yura-min' },
      zelle: { enabled: true, phone: '+1 (714) 743-7071' },
      cash: { enabled: false },
    },
    defaultPricing: {
      private: 75,
      group: 45,
      choreography: 90,
      competition: 95,
    },
    levelBasedPricing: {
      enabled: true,
      adjustments: [
        { level: 'SENIOR', amount: 15, type: 'percent' },
        { level: 'JUNIOR', amount: 10, type: 'percent' },
        { level: 'NOVICE', amount: 5, type: 'percent' },
      ],
    },
  });

  const [rinkAreas, setRinkAreas] = useState<RinkAreaSettings[]>([
    { name: 'Main Rink', active: true, default: true },
    { name: 'Practice Rink', active: true, default: false },
    { name: 'Dance Studio', active: true, default: false },
  ]);

  // Fetch rinks data
  const { data: rinks, isLoading: isLoadingRinks } = api.admin.schedule.getRinks.useQuery();

  // Define the mutation for saving settings
  const saveSettingsMutation = api.admin.settings.saveSettings.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      toast("Settings saved", {
        description: "Your changes have been applied successfully.",
      });
    },
    onError: (error: any) => {
      setIsSaving(false);
      toast.error("Error", {
        description: "Failed to save settings: " + error.message,
      });
    }
  });

  // Fetch settings from API
  const { data: savedSettings } = api.admin.settings.getSettings.useQuery();

  // Update settings when data is loaded
  useEffect(() => {
    if (savedSettings) {
      if (savedSettings.operational) setOperationalSettings(savedSettings.operational);
      if (savedSettings.payment) setPaymentSettings(savedSettings.payment);
      if (savedSettings.rinkAreas) setRinkAreas(savedSettings.rinkAreas);
    }
  }, [savedSettings]);

  // Handle changes for operational settings
  const handleDaySettingChange = (day: string, field: 'active' | 'startTime' | 'endTime', value: boolean | string) => {
    setOperationalSettings(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: {
          ...prev.days[day],
          [field]: value,
        },
      },
    }));
  };

  // Handle changes for payment settings
  const handlePaymentMethodChange = (method: 'venmo' | 'zelle' | 'cash', field: string, value: boolean | string) => {
    setPaymentSettings(prev => ({
      ...prev,
      methods: {
        ...prev.methods,
        [method]: {
          ...prev.methods[method as keyof typeof prev.methods],
          [field]: value,
        },
      },
    }));
  };

  const handlePricingChange = (lessonType: keyof PaymentSettings['defaultPricing'], value: number) => {
    setPaymentSettings(prev => ({
      ...prev,
      defaultPricing: {
        ...prev.defaultPricing,
        [lessonType]: value,
      },
    }));
  };

  const handleLevelAdjustmentChange = (index: number, field: 'amount' | 'type', value: number | string) => {
    setPaymentSettings(prev => {
      const newAdjustments = [...prev.levelBasedPricing.adjustments];
      newAdjustments[index] = {
        ...newAdjustments[index],
        [field]: field === 'amount' ? Number(value) : value as 'percent' | 'fixed',
      };
      return {
        ...prev,
        levelBasedPricing: {
          ...prev.levelBasedPricing,
          adjustments: newAdjustments,
        },
      };
    });
  };

  // Handle changes for rink areas
  const handleRinkAreaChange = (index: number, field: 'active' | 'default', value: boolean) => {
    setRinkAreas(prev => {
      const newAreas = [...prev];
      // If setting a new default, unset the old default
      if (field === 'default' && value === true) {
        newAreas.forEach((area, i) => {
          if (i !== index) {
            area.default = false;
          }
        });
      }
      newAreas[index] = {
        ...newAreas[index],
        [field]: value,
      };
      return newAreas;
    });
  };

  // Save all settings
  const handleSave = () => {
    setIsSaving(true);
    saveSettingsMutation.mutate({
      operational: operationalSettings,
      payment: paymentSettings,
      rinkAreas: rinkAreas,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="operational">
        <TabsList className="w-full border-b mb-4 pb-0">
          <TabsTrigger value="operational" className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Operational Hours
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            Payment & Pricing
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            Rink Management
          </TabsTrigger>
        </TabsList>

        {/* Operational Hours Settings */}
        <TabsContent value="operational">
          <Card>
            <CardHeader>
              <CardTitle>Operational Hours</CardTitle>
              <CardDescription>
                Configure the default business hours and scheduling settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Business Hours</h3>
                  {Object.entries(operationalSettings.days).map(([day, settings]) => (
                    <div key={day} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`${day.toLowerCase()}-active`}
                          checked={settings.active}
                          onCheckedChange={(checked) => handleDaySettingChange(day, 'active', checked)}
                        />
                        <Label htmlFor={`${day.toLowerCase()}-active`}>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="time"
                          className="w-32"
                          value={settings.startTime}
                          onChange={(e) => handleDaySettingChange(day, 'startTime', e.target.value)}
                          disabled={!settings.active}
                        />
                        <span>-</span>
                        <Input
                          type="time"
                          className="w-32"
                          value={settings.endTime}
                          onChange={(e) => handleDaySettingChange(day, 'endTime', e.target.value)}
                          disabled={!settings.active}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Scheduling Settings</h3>
                  <div className="space-y-2">
                    <Label htmlFor="default-lesson-duration">Default Lesson Duration (minutes)</Label>
                    <Select
                      value={operationalSettings.defaultLessonDuration}
                      onValueChange={(value) => setOperationalSettings(prev => ({ ...prev, defaultLessonDuration: value }))}
                    >
                      <SelectTrigger id="default-lesson-duration">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                        <SelectItem value="120">120 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min-booking-notice">Minimum Booking Notice (hours)</Label>
                    <Input
                      id="min-booking-notice"
                      type="number"
                      value={operationalSettings.minBookingNotice}
                      onChange={(e) => setOperationalSettings(prev => ({ ...prev, minBookingNotice: Number(e.target.value) }))}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cancellation-deadline">Cancellation Deadline (hours)</Label>
                    <Input
                      id="cancellation-deadline"
                      type="number"
                      value={operationalSettings.cancellationDeadline}
                      onChange={(e) => setOperationalSettings(prev => ({ ...prev, cancellationDeadline: Number(e.target.value) }))}
                      min="0"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      id="allow-overlapping"
                      checked={operationalSettings.allowOverlapping}
                      onCheckedChange={(checked) => setOperationalSettings(prev => ({ ...prev, allowOverlapping: checked }))}
                    />
                    <Label htmlFor="allow-overlapping">Allow overlapping lessons</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-approval"
                      checked={operationalSettings.autoApproval}
                      onCheckedChange={(checked) => setOperationalSettings(prev => ({ ...prev, autoApproval: checked }))}
                    />
                    <Label htmlFor="auto-approval">Automatically approve bookings</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment & Pricing Settings */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Payment & Pricing</CardTitle>
              <CardDescription>
                Configure payment methods and default pricing for different lesson types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Payment Methods</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="venmo-enabled"
                        checked={paymentSettings.methods.venmo.enabled}
                        onCheckedChange={(checked) => handlePaymentMethodChange('venmo', 'enabled', checked)}
                      />
                      <Label htmlFor="venmo-enabled">Venmo</Label>
                    </div>
                    <Input
                      className="w-48"
                      placeholder="@venmo-username"
                      value={paymentSettings.methods.venmo.username}
                      onChange={(e) => handlePaymentMethodChange('venmo', 'username', e.target.value)}
                      disabled={!paymentSettings.methods.venmo.enabled}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="zelle-enabled"
                        checked={paymentSettings.methods.zelle.enabled}
                        onCheckedChange={(checked) => handlePaymentMethodChange('zelle', 'enabled', checked)}
                      />
                      <Label htmlFor="zelle-enabled">Zelle</Label>
                    </div>
                    <Input
                      className="w-48"
                      placeholder="+1 (123) 456-7890"
                      value={paymentSettings.methods.zelle.phone}
                      onChange={(e) => handlePaymentMethodChange('zelle', 'phone', e.target.value)}
                      disabled={!paymentSettings.methods.zelle.enabled}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="cash-enabled"
                        checked={paymentSettings.methods.cash.enabled}
                        onCheckedChange={(checked) => handlePaymentMethodChange('cash', 'enabled', checked)}
                      />
                      <Label htmlFor="cash-enabled">Cash</Label>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Default Pricing</h3>
                  <div className="space-y-2">
                    <Label htmlFor="private-lesson-price">Private Lesson Price ($)</Label>
                    <Input
                      id="private-lesson-price"
                      type="number"
                      value={paymentSettings.defaultPricing.private}
                      onChange={(e) => handlePricingChange('private', Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-lesson-price">Group Lesson Price ($)</Label>
                    <Input
                      id="group-lesson-price"
                      type="number"
                      value={paymentSettings.defaultPricing.group}
                      onChange={(e) => handlePricingChange('group', Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="choreography-price">Choreography Lesson Price ($)</Label>
                    <Input
                      id="choreography-price"
                      type="number"
                      value={paymentSettings.defaultPricing.choreography}
                      onChange={(e) => handlePricingChange('choreography', Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="competition-price">Competition Prep Price ($)</Label>
                    <Input
                      id="competition-price"
                      type="number"
                      value={paymentSettings.defaultPricing.competition}
                      onChange={(e) => handlePricingChange('competition', Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Pricing Rules</h3>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="level-based-pricing"
                    checked={paymentSettings.levelBasedPricing.enabled}
                    onCheckedChange={(checked) => setPaymentSettings(prev => ({ ...prev, levelBasedPricing: { ...prev.levelBasedPricing, enabled: checked } }))}
                  />
                  <Label htmlFor="level-based-pricing">Enable level-based pricing adjustments</Label>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skill Level</TableHead>
                      <TableHead>Price Adjustment</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentSettings.levelBasedPricing.adjustments.map((adjustment, index) => (
                      <TableRow key={adjustment.level}>
                        <TableCell>{adjustment.level}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={adjustment.amount}
                            onChange={(e) => handleLevelAdjustmentChange(index, 'amount', Number(e.target.value))}
                            className="w-20"
                            disabled={!paymentSettings.levelBasedPricing.enabled}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={adjustment.type}
                            onValueChange={(value: 'percent' | 'fixed') => handleLevelAdjustmentChange(index, 'type', value)}
                            disabled={!paymentSettings.levelBasedPricing.enabled}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percent">Percent (%)</SelectItem>
                              <SelectItem value="fixed">Fixed ($)</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rink Management Settings */}
        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Rink Management</CardTitle>
              <CardDescription>
                Manage all the rink locations where lessons are held
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Rink Locations</h3>
                <Button variant="outline" size="sm">
                  Add New Rink
                </Button>
              </div>
              {isLoadingRinks ? (
                <div className="h-32 flex items-center justify-center">
                  <p>Loading rinks data...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Timezone</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rinks?.map((rink: Rink) => (
                      <TableRow key={rink.id}>
                        <TableCell className="font-medium">{rink.name}</TableCell>
                        <TableCell>{rink.address}</TableCell>
                        <TableCell>{rink.timezone}</TableCell>
                        <TableCell>{rink.maxCapacity}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <Separator />
              <h3 className="text-lg font-medium">Rink Areas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rinkAreas.map((area, index) => (
                  <Card key={area.name}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{area.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Active</span>
                          <Switch
                            checked={area.active}
                            onCheckedChange={(checked) => handleRinkAreaChange(index, 'active', checked)}
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Default</span>
                          <Switch
                            checked={area.default}
                            onCheckedChange={(checked) => handleRinkAreaChange(index, 'default', checked)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}