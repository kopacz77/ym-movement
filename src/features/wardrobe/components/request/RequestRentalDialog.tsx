// src/features/wardrobe/components/request/RequestRentalDialog.tsx
//
// Plan 16-05 — RequestRentalDialog.
//
// Conversion-critical modal: the surface that converts intent into a
// RentalRequest row. Three procedural concerns intersect here:
//   1. Zod schema reuse from Plan 16-01's requestQueries.ts (drift-proof)
//   2. Debounced availability gating against wardrobe.requests.checkAvailability
//   3. RHF state lifecycle across modal open/close (Pitfall 8 — reset on close)
//
// Pattern lineage:
//   - RHF + zodResolver with input/output generics → 14-04 / 15-04 ADRs
//   - Date range Popover + Calendar mode="range" → WardrobeFilterBar (15-06)
//   - Debounced state via useDebouncedState from context-utils
//   - Reset-on-close via useEffect cleanup → Pitfall 8 (research)
//
// The dialog is fully controlled (open / onOpenChange props) — the parent
// detail page (Plan 16-04) owns the open state. This component owns NO router
// state, NO browser persistence, NO toast outside the mutation callbacks.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RentalType } from "@prisma/client";
import { format } from "date-fns";
import { AlertTriangle, CalendarIcon, Loader2 } from "lucide-react";
import { useEffect } from "react";
import type { DateRange } from "react-day-picker";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { createRequestSchema } from "@/features/wardrobe/api/queries/requestQueries";
import { api } from "@/lib/api";
import { useDebouncedState } from "@/lib/context-utils";

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

export interface RequestRentalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dress: {
    id: string;
    title: string;
    /**
     * Purchase rental type is hidden in the radio group when this is null.
     * Authoritatively gated server-side as well; this is the UX half.
     */
    purchasePrice: number | null;
  };
}

// ---------------------------------------------------------------------------
// Form typing — input/output divergence pattern from 14-04 / 15-04 ADRs
// ---------------------------------------------------------------------------

type FormInput = z.input<typeof createRequestSchema>;
type FormOutput = z.output<typeof createRequestSchema>;

// ---------------------------------------------------------------------------
// Rental type radio options
// ---------------------------------------------------------------------------

interface RentalTypeOption {
  value: RentalType;
  label: string;
  description: string;
}

