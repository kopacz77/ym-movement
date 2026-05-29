// src/features/wardrobe/components/DressFormCore.tsx
//
// Shared dress form composite. The single source of truth for field rendering,
// Zod validation (dollars at UI layer), and dollar↔cents conversion on submit.
//
// Used by:
//   - DressForm (admin)              — all fields visible, no locking
//   - ConsignerDressForm (consigner) — admin fields hidden, pricing+size lockable
//
// Public surface: DressFormCoreProps + DressFormValues + FieldVisibility +
// FieldLocking + the component itself.
//
// History: extracted from the 626-line src/features/wardrobe/components/admin/
// DressForm.tsx in Plan 18-03. The admin DressForm is now a thin wrapper that
// passes all-visible + all-unlocked.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DressCategory, DressCondition, DressStatus } from "@prisma/client";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DressInput } from "@/features/admin/api/queries/wardrobeDressQueries";

// -----------------------------------------------------------------------------
// Visibility + Locking props
// -----------------------------------------------------------------------------

/** Per-field visibility flags. Controls whether sections render at all. */
export interface FieldVisibility {
  /** false for consigner (CONSIGN-02) — admin-only audit field */
  showInternalNotes: boolean;
  /** false for consigner (CONSIGN-02) — server pulls from Settings */
  showCommissionPct: boolean;
  /** false for consigner (CONSIGN-02) — server uses schema defaults */
  showSecurityDepositAndCleaning: boolean;
  /** false for consigner — status auto-managed server-side */
  showStatusSelect: boolean;
}

/** Per-field locking flags. Controls disabled state on inputs. */
export interface FieldLocking {
  /**
   * CONSIGN-04: After first approval, consigners cannot edit pricing or size.
   * When true, all pricing + size inputs render disabled with a tooltip
   * explaining the lock. Admin always passes false.
   */
  lockPricingAndSize: boolean;
}

// -----------------------------------------------------------------------------
// Client-side schema
// -----------------------------------------------------------------------------
// We do NOT reuse dressInputSchema directly because the form layer needs:
//   1. Dollar inputs (humans don't think in cents) -> convert to cents in onSubmit
//   2. Empty-string -> undefined preprocessing for optional numeric inputs
//      (HTMLInputElement gives us "" not undefined when cleared)
//   3. Comma-separated raw strings for the tag arrays
//
// On submit we transform DressFormValues -> DressInput before handing to parent.

const optionalIntFromInput = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().int().nonnegative().optional(),
);

const requiredDollarsFromInput = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? Number.NaN : Number(v)),
  z.number().nonnegative(),
);

const optionalDollarsFromInput = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().nonnegative().optional(),
);

const requiredIntFromInput = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? Number.NaN : Number(v)),
  z.number().int().min(0).max(100),
);

const dressFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().min(1, "Description is required"),
  category: z.nativeEnum(DressCategory),
  themeTagsRaw: z.string().optional().default(""),
  color: z.string().min(1, "Color is required"),
  secondaryColorsRaw: z.string().optional().default(""),
  condition: z.nativeEnum(DressCondition),
  yearMade: optionalIntFromInput,
  sizeLabel: z.string().min(1, "Size label is required"),
  chestMinCm: optionalIntFromInput,
  chestMaxCm: optionalIntFromInput,
  waistMinCm: optionalIntFromInput,
  waistMaxCm: optionalIntFromInput,
  hipsMinCm: optionalIntFromInput,
  hipsMaxCm: optionalIntFromInput,
  torsoMinCm: optionalIntFromInput,
  torsoMaxCm: optionalIntFromInput,
  lengthCm: optionalIntFromInput,
  alterableSmaller: z.boolean().default(false),
  alterableLarger: z.boolean().default(false),
  competitionPriceUsd: requiredDollarsFromInput,
  seasonalPriceUsd: requiredDollarsFromInput,
  purchasePriceUsd: optionalDollarsFromInput,
  securityDepositUsd: requiredDollarsFromInput,
  cleaningFeeUsd: requiredDollarsFromInput,
  consignmentCommissionPct: requiredIntFromInput,
  internalNotes: z.string().optional().default(""),
  // status is rendered/edited only in edit mode + when visible; create mode hardcodes AVAILABLE server-side.
  status: z.nativeEnum(DressStatus).optional(),
});

export type DressFormValues = z.input<typeof dressFormSchema>;
type DressFormParsed = z.output<typeof dressFormSchema>;

