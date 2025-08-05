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
