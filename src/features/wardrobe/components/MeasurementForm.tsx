// src/features/wardrobe/components/MeasurementForm.tsx
//
// Student body-measurement editor. Hydrates from wardrobe.measurements.get
// and persists via wardrobe.measurements.update. cm is canonical (Phase 13
// schema columns are Int cm); inches are computed per-field as a read-only
// helper to the right of each input — NOT stored.
//
// Pattern: RHF + zodResolver, defaults via measurementUpdateSchema.parse({}),
// rehydrate via form.reset(data) in useEffect when query resolves (avoids
// remount flicker — see 14-04 ADR). Empty-string inputs map to null, NEVER 0
// (MEASURE-02). measurementsUpdatedAt is stamped server-side on every save,
// regardless of whether any field actually changed (MEASURE-03).

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { measurementUpdateSchema } from "@/features/wardrobe/api/queries/measurementQueries";
import { api } from "@/lib/api";

// Two-flavor schema typing: every field is .nullable().optional() so the
// *input* shape allows undefined while the *output* shape after parse is
// nullable but never undefined. useForm needs the input type for TFieldValues
// (so register() doesn't choke on "field cleared" -> undefined); the submit
// handler receives the output type (TS knows null vs number at the wire).
type FormInput = z.input<typeof measurementUpdateSchema>;
type FormOutput = z.output<typeof measurementUpdateSchema>;

// Numeric setValueAs: empty string and null both map to null (NOT 0). HTML
// number inputs report "" when the user clears the field; without this the
// server would receive an undefined (untouched) when the user actually meant
// "clear this measurement".
const numericSetValueAs = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) {
    return null;
  }
  const parsed = Number.parseInt(String(v), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

// Local pure helper — cm to inches for the readout. 1 inch = 2.54 cm.
const cmToInchesDisplay = (cm: number | null | undefined): string => {
  if (cm == null) {
    return "—";
  }
  return (cm / 2.54).toFixed(1);
};

// Numeric field definitions, paired into 2-column rows on md+.
const NUMERIC_FIELDS = [
  { name: "heightCm" as const, label: "Height" },
  { name: "chestCm" as const, label: "Chest" },
  { name: "waistCm" as const, label: "Waist" },
  { name: "hipsCm" as const, label: "Hips" },
  { name: "torsoCm" as const, label: "Torso" },
  { name: "inseamCm" as const, label: "Inseam" },
  { name: "sleeveLengthCm" as const, label: "Sleeve length" },
];

export function MeasurementForm() {
  const utils = api.useUtils();
  const { data, isLoading, error } = api.wardrobe.measurements.get.useQuery();

  const update = api.wardrobe.measurements.update.useMutation({
    onSuccess: () => {
      utils.wardrobe.measurements.get.invalidate();
      toast.success("Measurements saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(measurementUpdateSchema),
    // Zod schema fields are all .optional(); parse({}) yields {} — every field
    // undefined, which RHF treats as "untouched" until the user types.
    defaultValues: measurementUpdateSchema.parse({}),
  });

  // Rehydrate once the get query resolves. RHF only consumes defaultValues on
  // first mount, so explicitly reset() once data lands. Stable form ref means
  // this won't loop. Match WardrobeSettingsForm 14-04 ADR pattern.
  useEffect(() => {
    if (data) {
      form.reset({
        heightCm: data.heightCm,
        chestCm: data.chestCm,
        waistCm: data.waistCm,
        hipsCm: data.hipsCm,
        torsoCm: data.torsoCm,
        inseamCm: data.inseamCm,
        sleeveLengthCm: data.sleeveLengthCm,
        preferredFitNotes: data.preferredFitNotes,
      });
    }
  }, [data, form]);

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(values);
  });

  // Watch all numeric fields for the inches readout. 7 fields × keystroke
  // re-renders is well within React's render budget for a profile editor.
  const watched = form.watch();

  // NOT_FOUND from get() means the caller has no Student row (admin/coach
  // viewing /wardrobe/measurements). Show a graceful message.
  if (error?.data?.code === "NOT_FOUND") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] p-8">
        <p className="text-sm text-slate-600">
          Your student profile is missing — contact your coach to set one up.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-96 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] p-8 space-y-4">
          <div className="h-10 bg-slate-100 rounded animate-pulse" />
          <div className="h-10 bg-slate-100 rounded animate-pulse" />
          <div className="h-10 bg-slate-100 rounded animate-pulse" />
          <div className="h-10 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const lastUpdated = data?.measurementsUpdatedAt
    ? format(data.measurementsUpdatedAt, "PPP 'at' p")
    : "Never";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#1a3a5c]">Your Measurements</h1>
        <p className="text-sm text-slate-500">
          Used to filter and rank dresses by fit. Last updated: {lastUpdated}
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)] p-8 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NUMERIC_FIELDS.map((field) => {
            const value = watched[field.name] as number | null | undefined;
            const fieldError = form.formState.errors[field.name];
            return (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={field.name}
                    type="number"
                    step={1}
                    placeholder="cm"
                    {...form.register(field.name, { setValueAs: numericSetValueAs })}
                  />
                  <span className="text-xs text-slate-500 w-16 text-right">
                    {cmToInchesDisplay(value)} in
                  </span>
                </div>
                {fieldError && <p className="text-xs text-rose-600">{fieldError.message}</p>}
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferredFitNotes">Preferred fit notes</Label>
          <Textarea
            id="preferredFitNotes"
            rows={4}
            placeholder="Anything a dress owner should know about how you prefer dresses to fit (e.g. snug at waist, room at hips)."
            {...form.register("preferredFitNotes", {
              setValueAs: (v) => (v === "" || v == null ? null : String(v)),
            })}
          />
          {form.formState.errors.preferredFitNotes && (
            <p className="text-xs text-rose-600">
              {form.formState.errors.preferredFitNotes.message}
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <Button
            type="submit"
            disabled={update.isPending}
            className="bg-[#0891b2] hover:bg-[#0e7490] text-white"
          >
            {update.isPending ? "Saving..." : "Save Measurements"}
          </Button>
        </div>
      </form>
    </div>
  );
}
