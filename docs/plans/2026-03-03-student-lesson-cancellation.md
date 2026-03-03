# Student Self-Service Lesson Cancellation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow students to cancel their own lessons with a 24-hour cancellation policy — standard cancels are free, late cancels (within 24h) require fee acknowledgment.

**Architecture:** Modify the existing `student.booking.cancelLesson` TRPC mutation to allow late cancellations (currently it blocks them). Update the existing `CancellationDialog.tsx` to support a late-cancel mode with fee warning and checkbox. Wire the dialog into the lesson detail page and schedule list. Remove the duplicate weaker cancel endpoint. Add admin in-app notification on cancellation.

**Tech Stack:** Next.js 15 (App Router), TRPC v11, Prisma, React 19, Radix UI, Sonner toasts, Google Calendar API

**Design doc:** `docs/plans/2026-03-03-student-lesson-cancellation-design.md`

---

## Task 1: Remove duplicate cancel endpoint from student lessonQueries

**Files:**
- Modify: `src/features/student/api/queries/lessonQueries.ts` — remove `cancelLesson` mutation (lines 44-76)
- Modify: `src/features/student/api/queries/index.ts` — keep `lessonRouter` import (it still has `getLesson`)

**Step 1: Remove the duplicate cancelLesson mutation**

In `src/features/student/api/queries/lessonQueries.ts`, delete the entire `cancelLesson` procedure (lines 44-76). Keep `getLesson`. The file should look like:

```typescript
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";

export const lessonRouter = createTRPCRouter({
  getLesson: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const lesson = await ctx.prisma.lesson.findUnique({
          where: { id: input.id },
          include: { Payment: true, Rink: true },
        });
        if (!lesson) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
        }
        return lesson;
      } catch (error) {
        console.error("Error fetching lesson details:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve lesson details",
          cause: error,
        });
      }
    }),
});
```

**Step 2: Verify no code references the removed endpoint**

Search for `student.lessons.cancelLesson` across the codebase. There should be zero usages — the existing `CancellationDialog.tsx` already uses `student.booking.cancelLesson`.

**Step 3: Run type-check**

Run: `pnpm type-check`
Expected: PASS (no code references the removed endpoint)

**Step 4: Commit**

```bash
git add src/features/student/api/queries/lessonQueries.ts
git commit -m "refactor: remove duplicate student cancelLesson endpoint

The student.lessons.cancelLesson endpoint was a weaker duplicate of
student.booking.cancelLesson — it lacked 24-hour policy enforcement,
Google Calendar cleanup, and proper validation. Removed to avoid
confusion."
```

---

## Task 2: Modify backend to allow late cancellations + add admin notification

**Files:**
- Modify: `src/features/student/api/queries/bookingQueries.ts` — lines 383-496

**Step 1: Update the cancelLesson mutation**

Replace the cancellation policy block (lines 423-443) that throws an error when within 24 hours. Instead:
1. Calculate `isLateCancellation` boolean
2. Allow the cancellation to proceed regardless
3. Include student name in the lesson query (need to add `Student: { include: { User: true } }`)
4. After updating the lesson, notify all admin users

The updated mutation should look like this (replace lines 383-496):

```typescript
cancelLesson: protectedProcedure
  .input(
    z.object({
      lessonId: z.string(),
      reason: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    try {
      // 1. Find the lesson with student info for notification
      const lesson = await ctx.prisma.lesson.findUnique({
        where: { id: input.lessonId },
        include: {
          Student: {
            include: { User: true },
          },
          Rink: true,
        },
      });

      if (!lesson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lesson not found",
        });
      }

      // 2. Cannot cancel past lessons
      const now = new Date();
      if (lesson.startTime < now) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot cancel past lessons",
        });
      }

      // 3. Determine if this is a late cancellation (within 24 hours)
      const hoursUntilLesson = (lesson.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isLateCancellation = hoursUntilLesson < 24;

      // 4. Delete Google Calendar event if it exists
      if (lesson.googleCalendarEventId) {
        try {
          await googleCalendar.deleteEvent(lesson.googleCalendarEventId);
        } catch (error) {
          console.error("[CANCEL] Error deleting Google Calendar event:", error);
        }
      }

      // 5. Update the lesson status
      const updatedLesson = await ctx.prisma.lesson.update({
        where: { id: input.lessonId },
        data: {
          status: LessonStatus.CANCELLED,
          cancellationReason: input.reason,
          cancellationTime: new Date(),
          googleCalendarEventId: null,
        },
      });

      // 6. Notify all admin users
      const adminUsers = await ctx.prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      const studentName = lesson.Student.User.name || "A student";
      const lessonDate = format(lesson.startTime, "MMM d, yyyy");
      const lessonTime = format(lesson.startTime, "h:mm a");
      const lessonType = lesson.type.replace("_", " ");
      const lateTag = isLateCancellation ? " (Late cancellation - within 24 hours)" : "";

      for (const admin of adminUsers) {
        await createNotification({
          userId: admin.id,
          title: "Lesson Cancelled by Student",
          message: `${studentName} cancelled their ${lessonType} lesson on ${lessonDate} at ${lessonTime}${lateTag}`,
          type: "WARNING",
        });
      }

      return { ...updatedLesson, isLateCancellation };
    } catch (error) {
      console.error("[CANCEL] Error cancelling lesson:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to cancel lesson",
        cause: error,
      });
    }
  }),
```

