"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const proposalSchema = z.object({
  rinkId: z.string().min(1, "Please select a rink"),
  date: z.date({ required_error: "Please select a date" }),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  maxStudents: z.coerce.number().int().min(1).max(10),
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

function combineDateAndTime(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

export function ProposeAvailabilityForm() {
  const { data: rinks, isLoading: rinksLoading } = api.coach.proposals.getRinks.useQuery();
  const utils = api.useUtils();

  const createProposal = api.coach.proposals.createProposal.useMutation({
    onSuccess: () => {
      toast.success("Proposal submitted for admin review");
      utils.coach.proposals.getMyProposals.invalidate();
      form.reset();
    },
    onError: (error) => {
      toast.error("Failed to submit proposal", { description: error.message });
    },
  });

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      rinkId: "",
      startTime: "",
      endTime: "",
      maxStudents: 1,
    },
  });

  function onSubmit(values: ProposalFormValues) {
    const startTime = combineDateAndTime(values.date, values.startTime);
    const endTime = combineDateAndTime(values.date, values.endTime);

    if (endTime <= startTime) {
      form.setError("endTime", { message: "End time must be after start time" });
      return;
    }

    createProposal.mutate({
      rinkId: values.rinkId,
      startTime,
      endTime,
      maxStudents: values.maxStudents,
    });
  }

  if (rinksLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Propose Time Slot</CardTitle>
        <CardDescription>
          Submit a time slot proposal for admin approval. Once approved, it will appear on the
          schedule.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rink selector */}
            <div className="space-y-2">
              <Label htmlFor="rinkId">Rink</Label>
              <Select
                value={form.watch("rinkId")}
                onValueChange={(value) => form.setValue("rinkId", value, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a rink" />
                </SelectTrigger>
                <SelectContent>
                  {rinks?.map((rink) => (
                    <SelectItem key={rink.id} value={rink.id}>
                      {rink.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.rinkId && (
                <p className="text-sm text-destructive">{form.formState.errors.rinkId.message}</p>
              )}
            </div>

            {/* Date picker */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch("date") && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("date") ? format(form.watch("date"), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch("date")}
                    onSelect={(date) => {
                      if (date) {
                        form.setValue("date", date, { shouldValidate: true });
                      }
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.date && (
                <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
              )}
            </div>

            {/* Start time */}
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" type="time" {...form.register("startTime")} />
              {form.formState.errors.startTime && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.startTime.message}
                </p>
              )}
            </div>

            {/* End time */}
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="time" {...form.register("endTime")} />
              {form.formState.errors.endTime && (
                <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>
              )}
            </div>

            {/* Max students */}
            <div className="space-y-2">
              <Label htmlFor="maxStudents">Max Students</Label>
              <Input
                id="maxStudents"
                type="number"
                min={1}
                max={10}
                {...form.register("maxStudents")}
              />
              {form.formState.errors.maxStudents && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.maxStudents.message}
                </p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={createProposal.isPending} className="w-full sm:w-auto">
            {createProposal.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Propose Time Slot
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
