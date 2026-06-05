"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type WardrobeSettings,
  wardrobeSettingsSchema,
} from "@/features/wardrobe/lib/wardrobeSettingsSchema";
import { api } from "@/lib/api";

// Two-flavor schema: every field has a Zod `.default()` so the *input* type has
// optionals while the *output* type has required numbers. useForm needs the
// input type for its TFieldValues; the submit handler receives the output type.
type FormInput = z.input<typeof wardrobeSettingsSchema>;
type FormOutput = z.output<typeof wardrobeSettingsSchema>;

/**
 * Admin form for editing global wardrobe defaults.
 *
 * Single source of truth: `wardrobeSettingsSchema` is imported from Phase 13's
 * queries file -- never redeclared. Initial values are hydrated via
 * `api.admin.wardrobeSettings.get` and re-synced with `form.reset(data)` once
 * the query resolves (handles the "data arrives after first render" race).
 */
export function WardrobeSettingsForm() {
  const utils = api.useUtils();
  const { data, isLoading } = api.admin.wardrobeSettings.get.useQuery();

  const update = api.admin.wardrobeSettings.update.useMutation({
    onSuccess: () => {
      utils.admin.wardrobeSettings.get.invalidate();
      toast.success("Wardrobe settings updated");
    },
    onError: (error) => toast.error("Failed to update settings", { description: error.message }),
  });

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(wardrobeSettingsSchema),
    // Zod .default()s on every field -> parse({}) yields the canonical defaults.
    defaultValues: wardrobeSettingsSchema.parse({}),
  });

  // Re-hydrate once the get query resolves. Without this the form would be
  // stuck on the static Zod defaults if the user has previously saved values.
  useEffect(() => {
    if (data) {
      form.reset(data);
    }
  }, [data, form]);

  const handleSubmit = form.handleSubmit((values) => {
    // values is the FormOutput (== WardrobeSettings) thanks to the third
    // useForm generic above -- Zod has already coerced .default()s into numbers.
    update.mutate(values satisfies WardrobeSettings);
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-xl">
        <div className="h-10 bg-slate-100 rounded animate-pulse" />
        <div className="h-10 bg-slate-100 rounded animate-pulse" />
        <div className="h-10 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="defaultConsignmentCommissionPct">Default consignment commission %</Label>
        <Input
          id="defaultConsignmentCommissionPct"
          type="number"
          min={0}
          max={100}
          step={1}
          {...form.register("defaultConsignmentCommissionPct", {
            valueAsNumber: true,
          })}
        />
        <p className="text-xs text-slate-500">
          Default commission applied to consigner dresses (0-100). Admin can override per dress.
        </p>
        {form.formState.errors.defaultConsignmentCommissionPct && (
          <p className="text-xs text-rose-600">
            {form.formState.errors.defaultConsignmentCommissionPct.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="wardrobeRentalRequestExpiryDays">Rental request expiry (days)</Label>
        <Input
          id="wardrobeRentalRequestExpiryDays"
          type="number"
          min={1}
          step={1}
          {...form.register("wardrobeRentalRequestExpiryDays", {
            valueAsNumber: true,
          })}
        />
        <p className="text-xs text-slate-500">
          Auto-expire pending rental requests after this many days.
        </p>
        {form.formState.errors.wardrobeRentalRequestExpiryDays && (
          <p className="text-xs text-rose-600">
            {form.formState.errors.wardrobeRentalRequestExpiryDays.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="wardrobeReturnReminderDays">Return reminder lead time (days)</Label>
        <Input
          id="wardrobeReturnReminderDays"
          type="number"
          min={1}
          step={1}
          {...form.register("wardrobeReturnReminderDays", {
            valueAsNumber: true,
          })}
        />
        <p className="text-xs text-slate-500">
          Email the renter this many days before the return date.
        </p>
        {form.formState.errors.wardrobeReturnReminderDays && (
          <p className="text-xs text-rose-600">
            {form.formState.errors.wardrobeReturnReminderDays.message}
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-slate-200">
        <Button
          type="submit"
          disabled={update.isPending}
          className="bg-[#0891b2] hover:bg-[#06748f] text-white"
        >
          {update.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}
