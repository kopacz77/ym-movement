# Draft/Publish Schedule Design

**Date:** 2026-03-21
**Status:** Approved

## Problem

Students book slots the instant they appear, before Yura can arrange the week (e.g., reserving a slot for an out-of-country student). She needs to set up the schedule privately, then make it visible when ready.

## Mechanism

Use the existing `isActive` field on `RinkTimeSlot`:
- `isActive: false` = **Draft** (visible to admin only, gray on calendar)
- `isActive: true` = **Published** (visible to students, bookable)

No schema migration needed — the field, indexes, student query filters, and calendar styling all exist.

## Behavior Changes

### 1. Creation defaults to draft
- Both `CompactTimeSlotDialog` (single) and `createBulkTimeSlots` (bulk) create slots with `isActive: false`
- Admin calendar shows them in gray with a "Draft" indicator
- Students cannot see or book draft slots (already enforced by existing queries)

### 2. Publish button in schedule header
- New "Publish Drafts" button appears in `ScheduleHeader` when draft slots exist in the current view
- One click publishes all draft slots in the current date range (and coach filter if active)
- Confirmation toast: "Published X time slots"
- Button hides when no drafts remain

### 3. Publish is one-way
- Once published, slots cannot be reverted to draft
- Admins can still delete or edit published slots as before

### 4. Visual distinction
- Draft slots: gray background with dashed border or subtle "DRAFT" label (leveraging existing `isActive: false` gray styling)
- Published slots: current color scheme (green/amber/blue)

### 5. Backend
- New mutation: `publishTimeSlots({ startDate, endDate, coachId? })` — updates `isActive` to `true` for matching draft slots
- Modify `createTimeSlot` and `createBulkTimeSlots` to set `isActive: false` by default

## Files to Modify

| File | Change |
|------|--------|
| `timeSlotQueries.ts` | Default `isActive: false` in create mutations; add `publishTimeSlots` mutation |
| `ScheduleHeader.tsx` | Add "Publish Drafts" button (conditional) |
| `ScheduleManager.tsx` | Wire publish mutation, pass draft count to header |
| `useCalendarEvents.ts` | Add dashed border / "Draft" label for inactive slots |
| `CompactTimeSlotDialog.tsx` | No change needed (already passes through to create mutation) |

## Existing Infrastructure Leveraged

- `isActive` field with 5 database indexes
- Student availability query already filters `isActive: true`
- Calendar already renders inactive slots as gray
- Bulk operations context and toolbar patterns exist
- Toast notification system ready
