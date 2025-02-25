"use client"

import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

const timeSlotSchema = z.object({
  rinkId: z.string().min(1, 'Please select a rink'),
  startTime: z.string().min(1, 'Start time is required'),
  duration: z.coerce.number().min(15, 'Minimum duration is 15 minutes'),
  maxStudents: z.coerce.number().min(1, 'At least 1 student required'),
  isRecurring: z.boolean().default(false),
  recurringDays: z.array(z.number()).optional(),
  recurringUntil: z.string().optional(),
})

type TimeSlotFormValues = z.infer<typeof timeSlotSchema>

interface TimeSlotFormProps {
  initialStartTime: Date | null
  initialEndTime: Date | null
  initialRinkId?: string
  rinks: Array<{ id: string; name: string }>
  onSubmitAction?: () => void // Make this optional
  onSubmit?: () => void // Keep old prop for compatibility
}

export const TimeSlotForm = ({
  initialStartTime,
  initialEndTime,
  initialRinkId,
  rinks,
  onSubmitAction,
  onSubmit, // Added back for compatibility
}: TimeSlotFormProps) => {
  const { toast } = useToast()
  const utils = api.useUtils()
  
  // Use onSubmitAction if available, otherwise fallback to onSubmit
  const handleFormSubmitComplete = onSubmitAction || onSubmit || (() => {})

  const form = useForm<TimeSlotFormValues>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: {
      rinkId: initialRinkId || '',
      startTime: initialStartTime ? format(initialStartTime, "yyyy-MM-dd'T'HH:mm") : '',
      duration: initialEndTime && initialStartTime
        ? Math.round((initialEndTime.getTime() - initialStartTime.getTime()) / (1000 * 60))
        : 60,
      maxStudents: 1,
      isRecurring: false,
    },
  })

  // Using the correct namespaced API path
  const createTimeSlot = api.admin.schedule.createTimeSlot.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Time slot created successfully",
      })
      // Using correct namespaced API path for invalidation
      utils.admin.schedule.getTimeSlots.invalidate()
      handleFormSubmitComplete()
    },
    onError: (error) => { // Removed explicit type annotation to let TypeScript infer it
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (values: TimeSlotFormValues) => {
    const startTime = new Date(values.startTime)
    const endTime = new Date(startTime.getTime() + values.duration * 60000)
    const timeSlotData = {
      rinkId: values.rinkId,
      startTime,
      endTime,
      maxStudents: values.maxStudents,
      isActive: true,
      ...(values.isRecurring && values.recurringDays && values.recurringUntil
        ? {
            recurringPattern: {
              daysOfWeek: values.recurringDays,
              endDate: new Date(values.recurringUntil),
            },
          }
        : {}),
    }
    createTimeSlot.mutate(timeSlotData)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="rinkId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rink</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a rink" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {rinks.map((rink) => (
                    <SelectItem key={rink.id} value={rink.id}>
                      {rink.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>Minimum duration is 15 minutes</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxStudents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Students</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isRecurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Recurring Schedule</FormLabel>
                <FormDescription>Create a recurring pattern for this time slot</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch('isRecurring') && (
          <>
            <FormField
              control={form.control}
              name="recurringDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recurring Days</FormLabel>
                  <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${index}`}
                          checked={field.value?.includes(index)}
                          onCheckedChange={(checked) => {
                            const currentDays = field.value || []
                            if (checked) {
                              field.onChange([...currentDays, index])
                            } else {
                              field.onChange(currentDays.filter((d) => d !== index))
                            }
                          }}
                        />
                        <label htmlFor={`day-${index}`} className="text-sm">
                          {day}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recurringUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repeat Until</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={handleFormSubmitComplete}>
            Cancel
          </Button>
          <Button type="submit" disabled={createTimeSlot.isPending}>
            {createTimeSlot.isPending ? "Creating..." : "Create Time Slot"}
          </Button>
        </div>
      </form>
    </Form>
  )
}