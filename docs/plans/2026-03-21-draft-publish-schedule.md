# Draft/Publish Schedule Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Slots default to draft (hidden from students) and are published explicitly by the coach when ready.

**Architecture:** Leverage the existing `isActive` boolean on `RinkTimeSlot` — `false` = draft, `true` = published. No schema migration. Admin query currently filters `isActive: true`, so we must remove that filter for admins to see drafts. Student queries already filter `isActive: true` — no change needed there.

**Tech Stack:** tRPC mutations, React state, Sonner toasts, Tailwind CSS, Prisma ORM

---

### Task 1: Backend — Make admin query show all slots (draft + published)

**Files:**
- Modify: `src/features/admin/api/queries/schedule/timeSlotQueries.ts:47`

**Step 1: Remove `isActive: true` filter from admin `getTimeSlots` query**

Change line 47 from:
```typescript
            isActive: true,
```
to remove this line entirely. The admin needs to see both draft and published slots.

**Step 2: Verify overlap detection still only checks active slots**

Confirm line 179 still has `isActive: true` in the overlap check — drafts should NOT block overlap detection for published slots. (Read-only check, no change expected.)

**Step 3: Commit**

```bash
git add src/features/admin/api/queries/schedule/timeSlotQueries.ts
git commit -m "feat: show draft slots on admin calendar by removing isActive filter"
```

---

### Task 2: Backend — Default new slots to draft (`isActive: false`)

**Files:**
- Modify: `src/features/admin/api/queries/schedule/timeSlotQueries.ts:137` (createTimeSlot default)
- Modify: `src/features/admin/api/queries/schedule/timeSlotQueries.ts:646` (createBulkTimeSlots)

**Step 1: Change createTimeSlot default from `true` to `false`**

Line 137, change:
```typescript
          isActive: z.boolean().default(true),
```
to:
```typescript
          isActive: z.boolean().default(false),
```

**Step 2: Change createBulkTimeSlots to use `false`**

Line 646, change:
```typescript
              isActive: true,
```
to:
```typescript
              isActive: false,
```

**Step 3: Commit**

```bash
git add src/features/admin/api/queries/schedule/timeSlotQueries.ts
git commit -m "feat: default new time slots to draft (isActive: false)"
```

---

### Task 3: Backend — Add `publishTimeSlots` mutation

**Files:**
- Modify: `src/features/admin/api/queries/schedule/timeSlotQueries.ts` (add new mutation to `timeSlotRouter`)

**Step 1: Add the publishTimeSlots mutation**

Add this mutation to the `timeSlotRouter` (after the existing `deleteTimeSlot` mutation, before the closing `});`):

```typescript
  publishTimeSlots: adminProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        coachId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.prisma.rinkTimeSlot.updateMany({
          where: {
            isActive: false,
            startTime: { gte: input.startDate },
            endTime: { lte: input.endDate },
            ...(input.coachId && { coachId: input.coachId }),
          },
          data: {
            isActive: true,
            updatedAt: new Date(),
          },
        });

        return { publishedCount: result.count };
      } catch (error) {
        console.error("Error publishing time slots:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to publish time slots",
          cause: error,
        });
      }
    }),
```

**Step 2: Ensure `TRPCError` import exists at top of file**

It should already be imported. Verify.

**Step 3: Commit**

```bash
git add src/features/admin/api/queries/schedule/timeSlotQueries.ts
git commit -m "feat: add publishTimeSlots mutation for bulk draft publishing"
```

---

### Task 4: Frontend — Add "DRAFT" label to calendar events

**Files:**
- Modify: `src/hooks/useCalendarEvents.ts:87-98`

**Step 1: Prepend "DRAFT" to title for inactive slots**

After the existing title building (line ~92, after the coach name append), add a draft prefix. Find the block:

```typescript
      // Determine color based on slot status
      let backgroundColor = "#22c55e"; // green-500 (default/available)
```

Insert before that block:
```typescript
      // Prefix draft indicator for unpublished slots
      if (!slot.isActive) {
        title = `[DRAFT] ${title}`;
      }
```

**Step 2: Commit**

```bash
git add src/hooks/useCalendarEvents.ts
git commit -m "feat: show DRAFT label on unpublished calendar slots"
```

---