**Important notes:**
- `createNotification` is already imported at line 7 of bookingQueries.ts
- `format` from date-fns is already imported at line 4
- `googleCalendar` is already imported at line 9
- The `include` changes from `TimeSlot: true` to `Student: { include: { User: true } }, Rink: true`
- Remove the `as any` type assertion on the old include

**Step 2: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/features/student/api/queries/bookingQueries.ts
git commit -m "feat: allow late cancellations with admin notification

Students can now cancel lessons within 24 hours (previously blocked).
Late cancellations are flagged in the admin notification so Yura knows
the student is responsible for the lesson fee. Admin receives in-app
notification for all student cancellations."
```

---

## Task 3: Update CancellationDialog to support late-cancel mode

**Files:**
- Modify: `src/features/student/components/schedule/CancellationDialog.tsx`

**Step 1: Add late-cancel props and checkbox state**

Update `CancellationDialogProps` to accept `isLateCancellation` and `lessonPrice`:

```typescript
interface CancellationDialogProps {
  lessonId: string;
  open: boolean;
  onCloseAction: () => void;
  isLateCancellation?: boolean;
  lessonPrice?: number;
}
```

Add checkbox state and update the component signature:

```typescript
export function CancellationDialog({
  lessonId,
  open,
  onCloseAction,
  isLateCancellation = false,
  lessonPrice = 0,
}: CancellationDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feeAcknowledged, setFeeAcknowledged] = useState(false);
  const router = useRouter();
```

**Step 2: Update the dialog body**

Replace the static yellow policy banner with conditional rendering. When `isLateCancellation` is true, show a red warning with the fee acknowledgment checkbox. Add the `Checkbox` import:

```typescript
import { Checkbox } from "@/components/ui/checkbox";
```

Replace the inner `<div className="space-y-4">` content:

```tsx
<div className="space-y-4">
  {isLateCancellation ? (
    <div className="flex items-start gap-2 p-4 bg-red-50 rounded-lg border border-red-200">
      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
      <div className="space-y-2">
        <p className="font-semibold text-red-800">Late Cancellation — You Will Be Charged</p>
        <p className="text-sm text-red-700">
          This lesson is within 24 hours. Per our cancellation policy, you are
          responsible for the full lesson fee of{" "}
          <span className="font-semibold">${lessonPrice.toFixed(2)}</span>.
        </p>
      </div>
    </div>
  ) : (
    <div className="flex items-start gap-2 p-4 bg-yellow-50 rounded-lg">
      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
      <div>
        <p className="font-medium text-yellow-800">Cancellation Policy</p>
        <p className="text-sm text-yellow-700 mt-1">
          Lessons must be cancelled at least 24 hours in advance. Late
          cancellations may still be charged.
        </p>
      </div>
    </div>
  )}

  <div className="space-y-2">
    <label htmlFor="cancellation-reason" className="text-sm font-medium">
      Reason for Cancellation
    </label>
    <Textarea
      id="cancellation-reason"
      placeholder="Please provide a reason for cancelling this lesson"
      value={reason}
      onChange={(e) => setReason(e.target.value)}
    />
  </div>

  {isLateCancellation && (
    <div className="flex items-center space-x-2">
      <Checkbox
        id="fee-acknowledged"
        checked={feeAcknowledged}
        onCheckedChange={(checked) => setFeeAcknowledged(checked === true)}
      />
      <label
        htmlFor="fee-acknowledged"
        className="text-sm font-medium leading-none cursor-pointer"
      >
        I understand I am responsible for the lesson fee of ${lessonPrice.toFixed(2)}
      </label>
    </div>
  )}

  <div className="flex justify-end gap-2 pt-2">
    <Button
      variant="outline"
      onClick={onCloseAction}
      disabled={isSubmitting || cancelLesson.isPending}
    >
      Go Back
    </Button>
    <Button
      variant="destructive"
      onClick={handleCancellation}
      disabled={
        isSubmitting ||
        cancelLesson.isPending ||
        (isLateCancellation && !feeAcknowledged)
      }
    >
      {isSubmitting || cancelLesson.isPending ? "Cancelling..." : "Confirm Cancellation"}
    </Button>
  </div>
