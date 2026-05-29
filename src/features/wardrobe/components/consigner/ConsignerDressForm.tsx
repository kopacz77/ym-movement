// src/features/wardrobe/components/consigner/ConsignerDressForm.tsx
//
// Consigner-facing dress form — thin wrapper around DressFormCore.
//
// Per CONSIGN-02 (hidden from consigners):
//   - internalNotes (admin-only audit field)
//   - consignmentCommissionPct (server pulls from Settings)
//   - securityDeposit + cleaningFee (server uses schema defaults)
//   - status select (server forces PENDING_APPROVAL on create; never changed by
//     consigner update — only by admin or by consigner.resubmit)
//
// Per CONSIGN-04:
//   - Pricing + size editable ONLY in PENDING_APPROVAL and REJECTED states
//   - Pricing + size LOCKED in all other states (parent computes
//     lockPricingAndSize from dress.status and passes through)
//
// onSubmit contract: receives the cents-converted, consigner-shaped subset of
// DressInput — directly mountable on wardrobe.consigner.create / update.
// Stripping admin-only keys here keeps the parent page wiring trivial AND
// matches the server-side .pick() schema in consignerQueries.

"use client";

import {
  DressFormCore,
  type DressFormValues,
  type FieldLocking,
  type FieldVisibility,
} from "@/features/wardrobe/components/DressFormCore";
import type { z } from "zod";
import type { consignerCreateInputSchema } from "@/features/wardrobe/api/queries/consignerQueries";

export type ConsignerDressInput = z.infer<typeof consignerCreateInputSchema>;

const CONSIGNER_VISIBILITY: FieldVisibility = {
  showInternalNotes: false,
  showCommissionPct: false,
  showSecurityDepositAndCleaning: false,
  showStatusSelect: false,
};

export interface ConsignerDressFormProps {
  mode: "create" | "edit";
  /**
   * Pre-populated form values for edit mode. Use cents->dollars conversion in
   * the parent page (mirrors admin DressForm convention).
   */
  defaultValues?: Partial<DressFormValues>;
  /**
   * Submit handler receives the cents-shaped ConsignerDressInput (consigner-
   * allowed subset of DressInput). The parent page maps this to
   * `wardrobe.consigner.{create,update}`. Server's Zod `.pick()` also strips
   * any locked/admin keys that snuck through — defense-in-depth.
   */
  onSubmit: (input: ConsignerDressInput) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  /**
   * Computed by the parent page from dress.status:
   *   const lockPricingAndSize = dress.status !== "PENDING_APPROVAL" && dress.status !== "REJECTED";
   * Defaults to false (suitable for create mode — no dress exists yet so
   * cannot be post-approval).
   */
  lockPricingAndSize?: boolean;
}

export function ConsignerDressForm({
  mode,
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  lockPricingAndSize = false,
}: ConsignerDressFormProps) {
  const fieldLocking: FieldLocking = { lockPricingAndSize };

  return (
    <DressFormCore
      mode={mode}
      defaultValues={defaultValues}
      fieldVisibility={CONSIGNER_VISIBILITY}
      fieldLocking={fieldLocking}
      isSubmitting={isSubmitting ?? false}
      submitLabel={submitLabel ?? (mode === "create" ? "Save & continue" : "Save changes")}
      onSubmit={(input) => {
        // DressFormCore emits the full DressInput shape; strip to the
        // consigner-allowed subset before handing to the parent so the
        // parent's mutation call is type-safe against consigner.{create,update}.
        // Mirrors consignerCreateInputSchema's .pick() on the server side.
        const consignerInput: ConsignerDressInput = {
          title: input.title,
          description: input.description,
          category: input.category,
          themeTags: input.themeTags,
          color: input.color,
          secondaryColors: input.secondaryColors,
          condition: input.condition,
          yearMade: input.yearMade,
          sizeLabel: input.sizeLabel,
          chestMinCm: input.chestMinCm,
          chestMaxCm: input.chestMaxCm,
          waistMinCm: input.waistMinCm,
          waistMaxCm: input.waistMaxCm,
          hipsMinCm: input.hipsMinCm,
          hipsMaxCm: input.hipsMaxCm,
          torsoMinCm: input.torsoMinCm,
          torsoMaxCm: input.torsoMaxCm,
          lengthCm: input.lengthCm,
          alterableSmaller: input.alterableSmaller,
          alterableLarger: input.alterableLarger,
          competitionPrice: input.competitionPrice,
          seasonalPrice: input.seasonalPrice,
          purchasePrice: input.purchasePrice,
        };
        onSubmit(consignerInput);
      }}
    />
  );
}
