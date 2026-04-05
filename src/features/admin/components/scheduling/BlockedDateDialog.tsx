// src/features/admin/components/scheduling/BlockedDateDialog.tsx
"use client";

import { toast } from "sonner";
import { api } from "@/lib/api";
import { showDeleteConfirmation } from "@/lib/toast-confirmations";

interface BlockedRange {
  id: string;
  title: string;
  description?: string;
  startDate: string | Date;
  endDate: string | Date;
  type: "TRAVEL" | "COMPETITION" | "OTHER";
  createdById: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  User: {
    id: string;
    name: string;
    email: string;
  };
}

interface BlockedDateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  blockedRange: BlockedRange | null;
}

export default function BlockedDateDialog({
  isOpen,
  onClose,
  blockedRange,
}: BlockedDateDialogProps) {
  const utils = api.useContext();

  const deleteMutation = api.admin.schedule.deleteBlockedDate.useMutation({
    onSuccess: (result) => {
      toast.success("Success", {
        description: result.message,
      });
      utils.admin.schedule.getBlockedDates.invalidate();
      onClose();
    },
    onError: (error) => {
      console.error("Delete blocked date error:", error);
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const handleDelete = () => {
    if (!blockedRange) {
      return;
    }

    showDeleteConfirmation(
      "blocked period",
      () => {
        deleteMutation.mutate({ id: blockedRange.id });
      },
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          maxWidth: "500px",
          width: "90%",
        }}
      >
        <h2>Blocked Date Details</h2>
        {blockedRange && (
          <div>
            <p>
              <strong>Title:</strong> {blockedRange.title}
            </p>
            <p>
              <strong>Type:</strong> {blockedRange.type}
            </p>
            <p>
              <strong>Description:</strong> {blockedRange.description || "None"}
            </p>
          </div>
        )}
        <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            style={{
              padding: "8px 16px",
              backgroundColor: deleteMutation.isPending ? "#9ca3af" : "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
            }}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Blocked Period"}
          </button>
        </div>
      </div>
    </div>
  );
}
