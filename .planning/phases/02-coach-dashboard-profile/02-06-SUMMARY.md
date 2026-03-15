---
phase: 02-coach-dashboard-profile
plan: 06
subsystem: scheduling-proposals
tags: [trpc, proposals, coach-availability, admin-approval, time-slots]
completed: 2026-03-15
duration: 5min

dependency_graph:
  requires: ["02-01", "02-04", "02-05"]
  provides: ["coach-proposal-system", "admin-proposal-approval", "proposal-to-timeslot-flow"]
  affects: ["03-query-scoping", "04-scheduling"]

tech_stack:
  added: []
  patterns: ["proposal-approval-workflow", "transaction-based-approval", "coach-scoped-mutations"]

key_files:
  created:
    - src/features/coach/api/queries/proposalQueries.ts
    - src/features/coach/components/proposals/ProposeAvailabilityForm.tsx
    - src/features/coach/components/proposals/ProposalsList.tsx
    - src/app/(protected)/coach/proposals/page.tsx
    - src/features/admin/api/queries/coach/proposalApprovalQueries.ts
    - src/features/admin/components/coaches/proposals/CoachProposalQueue.tsx
  modified:
    - src/features/coach/api/queries/index.ts
    - src/features/admin/api/queries/coach/index.ts
    - src/app/(protected)/admin/coaches/page.tsx

decisions:
  - id: proposal-rinks-query
    decision: "Added getRinks query to proposalRouter for coach rink selection (coachProcedure-scoped)"
    reason: "Coach needs rink list for proposal form; existing rink queries are admin-scoped"
  - id: approval-transaction
    decision: "Approval uses $transaction to atomically create RinkTimeSlot and update proposal status"
    reason: "Ensures data consistency -- no orphaned approvals without time slots"
  - id: deny-dialog-with-notes
    decision: "Deny action opens a dialog for optional admin notes instead of inline confirm"
    reason: "Better UX for providing denial reasons; coach can see the reason in their proposals list"
  - id: isActive-not-isAvailable
    decision: "Created RinkTimeSlot uses isActive: true (matches schema field name, not isAvailable as in plan)"
    reason: "RinkTimeSlot model has isActive field, not isAvailable -- plan had incorrect field name"

metrics:
  tasks_completed: 2
  tasks_total: 2
  commits: 2
  duration: 5min
---

# Phase 2 Plan 6: Coach Time Slot Proposals Summary

**One-liner:** Coach proposal form with rink/date/time selection, admin approval queue creating real RinkTimeSlots via transactional approval flow.

## What Was Built

### Coach-Side (Task 1)
- **proposalQueries.ts**: TRPC router with `createProposal`, `getMyProposals`, `cancelProposal`, and `getRinks` queries, all using `coachProcedure` and scoped to `ctx.coach.id`
- **ProposeAvailabilityForm.tsx**: React Hook Form + Zod form with rink dropdown, date picker (Calendar popover), start/end time inputs, and max students field
- **ProposalsList.tsx**: Table displaying proposals with status badges (yellow=Pending, green=Approved, red=Denied), admin notes column, and cancel button for pending proposals
- **Coach proposals page**: `/coach/proposals` page composing the form and list

### Admin-Side (Task 2)
- **proposalApprovalQueries.ts**: TRPC router with `getPendingProposals`, `approveProposal`, `denyProposal`, and `getAllProposals` queries, all using `superAdminProcedure`
- **CoachProposalQueue.tsx**: Table showing pending proposals with coach name/email, rink, date/time, max students, submitted date; approve and deny action buttons; deny dialog with optional notes textarea
- **Admin coaches page**: Added "Proposals" tab (3rd tab) with dynamic import of CoachProposalQueue

### End-to-End Flow
1. Coach fills out proposal form (rink, date, time, max students)
2. Proposal saved as ProposedTimeSlot with PENDING status
3. Admin sees proposal in Proposals tab on /admin/coaches
4. Admin approves: `$transaction` creates RinkTimeSlot + updates proposal to APPROVED
5. Admin denies: Dialog for optional notes, proposal updated to DENIED with adminNotes
6. Coach sees updated status and admin notes in their proposals list

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| getRinks in proposalRouter | Coach needs rink list; existing queries are admin-scoped |
| $transaction for approval | Atomic RinkTimeSlot creation + proposal status update |
| Deny dialog with notes | Better UX for providing denial context to coaches |
| isActive (not isAvailable) | Matches actual RinkTimeSlot schema field name |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RinkTimeSlot uses isActive not isAvailable**
- **Found during:** Task 2
- **Issue:** Plan specified `isAvailable: true` but RinkTimeSlot schema uses `isActive` field
- **Fix:** Used `isActive: true` matching the actual schema
- **Files modified:** proposalApprovalQueries.ts

## Verification

- [x] `pnpm type-check` passes
- [x] `pnpm lint` passes
- [x] Coach proposals page at /coach/proposals
- [x] Proposal form with rink selector, date picker, time inputs, max students
- [x] Proposals list with status badges and cancel for pending
- [x] Admin Proposals tab on /admin/coaches
- [x] Approve creates RinkTimeSlot via transaction
- [x] Deny records optional admin notes

## Commits

| Hash | Message |
|------|---------|
| 3cabe8a | feat(02-06): coach-side proposal TRPC queries, form, and page |
| 2210ff8 | feat(02-06): admin-side proposal approval queries and UI |
