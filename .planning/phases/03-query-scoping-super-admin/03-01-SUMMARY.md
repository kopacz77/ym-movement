---
phase: 03-query-scoping-super-admin
plan: 01
subsystem: api
tags: [trpc, adminProcedure, coachId, query-scoping, overlap-detection, schedule]

# Dependency graph
requires:
  - phase: 01-auth-schema-foundation
    provides: "adminProcedure middleware in trpc.ts"
  - phase: 01-auth-schema-foundation
    provides: "coachId columns on Lesson, RinkTimeSlot, BlockedDateRange"
provides:
  - "Admin schedule queries secured behind adminProcedure"
  - "Optional coachId filtering on time slot, lesson, and blocked date reads"
  - "Per-coach overlap detection for time slots and blocked dates"
  - "coachId inheritance from time slot to lesson on assignment"
  - "Recurring pattern slot creation includes coachId"
affects: [coach-dashboard, super-admin-dashboard, multi-coach-scheduling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional coachId spread pattern: ...(input.coachId && { coachId: input.coachId })"
    - "Per-coach overlap detection via coachId in findFirst where clause"
    - "Lesson coachId inheritance from RinkTimeSlot (timeSlot.coachId)"
    - "adminProcedure for all admin schedule query files"

key-files:
  modified:
    - src/features/admin/api/queries/schedule/timeSlotQueries.ts
    - src/features/admin/api/queries/schedule/lessonQueries.ts
    - src/features/admin/api/queries/schedule/blockedDateQueries.ts
    - src/features/admin/api/queries/schedule/recurringPatternQueries.ts

# Decisions
decisions:
  - id: "03-01-01"
    decision: "Students remain shared resource -- getStudents not scoped by coachId"
    rationale: "Students train with multiple coaches; scoping would break assignment dropdown"
  - id: "03-01-02"
    decision: "assignStudentToTimeSlot inherits coachId from timeSlot, not from input"
    rationale: "Time slot already knows its coach; prevents mismatch between slot and lesson coach"
  - id: "03-01-03"
    decision: "Delete operations not scoped by coachId (admin can delete any)"
    rationale: "Admins need full management capability; coach-scoped deletes will be in coach dashboard"
  - id: "03-01-04"
    decision: "updateTimeSlot overlap check uses existing slot's coachId from DB lookup"
    rationale: "Slot coachId is immutable after creation; overlap must match the slot's own coach"

# Metrics
metrics:
  duration: "5min"
  completed: "2026-03-15"
  tasks: 2/2
---

# Phase 03 Plan 01: Admin Schedule Query Scoping Summary

**One-liner:** Coach-scoped reads, creates, and overlap detection across all four admin schedule query files using adminProcedure with optional coachId filtering.

## What Was Done

### Task 1: Scope timeSlotQueries.ts and lessonQueries.ts (bb4b007)

**timeSlotQueries.ts:**
- Replaced `protectedProcedure` with `adminProcedure` across all 6 endpoints (getTimeSlots, createTimeSlot, deleteTimeSlot, updateTimeSlot, deleteBulkTimeSlots, createBulkTimeSlots)
- Added optional `coachId` to getTimeSlots input with where-clause filtering
- Added optional `coachId` to createTimeSlot input with data spread and per-coach overlap detection
- Scoped updateTimeSlot overlap detection using existing slot's coachId from DB lookup
- Added `coachId` to createBulkTimeSlots input, slot data objects, and both overlap detection branches (skipOverlapping and createMany)
- Updated TimeSlot interface to include optional coachId field
- Delete endpoints unchanged (admin can delete any slot)

**lessonQueries.ts:**
- Replaced `protectedProcedure` with `adminProcedure` across all 7 endpoints
- Added optional `coachId` to getLessonsByDate input with where-clause filtering
- Added optional `coachId` to createLesson input with fallback chain: `input.coachId || timeSlot.coachId || undefined`
- Updated assignStudentToTimeSlot to inherit coachId from timeSlot: `...(timeSlot.coachId && { coachId: timeSlot.coachId })`
- getStudents, cancelLesson, updateLessonType, unassignStudent left unscoped (shared resources / ID-based operations)

### Task 2: Scope blockedDateQueries.ts and recurringPatternQueries.ts (d35e9b3)

**blockedDateQueries.ts:**
- Replaced `protectedProcedure` with `adminProcedure` across all 4 endpoints
- Added optional `coachId` to getBlockedDatesSchema with where-clause filtering
- Added optional `coachId` to createBlockedDateSchema with data spread
- Scoped createBlockedDate overlap detection per-coach
- Scoped updateBlockedDate overlap detection using existing record's coachId
- deleteBlockedDate unchanged (admin can delete any)

**recurringPatternQueries.ts:**
- Replaced `protectedProcedure` with `adminProcedure`
- Added optional `coachId` to createRecurringPattern input
- Included coachId in each generated RinkTimeSlot object

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

1. `pnpm type-check` -- zero errors in all four modified files (pre-existing errors in approvalQueries.ts unrelated)
2. Zero `protectedProcedure` matches across entire `src/features/admin/api/queries/schedule/` directory
3. All four files import `adminProcedure` from `@/lib/trpc`
4. Time slot overlap detection includes coachId in where clause (create, update, bulk create)
5. Blocked date overlap detection includes coachId in where clause (create, update)

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| bb4b007 | feat | scope timeSlotQueries.ts and lessonQueries.ts |
| d35e9b3 | feat | scope blockedDateQueries.ts and recurringPatternQueries.ts |