</div>
```

**Step 3: Reset state when dialog opens/closes**

Add a `useEffect` to reset `feeAcknowledged` and `reason` when dialog opens:

```typescript
useEffect(() => {
  if (open) {
    setReason("");
    setFeeAcknowledged(false);
    setIsSubmitting(false);
  }
}, [open]);
```

**Step 4: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/student/components/schedule/CancellationDialog.tsx
git commit -m "feat: add late-cancel mode to CancellationDialog

When isLateCancellation is true, the dialog shows a red warning banner
with the lesson fee amount and requires the student to check a fee
acknowledgment checkbox before the confirm button is enabled."
```

---

## Task 4: Add cancel button to lesson detail page

**Files:**
- Create: `src/app/(protected)/student/schedule/[lessonId]/client.tsx` — client component with cancel button + dialog
- Modify: `src/app/(protected)/student/schedule/[lessonId]/page.tsx` — render the client component, pass lesson data

**Step 1: Create the client component**

The lesson detail page is currently a server component. We need a client component for the interactive cancel button and dialog. Create `src/app/(protected)/student/schedule/[lessonId]/client.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CancellationDialog } from "@/features/student/components/schedule/CancellationDialog";

interface LessonCancelActionProps {
  lessonId: string;
  lessonPrice: number;
  lessonStartTime: string; // ISO string from server
  lessonStatus: string;
}

export function LessonCancelAction({
  lessonId,
  lessonPrice,
  lessonStartTime,
  lessonStatus,
}: LessonCancelActionProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Only show cancel button for scheduled lessons that haven't started
  if (lessonStatus !== "SCHEDULED") return null;
  const startTime = new Date(lessonStartTime);
  if (startTime < new Date()) return null;

  const hoursUntilLesson = (startTime.getTime() - Date.now()) / (1000 * 60 * 60);
  const isLateCancellation = hoursUntilLesson < 24;

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setCancelDialogOpen(true)}>
        Cancel Lesson
      </Button>

      <CancellationDialog
        lessonId={lessonId}
        open={cancelDialogOpen}
        onCloseAction={() => setCancelDialogOpen(false)}
        isLateCancellation={isLateCancellation}
        lessonPrice={lessonPrice}
      />
    </>
  );
}
```

**Step 2: Wire into the lesson detail page**

In `src/app/(protected)/student/schedule/[lessonId]/page.tsx`:

Add import at the top:
```typescript
import { LessonCancelAction } from "./client";
```

After the `<h1>Lesson Details</h1>` line (~line 80), replace the heading section with:

```tsx
<div className="flex items-center justify-between">
  <h1 className="text-2xl font-bold">Lesson Details</h1>
  <LessonCancelAction
    lessonId={lesson.id}
    lessonPrice={lesson.price}
    lessonStartTime={lesson.startTime.toISOString()}
    lessonStatus={lesson.status}
  />
</div>
```

**Step 3: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/(protected)/student/schedule/\[lessonId\]/client.tsx src/app/(protected)/student/schedule/\[lessonId\]/page.tsx
git commit -m "feat: add cancel button to student lesson detail page

