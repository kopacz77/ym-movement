// src/app/(protected)/admin/settings/page.tsx
"use client";

import { Clock, DollarSign, Edit, Lock, MapPin, Save, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DefaultPricingSettings } from "@/features/admin/components/management/DefaultPricingSettings";
import { RinkDialog } from "@/features/admin/components/management/RinkDialog";
import ChangePasswordForm from "@/features/auth/components/ChangePasswordForm";
import { api } from "@/lib/api";
import { delightfulToast } from "@/lib/delightful-toast";
import { showDeleteConfirmation } from "@/lib/toast-confirmations";

// Define interfaces for the settings
interface OperationalSettings {
  days: {
    [key: string]: {
      active: boolean;
      startTime: string;
      endTime: string;
    };
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
      type: "percent" | "fixed";
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

interface ApiError {
  message: string;
}

export default function SettingsPage() {
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  const [isSaving, setIsSaving] = useState(false);
  const [isRinkDialogOpen, setIsRinkDialogOpen] = useState(false);
  const [editingRink, setEditingRink] = useState<Rink | null>(null);

  // State for settings - initialize with null to prevent hardcoded defaults showing before API loads
  const [operationalSettings, setOperationalSettings] = useState<OperationalSettings | null>(null);

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    methods: {
      venmo: { enabled: true, username: "@yura-min" },
      zelle: { enabled: true, phone: "+1 (714) 743-7071" },
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
        { level: "SENIOR", amount: 15, type: "percent" },
        { level: "JUNIOR", amount: 10, type: "percent" },
        { level: "NOVICE", amount: 5, type: "percent" },
      ],
    },
  });

  const [rinkAreas, setRinkAreas] = useState<RinkAreaSettings[]>([
    { name: "Main Rink", active: true, default: true },
    { name: "Practice Rink", active: true, default: false },
    { name: "Dance Studio", active: true, default: false },
  ]);

  // Fetch rinks data - only when authenticated to prevent 401 race condition
  const { data: rinks, isLoading: isLoadingRinks } = api.admin.schedule.getRinks.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Delete rink mutation
  const deleteRinkMutation = api.admin.schedule.deleteRink.useMutation({
    onSuccess: (result) => {
      delightfulToast.success(
        `Perfect! ${result.message} ✨`,
        "Your coaching space is beautifully organized!",
        "admin",
      );
    },
    onError: (error) => {
      delightfulToast.error(error.message, "admin");
    },
  });

  // Define the mutation for saving settings
  const saveSettingsMutation = api.admin.settings.saveSettings.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      toast("Settings saved", {
        description: "Your changes have been applied successfully.",
      });
    },
    onError: (error: ApiError) => {
      setIsSaving(false);
      toast.error("Error", {
        description: `Failed to save settings: ${error.message}`,
      });
    },
  });

  // Fetch settings from API - only when authenticated to prevent 401 race condition
  const { data: savedSettings } = api.admin.settings.getSettings.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Update settings when data is loaded - only set once API data arrives
  useEffect(() => {
    if (savedSettings) {
      // Set operational settings from API (no hardcoded fallback)
      if (savedSettings.operational) {
        setOperationalSettings(savedSettings.operational);
      }
      if (savedSettings.payment) {
        setPaymentSettings(savedSettings.payment);
      }
      if (savedSettings.rinkAreas) {
        setRinkAreas(savedSettings.rinkAreas);
      }
    }
  }, [savedSettings]);

  // Handle changes for operational settings
  const handleDaySettingChange = (
    day: string,
    field: "active" | "startTime" | "endTime",
    value: boolean | string,
  ) => {
    setOperationalSettings((prev) => {
      if (!prev) {
        return prev; // Don't update if not loaded yet
      }
      return {
        ...prev,
        days: {
          ...prev.days,
          [day]: {
            ...prev.days[day],
            [field]: value,
          },
        },
      };
    });
  };

  // Handle changes for payment settings
  const handlePaymentMethodChange = (
    method: "venmo" | "zelle" | "cash",
    field: string,
    value: boolean | string,
  ) => {
    setPaymentSettings((prev) => ({
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

  const _handlePricingChange = (
    lessonType: keyof PaymentSettings["defaultPricing"],
    value: number,
  ) => {
    setPaymentSettings((prev) => ({
      ...prev,
      defaultPricing: {
        ...prev.defaultPricing,
        [lessonType]: value,
      },
    }));
  };

  const handleLevelAdjustmentChange = (
    index: number,
    field: "amount" | "type",
    value: number | string,
  ) => {
    setPaymentSettings((prev) => {
      const newAdjustments = [...prev.levelBasedPricing.adjustments];
      newAdjustments[index] = {
        ...newAdjustments[index],
        [field]: field === "amount" ? Number(value) : (value as "percent" | "fixed"),
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
  const handleRinkAreaChange = (index: number, field: "active" | "default", value: boolean) => {
    setRinkAreas((prev) => {
      const newAreas = [...prev];
      // If setting a new default, unset the old default
      if (field === "default" && value === true) {
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
    if (!operationalSettings) {
      return; // Don't save if settings not loaded yet
    }
    setIsSaving(true);
    saveSettingsMutation.mutate({
      operational: operationalSettings,
      payment: paymentSettings,
      rinkAreas: rinkAreas,
    });
  };

  // Rink management handlers
  const handleAddRink = () => {
    setEditingRink(null);
    setIsRinkDialogOpen(true);
  };

  const handleEditRink = (rink: Rink) => {
    setEditingRink(rink);
    setIsRinkDialogOpen(true);
  };

  const handleDeleteRink = (rink: Rink) => {
    showDeleteConfirmation(`rink "${rink.name}"`, () => {
      deleteRinkMutation.mutate({ id: rink.id });
    });
  };

  const handleRinkDialogClose = () => {
    setIsRinkDialogOpen(false);
    setEditingRink(null);
  };

  return (
    <div className="container mx-auto py-4 lg:py-6 space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <Button
          onClick={handleSave}
          disabled={isSaving || !operationalSettings}
          className="self-start sm:self-auto"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : operationalSettings ? "Save Changes" : "Loading..."}
        </Button>
      </div>

      <Tabs defaultValue="operational">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b mb-4 pb-0">
          <TabsTrigger value="operational" className="flex items-center text-xs sm:text-sm">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Operational Hours</span>
            <span className="sm:hidden">Hours</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center text-xs sm:text-sm">
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Payment & Pricing</span>
            <span className="sm:hidden">Pricing</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center text-xs sm:text-sm">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Rink Management</span>
            <span className="sm:hidden">Rinks</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center text-xs sm:text-sm">
            <Lock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Account Security</span>
            <span className="sm:hidden">Account</span>
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
              {operationalSettings ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Business Hours</h3>
                    {Object.entries(operationalSettings.days).map(([day, settings]) => (
                      <div
                        key={day}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0"
                      >
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`${day.toLowerCase()}-active`}
                            checked={settings.active}
                            onCheckedChange={(checked) =>
                              handleDaySettingChange(day, "active", checked)
                            }
                          />
                          <Label htmlFor={`${day.toLowerCase()}-active`} className="min-w-[80px]">
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 ml-8 sm:ml-0">
                          <Input
                            type="time"
                            className="w-28 sm:w-32"
                            value={settings.startTime}
                            onChange={(e) =>
                              handleDaySettingChange(day, "startTime", e.target.value)
                            }
                            disabled={!settings.active}
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="time"
                            className="w-28 sm:w-32"
                            value={settings.endTime}
                            onChange={(e) => handleDaySettingChange(day, "endTime", e.target.value)}
                            disabled={!settings.active}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Scheduling Settings</h3>
                    <div className="space-y-2">
                      <Label htmlFor="default-lesson-duration" className="w-full">
                        Default Lesson Duration (minutes)
                      </Label>
                      <Select
                        value={operationalSettings.defaultLessonDuration}
                        onValueChange={(value) =>
                          setOperationalSettings((prev) =>
                            prev ? { ...prev, defaultLessonDuration: value } : prev,
                          )
                        }
                      >
                        <SelectTrigger id="default-lesson-duration" className="w-full">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30" className="w-full">
                            30 minutes
                          </SelectItem>
                          <SelectItem value="45" className="w-full">
                            45 minutes
                          </SelectItem>
                          <SelectItem value="60" className="w-full">
                            60 minutes
                          </SelectItem>
                          <SelectItem value="90" className="w-full">
                            90 minutes
                          </SelectItem>
                          <SelectItem value="120" className="w-full">
                            120 minutes
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min-booking-notice">Minimum Booking Notice (hours)</Label>
                      <Input
                        id="min-booking-notice"
                        type="number"
                        value={operationalSettings.minBookingNotice}
                        onChange={(e) =>
                          setOperationalSettings((prev) =>
                            prev ? { ...prev, minBookingNotice: Number(e.target.value) } : prev,
                          )
                        }
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cancellation-deadline">Cancellation Deadline (hours)</Label>
                      <Input
                        id="cancellation-deadline"
                        type="number"
                        value={operationalSettings.cancellationDeadline}
                        onChange={(e) =>
                          setOperationalSettings((prev) =>
                            prev ? { ...prev, cancellationDeadline: Number(e.target.value) } : prev,
                          )
                        }
                        min="0"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        id="allow-overlapping"
                        checked={operationalSettings.allowOverlapping}
                        onCheckedChange={(checked) =>
                          setOperationalSettings((prev) =>
                            prev ? { ...prev, allowOverlapping: checked } : prev,
                          )
                        }
                      />
                      <Label htmlFor="allow-overlapping">Allow overlapping lessons</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-approval"
                        checked={operationalSettings.autoApproval}
                        onCheckedChange={(checked) =>
                          setOperationalSettings((prev) =>
                            prev ? { ...prev, autoApproval: checked } : prev,
                          )
                        }
                      />
                      <Label htmlFor="auto-approval">Automatically approve bookings</Label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <p className="text-muted-foreground">Loading settings...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment & Pricing Settings */}
        <TabsContent value="pricing">
          <div className="space-y-6">
            {/* New Global Default Pricing Component */}
            <DefaultPricingSettings />

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Configure available payment methods for students</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="venmo-enabled"
                        checked={paymentSettings.methods.venmo.enabled}
                        onCheckedChange={(checked) =>
                          handlePaymentMethodChange("venmo", "enabled", checked)
                        }
                      />
                      <Label htmlFor="venmo-enabled">Venmo</Label>
                    </div>
                    <Input
                      className="w-48"
                      placeholder="@venmo-username"
                      value={paymentSettings.methods.venmo.username}
                      onChange={(e) =>
                        handlePaymentMethodChange("venmo", "username", e.target.value)
                      }
                      disabled={!paymentSettings.methods.venmo.enabled}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="zelle-enabled"
                        checked={paymentSettings.methods.zelle.enabled}
                        onCheckedChange={(checked) =>
                          handlePaymentMethodChange("zelle", "enabled", checked)
                        }
                      />
                      <Label htmlFor="zelle-enabled">Zelle</Label>
                    </div>
                    <Input
                      className="w-48"
                      placeholder="+1 (123) 456-7890"
                      value={paymentSettings.methods.zelle.phone}
                      onChange={(e) => handlePaymentMethodChange("zelle", "phone", e.target.value)}
                      disabled={!paymentSettings.methods.zelle.enabled}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="cash-enabled"
                        checked={paymentSettings.methods.cash.enabled}
                        onCheckedChange={(checked) =>
                          handlePaymentMethodChange("cash", "enabled", checked)
                        }
                      />
                      <Label htmlFor="cash-enabled">Cash</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Level-Based Pricing</CardTitle>
                <CardDescription>Configure price adjustments based on skater level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="level-based-pricing"
                    checked={paymentSettings.levelBasedPricing.enabled}
                    onCheckedChange={(checked) =>
                      setPaymentSettings((prev) => ({
                        ...prev,
                        levelBasedPricing: {
                          ...prev.levelBasedPricing,
                          enabled: checked,
                        },
                      }))
                    }
                  />
                  <Label htmlFor="level-based-pricing">
                    Enable level-based pricing adjustments
                  </Label>
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
                            onChange={(e) =>
                              handleLevelAdjustmentChange(index, "amount", Number(e.target.value))
                            }
                            className="w-20"
                            disabled={!paymentSettings.levelBasedPricing.enabled}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={adjustment.type}
                            onValueChange={(value: "percent" | "fixed") =>
                              handleLevelAdjustmentChange(index, "type", value)
                            }
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
              </CardContent>
            </Card>
          </div>
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
                <Button variant="outline" size="sm" onClick={handleAddRink}>
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
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditRink(rink)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRink(rink)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
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
                            onCheckedChange={(checked) =>
                              handleRinkAreaChange(index, "active", checked)
                            }
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Default</span>
                          <Switch
                            checked={area.default}
                            onCheckedChange={(checked) =>
                              handleRinkAreaChange(index, "default", checked)
                            }
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

        {/* Account Security Settings */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rink Management Dialog */}
      <RinkDialog
        isOpen={isRinkDialogOpen}
        onOpenChange={handleRinkDialogClose}
        rink={editingRink}
        onSuccess={() => {
          // Refresh rinks data after successful operation
          // The dialog handles closing and invalidation internally
        }}
      />
    </div>
  );
}
