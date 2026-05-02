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
        createElement("div", { className: "font-semibold" }, title),
        createElement("div", { className: "text-sm text-muted-foreground mt-1" }, description),
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
            cancelLabel,
          ),
          createElement(
            "button",
            {
              type: "button",
              className:
                "px-3 py-1.5 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90",
              onClick: handleConfirm,
            },
            confirmLabel,
          ),
        ),
      ),
    {
      id: toastId,
      duration,
    },
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
 * Standardized status toggle confirmation toast
 * For deactivating/reactivating users while preserving their data
 */
export function showStatusToggleConfirmation(
  action: "deactivate" | "reactivate",
  itemName: string,
  onConfirm: () => void,
  onCancel?: () => void,
) {
  const isDeactivate = action === "deactivate";
  showConfirmationToast({
    title: `${isDeactivate ? "Deactivate" : "Reactivate"} ${itemName}?`,
    description: isDeactivate
      ? "This will prevent them from accessing their account. Their data will be preserved."
      : "This will restore their access to their account.",
    confirmLabel: isDeactivate ? "Deactivate" : "Reactivate",
    cancelLabel: "Cancel",
    onConfirm,
    onCancel,
  });
}

/**
 * Undo payment verification — two-step confirmation with personality
 */
export function showUnverifyConfirmation(
  amount: number,
  studentName: string,
  onConfirm: () => void,
  onCancel?: () => void,
) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  // Step 1
  showConfirmationToast({
    title: "Are you sure you don't want to double dip?",
    description: `Undo verification of ${formattedAmount} from ${studentName}?`,
    confirmLabel: "Yes, undo it",
    cancelLabel: "Nevermind",
    onConfirm: () => {
      // Step 2
      showConfirmationToast({
        title: "But this could be clothes for our child, are you really really sure??",
        description: `This will revert ${formattedAmount} back to pending.`,
        confirmLabel: "I'm sure!",
        cancelLabel: "You're right, keep it",
        onConfirm,
        onCancel,
        duration: 15000,
      });
    },
    onCancel,
    duration: 15000,
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
