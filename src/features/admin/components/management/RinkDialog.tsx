// src/features/admin/components/management/RinkDialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { delightfulToast } from "@/lib/delightful-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

const rinkFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  address: z.string().min(1, "Address is required").max(200, "Address is too long"),
  timezone: z.string().min(1, "Timezone is required"),
  maxCapacity: z.coerce
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .max(1000, "Capacity is too high"),
});

type RinkFormValues = z.infer<typeof rinkFormSchema>;

interface Rink {
  id: string;
  name: string;
  address: string;
  timezone: string;
  maxCapacity: number | null;
}

interface RinkDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rink?: Rink | null;
  onSuccess: () => void;
}

// Common timezone options
const TIMEZONE_OPTIONS = [
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Detroit", label: "Eastern Time (Detroit)" },
  { value: "America/Toronto", label: "Eastern Time (Toronto)" },
  { value: "America/Vancouver", label: "Pacific Time (Vancouver)" },
  { value: "Europe/London", label: "GMT (London)" },
  { value: "Europe/Paris", label: "CET (Paris)" },
  { value: "Asia/Tokyo", label: "JST (Tokyo)" },
];

export function RinkDialog({ isOpen, onOpenChange, rink, onSuccess }: RinkDialogProps) {
  const utils = api.useContext();
  const isEditing = !!rink;

  const form = useForm<RinkFormValues>({
    resolver: zodResolver(rinkFormSchema),
    defaultValues: {
      name: "",
      address: "",
      timezone: "America/Los_Angeles",
      maxCapacity: 50,
    },
  });

  // Reset form when dialog opens/closes or rink changes
  useEffect(() => {
    if (isOpen) {
      if (rink) {
        form.reset({
          name: rink.name,
          address: rink.address,
          timezone: rink.timezone,
          maxCapacity: rink.maxCapacity || 50,
        });
      } else {
        form.reset({
          name: "",
          address: "",
          timezone: "America/Los_Angeles",
          maxCapacity: 50,
        });
      }
    }
  }, [isOpen, rink, form]);

  const createMutation = api.admin.schedule.createRink.useMutation({
    onSuccess: (result) => {
      delightfulToast.success(
        `Perfect! ${result.message} 💕`,
        "Your rink family is growing!",
        "admin",
      );
      utils.admin.schedule.getRinks.invalidate();
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      delightfulToast.error(error.message, "admin");
    },
  });

  const updateMutation = api.admin.schedule.updateRink.useMutation({
    onSuccess: (result) => {
      delightfulToast.success(
        `Beautiful! ${result.message} ✨`,
        "Your coaching locations are perfectly organized!",
        "admin",
      );
      utils.admin.schedule.getRinks.invalidate();
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      delightfulToast.error(error.message, "admin");
    },
  });

  const onSubmit = (values: RinkFormValues) => {
    if (isEditing && rink) {
      updateMutation.mutate({
        id: rink.id,
        ...values,
      });
    } else {
      createMutation.mutate(values);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {isEditing ? "Edit Rink" : "Add New Rink"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the rink information below."
              : "Add a new rink location where lessons can be held."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rink Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Anaheim Ice" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Ice Rink Ave, City, State 12345" {...field} />
                  </FormControl>
                  <FormDescription>
                    Full address including city, state, and postal code
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Timezone for scheduling at this location</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Capacity</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="1000" placeholder="50" {...field} />
                  </FormControl>
                  <FormDescription>
                    Maximum number of students that can be on the ice at once
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? isEditing
                    ? "Updating..."
                    : "Creating..."
                  : isEditing
                    ? "Update Rink"
                    : "Create Rink"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
