// src/lib/toast-confirmations.ts
import { toast } from "sonner";

interface ConfirmationToastOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  duration?: number;
}

/**
 * Shows a standardized confirmation toast with consistent styling
 */
export function showConfirmationToast({
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  duration = 10000,
}: ConfirmationToastOptions) {
  toast(title, {
    description,
    action: {
      label: confirmLabel,
      onClick: onConfirm,
    },
    cancel: {
      label: cancelLabel,
      onClick: onCancel || (() => {}),
    },
    duration,
  });
}

/**
 * Standardized delete confirmation toast
 */
export function showDeleteConfirmation(
  itemType: string,
  onConfirm: () => void,
  onCancel?: () => void,
) {
  showConfirmationToast({
    title: `Delete ${itemType}?`,
    description: "This action cannot be undone.",
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    onConfirm,
    onCancel,
  });
}

/**
 * Standardized remove confirmation toast
 */
export function showRemoveConfirmation(
  itemType: string,
  onConfirm: () => void,
  onCancel?: () => void,
) {
  showConfirmationToast({
    title: `Remove ${itemType}?`,
    description: "The item will be removed from this context.",
    confirmLabel: "Remove",
    cancelLabel: "Cancel",
    onConfirm,
    onCancel,
  });
}

/**
 * Payment verification confirmation toast
 * Prevents accidental marking of payments as paid
 */
export function showPaymentConfirmation(
  amount: number,
  studentName: string,
  paymentMethod: string,
  onConfirm: () => void,
  onCancel?: () => void,
) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  showConfirmationToast({
    title: "Confirm Payment Verification",
    description: `Mark ${formattedAmount} payment from ${studentName} as paid via ${paymentMethod}?`,
    confirmLabel: "Verify Payment",
    cancelLabel: "Cancel",
    onConfirm,
    onCancel,
    duration: 15000, // 15 seconds for payment confirmations
  });
}
