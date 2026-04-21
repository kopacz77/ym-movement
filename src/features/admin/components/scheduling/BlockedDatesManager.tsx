"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Edit,
  Plane,
  Plus,
  Trash2,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { showDeleteConfirmation } from "@/lib/toast-confirmations";
import { cn } from "@/lib/utils";

// Form validation schema
const blockedDateSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(100, "Title too long"),
    description: z.string().optional(),
    startDate: z.date({
      required_error: "Start date is required",
    }),
    endDate: z.date({
      required_error: "End date is required",
    }),
    type: z.enum(["TRAVEL", "COMPETITION", "OTHER"]),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
  });

type BlockedDateFormValues = z.infer<typeof blockedDateSchema>;

// Type icons mapping
const typeIcons = {
  TRAVEL: Plane,
  COMPETITION: Trophy,
  OTHER: AlertCircle,
};

// Type colors mapping
const typeColors = {
  TRAVEL: "bg-gray-500",
  COMPETITION: "bg-red-500",
  OTHER: "bg-gray-500",
};

// Type badge variants
const typeBadgeVariants = {
  TRAVEL: "secondary",
  COMPETITION: "destructive",
  OTHER: "secondary",
} as const;

interface BlockedDatesManagerProps {
  className?: string;
}

export function BlockedDatesManager({ className }: BlockedDatesManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch blocked dates
  const { data: blockedDates, refetch } = api.admin.schedule.getBlockedDates.useQuery({});

  // Mutations
  const createMutation = api.admin.schedule.createBlockedDate.useMutation({
    onSuccess: (result) => {
      toast.success("Success", {
        description: result.message,
      });
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const updateMutation = api.admin.schedule.updateBlockedDate.useMutation({
    onSuccess: (result) => {
      toast.success("Success", {
        description: result.message,
      });
      setEditingId(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const deleteMutation = api.admin.schedule.deleteBlockedDate.useMutation({
    onSuccess: (result) => {
      toast.success("Success", {
        description: result.message,
      });
      refetch();
    },
    onError: (error) => {
      console.error("Delete blocked date error:", error);
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  // Form setup
  const form = useForm<BlockedDateFormValues>({
    resolver: zodResolver(blockedDateSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "TRAVEL",
    },
  });

  // Handle form submission
  const onSubmit = (values: BlockedDateFormValues) => {
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...values,
      });
    } else {
      createMutation.mutate(values);
    }
  };

  // Handle edit
  const handleEdit = (blockedDate: any) => {
    setEditingId(blockedDate.id);
    form.reset({
      title: blockedDate.title,
      description: blockedDate.description || "",
      startDate: new Date(blockedDate.startDate),
      endDate: new Date(blockedDate.endDate),
      type: blockedDate.type,
    });
    setIsCreateDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (id: string) => {
    showDeleteConfirmation("blocked period", () => {
      deleteMutation.mutate({ id });
    });
  };

  // Reset form when dialog closes
  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
    setEditingId(null);
    form.reset({
      title: "",
      description: "",
      startDate: undefined,
      endDate: undefined,
      type: "TRAVEL",
    });
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Blocked Dates
            </CardTitle>
            <CardDescription>Manage periods when coaching is not available</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Block Dates
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Blocked Period" : "Block Date Range"}</DialogTitle>
                <DialogDescription>
                  Create a blocked period to prevent scheduling during travel, competitions, or
                  other unavailable times.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Regional Competition" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="TRAVEL">
                                <div className="flex items-center gap-2">
                                  <Plane className="h-4 w-4" />
                                  Travel
                                </div>
                              </SelectItem>
                              <SelectItem value="COMPETITION">
                                <div className="flex items-center gap-2">
                                  <Trophy className="h-4 w-4" />
                                  Competition
                                </div>
                              </SelectItem>
                              <SelectItem value="OTHER">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4" />
                                  Other
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional details about this blocked period"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide context for why this period is blocked
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick start date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date(new Date().setHours(0, 0, 0, 0))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick end date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => {
                                  const startDate = form.getValues("startDate");
                                  return (
                                    date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                                    (startDate && date < startDate)
                                  );
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? editingId
                          ? "Updating..."
                          : "Creating..."
                        : editingId
                          ? "Update Period"
                          : "Block Dates"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!blockedDates || blockedDates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No blocked date ranges configured</p>
            <p className="text-sm">
              Create blocked periods to prevent scheduling during unavailable times
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {blockedDates.map((blockedDate) => {
              const TypeIcon = typeIcons[blockedDate.type as keyof typeof typeIcons];
              const startDate = new Date(blockedDate.startDate);
              const endDate = new Date(blockedDate.endDate);
              const duration =
                Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

              return (
                <Card
                  key={blockedDate.id}
                  className="border-l-4"
                  style={{
                    borderLeftColor: typeColors[
                      blockedDate.type as keyof typeof typeColors
                    ].replace("bg-", "#"),
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <TypeIcon className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold">{blockedDate.title}</h3>
                          <Badge
                            variant={
                              typeBadgeVariants[blockedDate.type as keyof typeof typeBadgeVariants]
                            }
                          >
                            {blockedDate.type.toLowerCase()}
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground mb-2">
                          <span className="font-medium">{format(startDate, "MMM d, yyyy")}</span>
                          {startDate.getTime() !== endDate.getTime() && (
                            <>
                              <span className="mx-2">→</span>
                              <span className="font-medium">{format(endDate, "MMM d, yyyy")}</span>
                            </>
                          )}
                          <span className="ml-2 text-xs">
                            ({duration} day{duration !== 1 ? "s" : ""})
                          </span>
                        </div>

                        {blockedDate.description && (
                          <p className="text-sm text-muted-foreground">{blockedDate.description}</p>
                        )}

                        <div className="text-xs text-muted-foreground mt-2">
                          Created by {blockedDate.User.name} on{" "}
                          {format(new Date(blockedDate.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(blockedDate)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(blockedDate.id)}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