const DEFAULTS: DressFormValues = {
  title: "",
  description: "",
  category: DressCategory.CLASSICAL,
  themeTagsRaw: "",
  color: "",
  secondaryColorsRaw: "",
  condition: DressCondition.LIKE_NEW,
  yearMade: undefined,
  sizeLabel: "",
  chestMinCm: undefined,
  chestMaxCm: undefined,
  waistMinCm: undefined,
  waistMaxCm: undefined,
  hipsMinCm: undefined,
  hipsMaxCm: undefined,
  torsoMinCm: undefined,
  torsoMaxCm: undefined,
  lengthCm: undefined,
  alterableSmaller: false,
  alterableLarger: false,
  // Dollar defaults that match the cents defaults in dressInputSchema:
  //   competitionPrice 5000c -> $50, seasonalPrice 37500c -> $375,
  //   securityDeposit 20000c -> $200, cleaningFee 3000c -> $30
  competitionPriceUsd: 50,
  seasonalPriceUsd: 375,
  purchasePriceUsd: undefined,
  securityDepositUsd: 200,
  cleaningFeeUsd: 30,
  consignmentCommissionPct: 0,
  internalNotes: "",
  status: undefined,
};

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

export interface DressFormCoreProps {
  mode: "create" | "edit";
  /**
   * Pre-populated form values for edit mode. Use cents->dollars conversion in
   * the parent before passing.
   */
  defaultValues?: Partial<DressFormValues>;
  /**
   * Called with the typed DressInput on a successful validated submit. The
   * parent owns the mutation and any post-success behavior (redirect, toast).
   */
  onSubmit: (input: DressInput & { status?: DressStatus }) => void;
  isSubmitting: boolean;
  /** Override the default submit button label. */
  submitLabel?: string;
  /** Per-field visibility flags — admin: all true, consigner: admin fields false. */
  fieldVisibility: FieldVisibility;
  /** Per-field locking flags — admin: never, consigner: post-approval. */
  fieldLocking: FieldLocking;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function DressFormCore({
  mode,
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  fieldVisibility,
  fieldLocking,
}: DressFormCoreProps) {
  const form = useForm<DressFormValues>({
    resolver: zodResolver(dressFormSchema) as never,
    defaultValues: { ...DEFAULTS, ...defaultValues },
  });

  // Edit-mode rehydration: defaultValues arrive after the byId query resolves.
  // RHF only consumes defaultValues on the first render, so we have to
  // explicitly form.reset() once they're available. form is a stable RHF
  // object; we intentionally exclude form.reset from deps to avoid re-running
  // on every render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    if (defaultValues) {
      form.reset({ ...DEFAULTS, ...defaultValues });
    }
  }, [defaultValues]);

  const handleSubmit = form.handleSubmit((rawValues) => {
    // After zodResolver runs, values are already coerced/preprocessed.
    const values = rawValues as unknown as DressFormParsed;

    const input: DressInput & { status?: DressStatus } = {
      title: values.title,
      description: values.description,
      category: values.category,
      themeTags: values.themeTagsRaw
        ? values.themeTagsRaw
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [],
      color: values.color,
      secondaryColors: values.secondaryColorsRaw
        ? values.secondaryColorsRaw
            .split(",")
            .map((c: string) => c.trim())
            .filter(Boolean)
        : [],
      condition: values.condition,
      yearMade: values.yearMade,
      sizeLabel: values.sizeLabel,
      chestMinCm: values.chestMinCm,
      chestMaxCm: values.chestMaxCm,
      waistMinCm: values.waistMinCm,
      waistMaxCm: values.waistMaxCm,
      hipsMinCm: values.hipsMinCm,
      hipsMaxCm: values.hipsMaxCm,
      torsoMinCm: values.torsoMinCm,
      torsoMaxCm: values.torsoMaxCm,
      lengthCm: values.lengthCm,
      alterableSmaller: values.alterableSmaller,
      alterableLarger: values.alterableLarger,
      // Dollars -> cents at the form boundary. All wardrobe money fields are
      // Int cents at DB and TRPC layer; dollars only exist for human display.
      competitionPrice: Math.round(values.competitionPriceUsd * 100),
      seasonalPrice: Math.round(values.seasonalPriceUsd * 100),
      purchasePrice:
        values.purchasePriceUsd !== undefined
          ? Math.round(values.purchasePriceUsd * 100)
          : undefined,
      securityDeposit: Math.round(values.securityDepositUsd * 100),
      cleaningFee: Math.round(values.cleaningFeeUsd * 100),
      consignmentCommissionPct: values.consignmentCommissionPct,
      internalNotes: values.internalNotes ? values.internalNotes : undefined,
      ...(mode === "edit" && values.status ? { status: values.status } : {}),
    };

    onSubmit(input);
  });

  const errors = form.formState.errors;

  // Status & Internal tab visibility — render iff at least one of its fields is shown.
  const showStatusTab = fieldVisibility.showStatusSelect || fieldVisibility.showInternalNotes;

  // Locked-input tooltip wrapper. Surfaces "Locked after first approval" copy on
  // any disabled pricing/size input. Only renders when lockPricingAndSize is true;
  // otherwise returns the bare child for zero-cost no-op semantics.
  const LockTooltip = ({ children }: { children: React.ReactNode }) => {
    if (!fieldLocking.lockPricingAndSize) {
      return <>{children}</>;
    }
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* biome-ignore lint/a11y/noNoninteractiveTabindex: Radix Tooltip requires a focusable, event-firing trigger; disabled inputs don't bubble events. Same pattern as WardrobeFilterBar (Plan 15-06). */}
          <span tabIndex={0} className="inline-block w-full">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>Locked after first approval. Contact admin to make changes.</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="measurements">Measurements</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            {showStatusTab && <TabsTrigger value="status">Status &amp; Internal</TabsTrigger>}
          </TabsList>

          {/* ----------------------------- General ----------------------------- */}
          <TabsContent value="general" className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...form.register("title")} />
              {errors.title && <p className="text-xs text-rose-600">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} {...form.register("description")} />
              {errors.description && (
                <p className="text-xs text-rose-600">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Controller
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DressCategory.CLASSICAL}>Classical</SelectItem>
                        <SelectItem value={DressCategory.DRAMATIC}>Dramatic</SelectItem>
                        <SelectItem value={DressCategory.THEMED}>Themed</SelectItem>
                        <SelectItem value={DressCategory.ICE_DANCE_PARTNER}>
                          Ice Dance (Partner)
                        </SelectItem>
                        <SelectItem value={DressCategory.ICE_DANCE_SINGLE}>
                          Ice Dance (Single)
                        </SelectItem>
                        <SelectItem value={DressCategory.COMPETITION}>Competition</SelectItem>
                        <SelectItem value={DressCategory.TEST}>Test</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && (
                  <p className="text-xs text-rose-600">{errors.category.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Controller
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="condition">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DressCondition.NEW}>New</SelectItem>
                        <SelectItem value={DressCondition.LIKE_NEW}>Like new</SelectItem>
                        <SelectItem value={DressCondition.GENTLY_USED}>Gently used</SelectItem>
                        <SelectItem value={DressCondition.USED}>Used</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.condition && (
                  <p className="text-xs text-rose-600">{errors.condition.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Primary color</Label>
                <Input id="color" placeholder="e.g. Royal blue" {...form.register("color")} />
                {errors.color && <p className="text-xs text-rose-600">{errors.color.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColorsRaw">Secondary colors</Label>
                <Input
                  id="secondaryColorsRaw"
                  placeholder="silver, white"
                  {...form.register("secondaryColorsRaw")}
                />
                <p className="text-xs text-slate-500">Comma-separated.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yearMade">Year made</Label>
                <Input
                  id="yearMade"
                  type="number"
                  inputMode="numeric"
                  placeholder="2024"
                  {...form.register("yearMade")}
                />
                {errors.yearMade && (
                  <p className="text-xs text-rose-600">{errors.yearMade.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sizeLabel">Size label</Label>
                <LockTooltip>
                  <Input
                    id="sizeLabel"
                    placeholder="e.g. Adult Small, Child 12"
                    disabled={fieldLocking.lockPricingAndSize}
                    {...form.register("sizeLabel")}
                  />
                </LockTooltip>
                {errors.sizeLabel && (
                  <p className="text-xs text-rose-600">{errors.sizeLabel.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="themeTagsRaw">Theme tags</Label>
                <Input
                  id="themeTagsRaw"
                  placeholder="latin, tango, rhythmic"
                  {...form.register("themeTagsRaw")}
                />
                <p className="text-xs text-slate-500">Comma-separated.</p>
              </div>
            </div>
          </TabsContent>

          {/* --------------------------- Measurements --------------------------- */}
          <TabsContent value="measurements" className="space-y-4 pt-6">
            {fieldLocking.lockPricingAndSize && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Size measurements are locked after first approval. Contact admin to make changes.
              </div>
            )}
            <p className="text-sm text-slate-600">
              All measurements in centimeters. Leave blank if not measured.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chestMinCm">Chest min</Label>
                <LockTooltip>
                  <Input
                    id="chestMinCm"
                    type="number"
                    disabled={fieldLocking.lockPricingAndSize}
                    {...form.register("chestMinCm")}
                  />
                </LockTooltip>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chestMaxCm">Chest max</Label>
                <LockTooltip>
                  <Input
                    id="chestMaxCm"
                    type="number"
                    disabled={fieldLocking.lockPricingAndSize}
                    {...form.register("chestMaxCm")}
                  />
                </LockTooltip>
              </div>
              <div className="space-y-2">
                <Label htmlFor="waistMinCm">Waist min</Label>
                <LockTooltip>
                  <Input
                    id="waistMinCm"
                    type="number"
                    disabled={fieldLocking.lockPricingAndSize}
                    {...form.register("waistMinCm")}
                  />
                </LockTooltip>
              </div>
              <div className="space-y-2">
                <Label htmlFor="waistMaxCm">Waist max</Label>
                <LockTooltip>
                  <Input
                    id="waistMaxCm"
                    type="number"
                    disabled={fieldLocking.lockPricingAndSize}
                    {...form.register("waistMaxCm")}
                  />
                </LockTooltip>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hipsMinCm">Hips min</Label>
                <LockTooltip>
                  <Input
                    id="hipsMinCm"
                    type="number"
                    disabled={fieldLocking.lockPricingAndSize}
                    {...form.register("hipsMinCm")}
                  />
                </LockTooltip>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hipsMaxCm">Hips max</Label>
                <LockTooltip>
                  <Input
                    id="hipsMaxCm"
                    type="number"
                    disabled={fieldLocking.lockPricingAndSize}
                    {...form.register("hipsMaxCm")}
                  />
                </LockTooltip>
              </div>
              <div className="space-y-2">
                <Label htmlFor="torsoMinCm">Torso min</Label>
                <LockTooltip>
                  <Input
                    id="torsoMinCm"
                    type="number"
                    disabled={fieldLocking.lockPricingAndSize}
                    {...form.register("torsoMinCm")}
                  />
                </LockTooltip>
              </div>
              <div className="space-y-2">
                <Label htmlFor="torsoMaxCm">Torso max</Label>
                <LockTooltip>
                  <Input
                    id="torsoMaxCm"
                    type="number"
                    disabled={fieldLocking.lockPricingAndSize}
                    {...form.register("torsoMaxCm")}
                  />
                </LockTooltip>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lengthCm">Length</Label>
                <LockTooltip>
                  <Input
                    id="lengthCm"
                    type="number"
                    disabled={fieldLocking.lockPricingAndSize}
                    {...form.register("lengthCm")}
                  />
                </LockTooltip>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Controller
                control={form.control}
                name="alterableSmaller"
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                    <div>
                      <Label htmlFor="alterableSmaller" className="text-sm font-medium">
                        Alterable smaller
                      </Label>
                      <p className="text-xs text-slate-500">
                        Can be tailored down for a smaller skater.
                      </p>
                    </div>
                    <Switch
                      id="alterableSmaller"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={fieldLocking.lockPricingAndSize}
                    />
                  </div>
                )}
              />
              <Controller
                control={form.control}
                name="alterableLarger"
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                    <div>
                      <Label htmlFor="alterableLarger" className="text-sm font-medium">
                        Alterable larger
                      </Label>
                      <p className="text-xs text-slate-500">
                        Has extra fabric to let out for a larger skater.
                      </p>
                    </div>
                    <Switch
                      id="alterableLarger"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={fieldLocking.lockPricingAndSize}
                    />
                  </div>
                )}
              />
            </div>
          </TabsContent>

          {/* ------------------------------ Pricing ----------------------------- */}
          <TabsContent value="pricing" className="space-y-4 pt-6">
            {fieldLocking.lockPricingAndSize && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Pricing is locked after first approval. Contact admin to make changes.
              </div>
            )}
            <p className="text-xs text-slate-500">Prices in USD; stored as cents server-side.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="competitionPriceUsd">Competition rental ($)</Label>
                <LockTooltip>
                  <Input
                    id="competitionPriceUsd"
                    type="number"
                    step="0.01"
                    disabled={fieldLocking.lockPricingAndSize}
                    {...form.register("competitionPriceUsd")}
                  />
                </LockTooltip>
                {errors.competitionPriceUsd && (
                  <p className="text-xs text-rose-600">{errors.competitionPriceUsd.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="seasonalPriceUsd">Seasonal rental ($)</Label>
                <LockTooltip>
                  <Input
                    id="seasonalPriceUsd"
                    type="number"
                    step="0.01"
                    disabled={fieldLocking.lockPricingAndSize}
                    {...form.register("seasonalPriceUsd")}
                  />
                </LockTooltip>
                {errors.seasonalPriceUsd && (
                  <p className="text-xs text-rose-600">{errors.seasonalPriceUsd.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchasePriceUsd">Purchase price ($)</Label>
                <LockTooltip>
                  <Input
                    id="purchasePriceUsd"
                    type="number"
                    step="0.01"
                    placeholder="Optional"
                    disabled={fieldLocking.lockPricingAndSize}
                    {...form.register("purchasePriceUsd")}
                  />
                </LockTooltip>
              </div>

              {fieldVisibility.showSecurityDepositAndCleaning && (
                <div className="space-y-2">
                  <Label htmlFor="securityDepositUsd">Security deposit ($)</Label>
                  <Input
                    id="securityDepositUsd"
                    type="number"
                    step="0.01"
                    {...form.register("securityDepositUsd")}
                  />
                  {errors.securityDepositUsd && (
                    <p className="text-xs text-rose-600">{errors.securityDepositUsd.message}</p>
                  )}
                </div>
              )}

              {fieldVisibility.showSecurityDepositAndCleaning && (
                <div className="space-y-2">
                  <Label htmlFor="cleaningFeeUsd">Cleaning fee ($)</Label>
                  <Input
                    id="cleaningFeeUsd"
                    type="number"
                    step="0.01"
                    {...form.register("cleaningFeeUsd")}
                  />
                  {errors.cleaningFeeUsd && (
                    <p className="text-xs text-rose-600">{errors.cleaningFeeUsd.message}</p>
                  )}
                </div>
              )}

              {fieldVisibility.showCommissionPct && (
                <div className="space-y-2">
                  <Label htmlFor="consignmentCommissionPct">Consignment commission (%)</Label>
                  <Input
                    id="consignmentCommissionPct"
                    type="number"
                    min={0}
                    max={100}
                    {...form.register("consignmentCommissionPct")}
                  />
                  <p className="text-xs text-slate-500">
                    0 for admin-owned dresses; set when assigning to a consigner.
                  </p>
                  {errors.consignmentCommissionPct && (
                    <p className="text-xs text-rose-600">
                      {errors.consignmentCommissionPct.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* -------------------------- Status & Internal ------------------------ */}
          {showStatusTab && (
            <TabsContent value="status" className="space-y-4 pt-6">
              {fieldVisibility.showStatusSelect && mode === "edit" && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={DressStatus.AVAILABLE}>Available</SelectItem>
                          <SelectItem value={DressStatus.PENDING_APPROVAL}>
                            Pending approval
                          </SelectItem>
                          <SelectItem value={DressStatus.PENDING}>Pending</SelectItem>
                          <SelectItem value={DressStatus.RENTED}>Rented</SelectItem>
                          <SelectItem value={DressStatus.MAINTENANCE}>Maintenance</SelectItem>
                          <SelectItem value={DressStatus.ARCHIVED}>Archived</SelectItem>
                          <SelectItem value={DressStatus.REJECTED}>Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-slate-500">
                    Manual status overrides are admin-only. Rented/Pending normally flow from the
                    rentals system.
                  </p>
                </div>
              )}

              {fieldVisibility.showInternalNotes && (
                <div className="space-y-2">
                  <Label htmlFor="internalNotes">Internal notes</Label>
                  <Textarea id="internalNotes" rows={5} {...form.register("internalNotes")} />
                  <p className="text-xs text-slate-500">
                    Admin only &mdash; never shown to students or consigners.
                  </p>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
          {mode === "create" ? (
            <p className="text-xs text-slate-500">
              Save to add images. Images can be added on the next screen.
            </p>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#0891b2] hover:bg-[#06748f] text-white"
          >
            {isSubmitting
              ? "Saving..."
              : (submitLabel ?? (mode === "create" ? "Create Dress" : "Save Changes"))}
          </Button>
        </div>
      </form>
    </TooltipProvider>
  );
}