Students now see a Cancel Lesson button on their lesson detail page.
It opens the CancellationDialog with late-cancel awareness — lessons
within 24 hours show the fee warning and require acknowledgment."
```

---

## Task 5: Add cancel action to lesson cards in schedule list

**Files:**
- Modify: `src/features/student/components/schedule/LessonCard.tsx`

**Step 1: Add cancel button and dialog to LessonCard**

Import the CancellationDialog and add a cancel button next to "View Details" for upcoming scheduled lessons:

Add imports:
```typescript
import { useState } from "react";
import { CancellationDialog } from "./CancellationDialog";
```

Add state inside the component:
```typescript
const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
```

Calculate late cancellation status:
```typescript
const now = new Date();
const isUpcoming = lesson.startTime > now && lesson.status === "SCHEDULED";
const hoursUntilLesson = (lesson.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
const isLateCancellation = hoursUntilLesson < 24;
```

Update the actions section (replace lines 55-62):
```tsx
{showActions && (
  <div className="mt-4 flex justify-end gap-2">
    {isUpcoming && (
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={() => setCancelDialogOpen(true)}
      >
        Cancel
      </Button>
    )}
    <Button variant="outline" size="sm" asChild>
      <Link href={`/student/schedule/${lesson.id}`}>View Details</Link>
    </Button>
  </div>
)}

{isUpcoming && (
  <CancellationDialog
    lessonId={lesson.id}
    open={cancelDialogOpen}
    onCloseAction={() => setCancelDialogOpen(false)}
    isLateCancellation={isLateCancellation}
    lessonPrice={lesson.price}
  />
)}
```

**Step 2: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/features/student/components/schedule/LessonCard.tsx
git commit -m "feat: add cancel action to lesson cards in schedule list

Students can now cancel lessons directly from the schedule list view
without navigating to the lesson detail page."
```

---

## Task 6: Add Policies tab to student schedule page

**Files:**
- Modify: `src/app/(protected)/student/schedule/client.tsx` — add "Policies" tab alongside Upcoming/Past

**Step 1: Add the Policies tab**

In `client.tsx`, add a third tab to the existing `Tabs` component. Import `FileText` icon from lucide-react.

Add import:
```typescript
import { FileText } from "lucide-react";
```

Add the new `TabsTrigger` after the "Past" trigger:
```tsx
<TabsTrigger value="policies">Policies</TabsTrigger>
```

Update the `activeTab` state type to include "policies":
```typescript
const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "policies">("upcoming");
```

Add the `TabsContent` for policies after the past lessons TabsContent (before the closing `</Tabs>`):

```tsx
<TabsContent value="policies" className="pt-4">
  <Card>
    <CardContent className="py-6 space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Lesson Policies</h2>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-base">Cancellation Policy</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1.5">
            <li>Lessons may be cancelled at any time before the scheduled start.</li>
            <li>
              Cancellations made <span className="font-medium">more than 24 hours</span> before
              the lesson are free of charge.
            </li>
            <li>
              Cancellations made <span className="font-medium">within 24 hours</span> of the
              lesson are considered late cancellations. You will be{" "}
              <span className="font-medium">responsible for the full lesson fee</span>.
            </li>
            <li>
              To cancel a lesson, use the <span className="font-medium">Cancel</span> button
              on your lesson card or lesson details page.
            </li>
          </ul>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-base">Payment Policy</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1.5">
            <li>Payment is expected for each scheduled lesson.</li>
            <li>Accepted payment methods: Venmo and Zelle.</li>
            <li>
              Your payment reference code is provided after booking — include
              it with your payment for tracking purposes.
            </li>
          </ul>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-base">Booking Policy</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1.5">
            <li>Lessons are booked on a first-come, first-served basis.</li>
            <li>You may only book available time slots shown on the booking page.</li>
            <li>
              If you need to switch lesson times, cancel the current lesson and
              book a new available slot.
            </li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
</TabsContent>
```

**Step 2: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/(protected)/student/schedule/client.tsx
git commit -m "feat: add Policies tab to student schedule page

Students can now view cancellation, payment, and booking policies
directly from their schedule page. The cancellation policy clearly
states the 24-hour rule and late cancellation fee responsibility."
```

---

## Task 7: Manual verification

**Step 1: Start dev server**

Run: `pnpm dev`

**Step 2: Test Policies tab**

1. Log in as a student
2. Navigate to `/student/schedule`
3. Click the "Policies" tab
4. Verify cancellation policy, payment policy, and booking policy sections are visible
5. Verify the 24-hour rule and late cancellation fee language is clear

**Step 3: Test standard cancellation (> 24 hours)**

1. Log in as a student
2. Navigate to `/student/schedule`
3. Find a lesson more than 24 hours away
4. Click "Cancel" on the card — verify yellow policy banner, reason field, no checkbox
5. Enter reason, click Confirm Cancellation
6. Verify lesson shows as cancelled
7. Log in as admin — verify notification bell shows the cancellation

**Step 3: Test late cancellation (< 24 hours)**

1. Log in as a student
2. Navigate to a lesson within 24 hours (or use a test lesson)
3. Click "Cancel" — verify red warning banner with price, checkbox required
4. Verify Confirm button is disabled until checkbox is checked
5. Check the box, enter reason, confirm
6. Log in as admin — verify notification says "(Late cancellation - within 24 hours)"

**Step 4: Test lesson detail page**

1. Navigate to `/student/schedule/[lessonId]` for a scheduled lesson
2. Verify "Cancel Lesson" button appears
3. Click it — verify dialog opens correctly
4. Navigate to a cancelled lesson — verify no cancel button shown

**Step 5: Test edge cases**

1. Past lessons — no cancel button should appear
2. Cancelled lessons — no cancel button should appear
3. Cancel dialog — try submitting without a reason, verify error toast

**Step 6: Run type-check and lint**

Run: `pnpm type-check && pnpm lint`
Expected: PASS

**Step 7: Final commit (if any fixes needed)**

```bash
git commit -m "fix: address issues found during manual testing"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Remove duplicate cancel endpoint | `lessonQueries.ts` |
| 2 | Allow late cancels + admin notification | `bookingQueries.ts` |
| 3 | Add late-cancel mode to dialog | `CancellationDialog.tsx` |
| 4 | Cancel button on lesson detail page | `[lessonId]/client.tsx` (new), `[lessonId]/page.tsx` |
| 5 | Cancel action on lesson cards | `LessonCard.tsx` |
| 6 | Add Policies tab to schedule page | `client.tsx` (schedule) |
| 7 | Manual verification | — |