const ALL_RENTAL_TYPE_OPTIONS: RentalTypeOption[] = [
  {
    value: RentalType.COMPETITION,
    label: "Competition",
    description: "Single-event rental for a competition",
  },
  {
    value: RentalType.SEASONAL,
    label: "Seasonal",
    description: "Multi-month rental for a season",
  },
  {
    value: RentalType.PURCHASE,
    label: "Purchase",
    description: "Buy outright (only if seller allows)",
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RequestRentalDialog({ open, onOpenChange, dress }: RequestRentalDialogProps) {
  const utils = api.useUtils();

  // -- RHF setup ------------------------------------------------------------
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      dressId: dress.id,
      rentalType: RentalType.COMPETITION,
      // startDate/endDate are required Dates — leave undefined so RHF treats
      // them as untouched until the user picks a range. Cast through unknown
      // satisfies the .input shape without leaking unsafe values at runtime
      // (the Zod resolver gates submission on validity).
      startDate: undefined as unknown as Date,
      endDate: undefined as unknown as Date,
      competitionName: "",
      competitionDate: undefined,
      message: "",
    },
    mode: "onChange",
  });

  // -- Reset on close (Pitfall 8 — prevent stale dates between opens) -------
  useEffect(() => {
    if (!open) {
      form.reset({
        dressId: dress.id,
        rentalType: RentalType.COMPETITION,
        startDate: undefined as unknown as Date,
        endDate: undefined as unknown as Date,
        competitionName: "",
        competitionDate: undefined,
        message: "",
      });
    }
  }, [open, form, dress.id]);

  // -- Watch + debounce dates for the availability ping ---------------------
  // useDebouncedState returns [immediate, debounced, setValue] — destructure
  // accordingly. We only care about the debounced value for the query.
  const watchedStart = form.watch("startDate");
  const watchedEnd = form.watch("endDate");

  const [, debouncedDates, setDebouncedDates] = useDebouncedState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null }, 500);

  useEffect(() => {
    setDebouncedDates({
      start: watchedStart instanceof Date ? watchedStart : null,
      end: watchedEnd instanceof Date ? watchedEnd : null,
    });
  }, [watchedStart, watchedEnd, setDebouncedDates]);

  const availabilityEnabled =
    !!debouncedDates.start && !!debouncedDates.end && debouncedDates.end > debouncedDates.start;

  const availabilityQuery = api.wardrobe.requests.checkAvailability.useQuery(
    {
      dressId: dress.id,
      // Fallbacks are inert — the query only runs when availabilityEnabled.
      startDate: debouncedDates.start ?? new Date(),
      endDate: debouncedDates.end ?? new Date(),
    },
    { enabled: availabilityEnabled, staleTime: 0 },
  );

  const conflictDetected = !!availabilityQuery.data && !availabilityQuery.data.available;

  // -- Create mutation ------------------------------------------------------
  const createMutation = api.wardrobe.requests.create.useMutation({
    onSuccess: () => {
      toast.success("Request submitted");
      form.reset();
      onOpenChange(false);
      utils.wardrobe.requests.mine.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit request");
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createMutation.mutate(values);
  });

  // -- Rental type radio options (filter Purchase if no purchasePrice) -----
  const rentalTypeOptions = ALL_RENTAL_TYPE_OPTIONS.filter(
    (opt) => opt.value !== RentalType.PURCHASE || dress.purchasePrice != null,
  );

  // -- Watched message for character counter -------------------------------
  const watchedMessage = form.watch("message") ?? "";
  const messageLen = watchedMessage.length;

  // -- Today midnight for date disabled() guards ---------------------------
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#1a3a5c]">Request to rent {dress.title}</DialogTitle>
          <DialogDescription>
            Tell the owner about your event. They'll review and respond.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Rental type radio group */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
              Rental type
            </span>
            <Controller
              control={form.control}
              name="rentalType"
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {rentalTypeOptions.map((opt) => {
                    const selected = field.value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        aria-pressed={selected}
                        className={
                          selected
                            ? "rounded-lg border-2 border-[#0891b2] bg-cyan-50 px-3 py-2 text-left transition-colors"
                            : "rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                        }
                      >
                        <span className="block text-sm font-medium text-slate-900">
                          {opt.label}
                        </span>
                        <span className="block text-xs text-slate-500">{opt.description}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {form.formState.errors.rentalType && (
              <p className="text-xs text-rose-600">{form.formState.errors.rentalType.message}</p>
            )}
          </div>

          {/* Date range picker */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
              Rental window
            </Label>
            <Controller
              control={form.control}
              name="startDate"
              render={({ field: startField }) => (
                <Controller
                  control={form.control}
                  name="endDate"
                  render={({ field: endField }) => {
                    const startValue = startField.value as Date | undefined;
                    const endValue = endField.value as Date | undefined;
                    const range: DateRange | undefined =
                      startValue || endValue ? { from: startValue, to: endValue } : undefined;
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {range?.from && range?.to
                              ? `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`
                              : range?.from
                                ? `${format(range.from, "MMM d, yyyy")} – ?`
                                : "Pick rental window"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="range"
                            selected={range}
                            onSelect={(r) => {
                              startField.onChange(r?.from);
                              endField.onChange(r?.to);
                            }}
                            numberOfMonths={2}
                            disabled={(date) => date < todayStart}
                          />
                        </PopoverContent>
                      </Popover>
                    );
                  }}
                />
              )}
            />
            {form.formState.errors.endDate && (
              <p className="text-xs text-rose-600">{form.formState.errors.endDate.message}</p>
            )}
          </div>

          {/* Inline availability warning panel (REQUEST-02) */}
          {conflictDetected && availabilityQuery.data && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 flex gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-amber-800">
                {availabilityQuery.data.reason === "Already booked" &&
                availabilityQuery.data.conflictStart &&
                availabilityQuery.data.conflictEnd
                  ? `These dates conflict with an existing booking (${format(availabilityQuery.data.conflictStart, "MMM d")}–${format(availabilityQuery.data.conflictEnd, "MMM d, yyyy")}). Please pick a different window.`
                  : availabilityQuery.data.reason || "These dates are not available."}
              </div>
            </div>
          )}

          {/* Optional competition name */}
          <div className="space-y-2">
            <Label
              htmlFor="competitionName"
              className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500"
            >
              Competition name <span className="text-slate-400 normal-case">(optional)</span>
            </Label>
            <Input
              id="competitionName"
              type="text"
              maxLength={120}
              placeholder="e.g. Skate Detroit"
              {...form.register("competitionName")}
            />
            {form.formState.errors.competitionName && (
              <p className="text-xs text-rose-600">
                {form.formState.errors.competitionName.message}
              </p>
            )}
          </div>

          {/* Optional competition date (single date) */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
              Competition date <span className="text-slate-400 normal-case">(optional)</span>
            </Label>
            <Controller
              control={form.control}
              name="competitionDate"
              render={({ field }) => {
                const value = field.value as Date | undefined;
                return (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value ? format(value, "MMM d, yyyy") : "Pick competition date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={value}
                        onSelect={(d) => field.onChange(d)}
                        disabled={(date) => date < todayStart}
                      />
                    </PopoverContent>
                  </Popover>
                );
              }}
            />
            {form.formState.errors.competitionDate && (
              <p className="text-xs text-rose-600">
                {form.formState.errors.competitionDate.message}
              </p>
            )}
          </div>

          {/* Required message textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="message"
                className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500"
              >
                Message to owner
              </Label>
              <span
                className={messageLen < 20 ? "text-xs text-slate-400" : "text-xs text-slate-600"}
              >
                {messageLen} / 1000
              </span>
            </div>
            <Textarea
              id="message"
              rows={4}
              maxLength={1000}
              placeholder="Share why this dress is the right fit — event, level, timing, anything else helpful."
              {...form.register("message")}
            />
            {form.formState.errors.message ? (
              <p className="text-xs text-rose-600">{form.formState.errors.message.message}</p>
            ) : (
              <p className="text-xs text-slate-500">
                At least 20 characters — give the owner enough context to say yes.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !form.formState.isValid ||
                createMutation.isPending ||
                conflictDetected ||
                availabilityQuery.isFetching
              }
              className="bg-[#0891b2] hover:bg-[#0e7490] text-white"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