### Task 5: Frontend — Add "Publish Drafts" button to ScheduleHeader

**Files:**
- Modify: `src/features/admin/components/scheduling/ScheduleHeader.tsx`

**Step 1: Add props to ScheduleHeaderProps interface**

Add these to the `ScheduleHeaderProps` interface:
```typescript
  // Draft publish props
  draftCount?: number;
  onPublishDrafts?: () => void;
  isPublishing?: boolean;
```

**Step 2: Destructure new props in component**

Add to the destructured props:
```typescript
  draftCount = 0,
  onPublishDrafts,
  isPublishing = false,
```

**Step 3: Add the Send (publish) icon import**

Update the lucide-react import at line 3:
```typescript
import { CheckSquare, Filter, Globe, Plane, Send } from "lucide-react";
```

**Step 4: Add the Publish Drafts button in the Action Buttons section**

Inside the `<div className="flex flex-wrap gap-2">` block (line 175), add before `<UndoBulkCreationButton />`:

```tsx
            {draftCount > 0 && onPublishDrafts && (
              <Button
                variant="default"
                size="sm"
                onClick={onPublishDrafts}
                disabled={isPublishing}
                className="flex items-center gap-2 text-xs sm:text-sm bg-green-600 hover:bg-green-700"
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {isPublishing ? "Publishing..." : `Publish ${draftCount} Draft${draftCount !== 1 ? "s" : ""}`}
                </span>
                <span className="sm:hidden">
                  {isPublishing ? "..." : `Publish (${draftCount})`}
                </span>
              </Button>
            )}
```

**Step 5: Commit**

```bash
git add src/features/admin/components/scheduling/ScheduleHeader.tsx
git commit -m "feat: add Publish Drafts button to schedule header"
```

---

### Task 6: Frontend — Wire publish mutation in ScheduleManager

**Files:**
- Modify: `src/features/admin/components/scheduling/ScheduleManager.tsx`

**Step 1: Compute draft count from filtered time slots**

After the `filteredTimeSlots` useMemo (around line 212), add:

```typescript
  // Count draft (unpublished) slots in current view
  const draftCount = useMemo(() => {
    if (!filteredTimeSlots) return 0;
    return filteredTimeSlots.filter((slot) => !slot.isActive).length;
  }, [filteredTimeSlots]);
```

**Step 2: Add the publish mutation call**

After the `handleEnhancedBookingSubmit` callback (around line 571), add:

```typescript
  // Handle publishing all draft slots in current view
  const publishMutation = api.admin.schedule.publishTimeSlots.useMutation({
    onSuccess: (data) => {
      toast.success(`Published ${data.publishedCount} time slot${data.publishedCount !== 1 ? "s" : ""}`);
    },
    onError: (error) => {
      toast.error("Failed to publish time slots", {
        description: error.message,
      });
    },
  });

  const handlePublishDrafts = useCallback(() => {
    publishMutation.mutate({
      startDate: dateRange.start,
      endDate: dateRange.end,
      ...(selectedCoach && { coachId: selectedCoach }),
    });
  }, [publishMutation, dateRange, selectedCoach]);
```

**Step 3: Pass props to ScheduleHeader**

Add these props to the `<ScheduleHeader>` component (around line 636):

```tsx
        draftCount={draftCount}
        onPublishDrafts={handlePublishDrafts}
        isPublishing={publishMutation.isPending}
```

**Step 4: Commit**

```bash
git add src/features/admin/components/scheduling/ScheduleManager.tsx
git commit -m "feat: wire publish drafts mutation to schedule header"
```

---

### Task 7: Verification

**Step 1: Run type check**

```bash
npx tsc --noEmit --pretty
```
Expected: No errors.

**Step 2: Manual testing checklist**

1. Log in as Super Admin, navigate to Schedule Management
2. Create a single time slot — appears gray with "[DRAFT]" label on calendar
3. Bulk create slots — all appear gray with "[DRAFT]" labels
4. "Publish Drafts" button shows with count (e.g., "Publish 5 Drafts")
5. Log in as student in another browser — draft slots NOT visible on booking page
6. Back to admin — click "Publish Drafts" — slots turn green, button disappears
7. Student browser — refresh — published slots now visible and bookable

**Step 3: Final commit (if any fixes needed)**
