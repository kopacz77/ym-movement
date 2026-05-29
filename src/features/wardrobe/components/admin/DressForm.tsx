// Admin DressForm — thin wrapper around DressFormCore. Admins see ALL fields
// and have ZERO field locking. Extracted from 626-line DressForm in Plan 18-03.

"use client";

import type { DressStatus } from "@prisma/client";
import type { DressInput } from "@/features/admin/api/queries/wardrobeDressQueries";
import {
  DressFormCore,
  type DressFormValues,
  type FieldLocking,
  type FieldVisibility,
} from "@/features/wardrobe/components/DressFormCore";

const ADMIN_VISIBILITY: FieldVisibility = {
  showInternalNotes: true,
  showCommissionPct: true,
  showSecurityDepositAndCleaning: true,
  showStatusSelect: true,
};

const ADMIN_LOCKING: FieldLocking = {
  lockPricingAndSize: false,
};

export interface DressFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<DressFormValues>;
  onSubmit: (input: DressInput & { status?: DressStatus }) => void;
  isSubmitting: boolean;
  submitLabel?: string;
}

export function DressForm(props: DressFormProps) {
  return (
    <DressFormCore {...props} fieldVisibility={ADMIN_VISIBILITY} fieldLocking={ADMIN_LOCKING} />
  );
}

// Re-export so existing callers can `import { DressFormValues } from "@/.../admin/DressForm"`.
export type { DressFormValues };
