"use client";

import { Calendar, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { api } from "@/lib/api";
import { delightfulToast } from "@/lib/delightful-toast";
import { showDeleteConfirmation } from "@/lib/toast-confirmations";

interface CoachBlockedDatesProps {
  className?: string;
}

interface FormData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: "TRAVEL" | "COMPETITION" | "OTHER";
}

const emptyForm: FormData = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  type: "TRAVEL",
};

export function CoachBlockedDates({ className }: CoachBlockedDatesProps) {
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [editingBlockedDate, setEditingBlockedDate] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const utils = api.useContext();

  // Fetch all blocked dates for listing (no date range filter)
  const { data: blockedDates } = api.coach.schedule.getMyBlockedDates.useQuery({});

  // Create mutation
  const createMutation = api.coach.schedule.createBlockedDate.useMutation({
    onSuccess: (result) => {
      delightfulToast.success("Blocked date created!", result.message, "admin");
      resetForm();
      utils.coach.schedule.getMyBlockedDates.invalidate();
      utils.coach.schedule.getMyTimeSlots.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to create blocked date", {
        description: error.message,
      });
    },
  });

  // Update mutation
  const updateMutation = api.coach.schedule.updateBlockedDate.useMutation({
    onSuccess: (result) => {
      delightfulToast.success("Blocked date updated!", result.message, "admin");
      resetForm();
      utils.coach.schedule.getMyBlockedDates.invalidate();
      utils.coach.schedule.getMyTimeSlots.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to update blocked date", {
        description: error.message,
      });
    },
  });

  // Delete mutation
  const deleteMutation = api.coach.schedule.deleteBlockedDate.useMutation({
    onSuccess: (result) => {
      delightfulToast.success("Blocked date removed!", result.message, "admin");
      utils.coach.schedule.getMyBlockedDates.invalidate();
      utils.coach.schedule.getMyTimeSlots.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to delete blocked date", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setFormData(emptyForm);
    setIsCreateFormOpen(false);
    setEditingBlockedDate(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.startDate || !formData.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const startDate = new Date(`${formData.startDate}T00:00:00`);
    const endDate = new Date(`${formData.endDate}T23:59:59`);

    if (editingBlockedDate) {
      updateMutation.mutate({
        id: editingBlockedDate,
        title: formData.title,
        description: formData.description || undefined,
        startDate,
        endDate,
        type: formData.type,
      });
    } else {
      createMutation.mutate({
        title: formData.title,
        description: formData.description || undefined,
        startDate,
        endDate,
        type: formData.type,
      });
    }
  };

  const handleEdit = (blockedDate: any) => {
    setEditingBlockedDate(blockedDate.id);
    setFormData({
      title: blockedDate.title,
      description: blockedDate.description || "",
      startDate: new Date(blockedDate.startDate).toISOString().split("T")[0],
      endDate: new Date(blockedDate.endDate).toISOString().split("T")[0],
      type: blockedDate.type,
    });
    setIsCreateFormOpen(true);
  };

  const handleDelete = (id: string) => {
    showDeleteConfirmation("blocked period", () => {
      deleteMutation.mutate({ id });
    });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "COMPETITION":
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Competition
          </span>
        );
      case "TRAVEL":
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
            Travel
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
            Other
          </span>
        );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className={`p-4 max-w-md text-sm ${className || ""}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Blocked Dates
        </h3>
        {!isCreateFormOpen && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingBlockedDate(null);
              setFormData(emptyForm);
              setIsCreateFormOpen(true);
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Block Dates
          </Button>
        )}
      </div>

      {/* Create/Edit form */}
      {isCreateFormOpen && (
        <form onSubmit={handleSubmit} className="mb-4 p-3 border rounded-lg bg-gray-50 space-y-3">
          <h4 className="font-medium text-sm">
            {editingBlockedDate ? "Edit Blocked Date" : "Create Blocked Period"}
          </h4>

          <div>
            <Label htmlFor="bd-title" className="text-xs">
              Title *
            </Label>
            <Input
              id="bd-title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Regional Competition"
              className="h-8 text-sm"
              required
            />
          </div>

          <div>
            <Label htmlFor="bd-type" className="text-xs">
              Type
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  type: value as "TRAVEL" | "COMPETITION" | "OTHER",
                }))
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRAVEL">Travel</SelectItem>
                <SelectItem value="COMPETITION">Competition</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="bd-start" className="text-xs">
                Start Date *
              </Label>
              <Input
                id="bd-start"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                className="h-8 text-sm"
                required
              />
            </div>
            <div>
              <Label htmlFor="bd-end" className="text-xs">
                End Date *
              </Label>
              <Input
                id="bd-end"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                className="h-8 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bd-desc" className="text-xs">
              Description
            </Label>
            <Input
              id="bd-desc"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details"
              className="h-8 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending
                ? editingBlockedDate
                  ? "Saving..."
                  : "Creating..."
                : editingBlockedDate
                  ? "Save Changes"
                  : "Block Dates"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Existing blocked dates list */}
      <div className="space-y-2">
        {!blockedDates || blockedDates.length === 0 ? (
          <p className="text-muted-foreground text-xs italic">No blocked date ranges configured</p>
        ) : (
          blockedDates.map((bd: any) => (
            <div
              key={bd.id}
              className="flex items-start justify-between p-3 border rounded-lg bg-white"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{bd.title}</span>
                  {getTypeBadge(bd.type)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(bd.startDate).toLocaleDateString()} -{" "}
                  {new Date(bd.endDate).toLocaleDateString()}
                </div>
                {bd.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">{bd.description}</div>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => handleEdit(bd)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(bd.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
