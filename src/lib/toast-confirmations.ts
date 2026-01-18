// src/lib/toast-confirmations.ts
import { createElement } from "react";
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
 * Uses custom JSX to ensure single-click dismissal works properly
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
  // Generate a unique ID upfront
  const toastId = `confirm-${Date.now()}`;

  const handleConfirm = () => {
    toast.dismiss(toastId);
    // Small delay to ensure toast is dismissed before action runs
    setTimeout(() => onConfirm(), 10);
  };

  const handleCancel = () => {
    toast.dismiss(toastId);
    if (onCancel) {
      setTimeout(() => onCancel(), 10);
    }
  };

  toast.custom(
    () =>
      createElement(
        "div",
        {
          className:
            "bg-background text-foreground border border-border shadow-lg rounded-lg p-4 w-[356px]",
        },
        createElement(
          "div",
          { className: "font-semibold" },
          title
        ),
        createElement(
          "div",
          { className: "text-sm text-muted-foreground mt-1" },
          description
        ),
        createElement(
          "div",
          { className: "flex gap-2 mt-3 justify-end" },
          createElement(
            "button",
            {
              type: "button",
              className:
                "px-3 py-1.5 text-sm font-medium bg-muted text-muted-foreground rounded-md hover:bg-muted/80",
              onClick: handleCancel,
            },
            cancelLabel
          ),
          createElement(
            "button",
            {
              type: "button",
              className:
                "px-3 py-1.5 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90",
              onClick: handleConfirm,
            },
            confirmLabel
          )
        )
      ),
    {
      id: toastId,
      duration,
    }
  );
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
