# Storybook Coverage Audit

_Generated: 2026-05-29 (Phase 22 — v2.0 finalization)._
_Update process: when adding a new `.stories.tsx`, flip the corresponding row below from `No` to `YES` (and `DONE` in the Priority column). When adding a new component, append a row with Priority assigned per the glossary at the bottom. This file is reviewed during PR review._

## Summary

- **Total components**: 237 (under `src/components/` and `src/features/*/components/`, excluding `*.stories.tsx`, `*.test.tsx`, and `__tests__/`).
- **Components with `.stories.tsx`**: 28 (~11.8%).
- **VRT snapshot IDs**: 33 (in `tests/storybook-vrt.spec.ts`). The 13 `wardrobe-*` IDs from Phase 21-05 are still pending baseline PNG generation — gated on Phase 22-01 `randomBytes` Vite fix, which is now resolved. Plan 22-03 covers the baseline-generation pass.
- **Last audit**: Phase 22 (v2.0 milestone, 2026-05-29).
- **Next audit**: Whenever the Storybook coverage strategy is revisited (v2.1+).

## Coverage by Area

| Area                                                    | Total `.tsx` | Storied | Coverage |
| ------------------------------------------------------- | -----------: | ------: | -------: |
| `src/components/` (incl. ui, layout, landing, public)   |           73 |       5 |     6.8% |
| └─ `src/components/ui/` (subset of the above)           |           52 |       5 |     9.6% |
| `src/features/admin/components/`                        |           80 |       7 |     8.8% |
| `src/features/auth/components/`                         |            1 |       0 |       0% |
| `src/features/coach/components/`                        |           14 |       3 |    21.4% |
| `src/features/notifications/components/`                |            1 |       0 |       0% |
| `src/features/scheduling/components/`                   |           21 |       1 |     4.8% |
| `src/features/student/components/`                      |           14 |       2 |    14.3% |
| `src/features/wardrobe/components/`                     |           33 |      10 |    30.3% |
| **TOTAL**                                               |      **237** |  **28** | **11.8%** |

## Component Inventory

Legend for the `Story?` column: `YES` = a sibling `.stories.tsx` exists. `No` = no story yet. `VRT?` is `YES` only when the story has at least one snapshot ID committed to `tests/storybook-vrt.spec.ts`. A `*` suffix means the story exists but the baseline PNG is still pending (deferred to Plan 22-03).

### `src/components/ui/` (52 components)

| Component                          | Story? |  VRT? | Priority | Notes                                                    |
| ---------------------------------- | :----: | :---: | :------- | :------------------------------------------------------- |
| alert-dialog.tsx                   |   No   |   —   | MEDIUM   | Confirmation flows                                       |
| alert.tsx                          |   No   |   —   | HIGH     | Used in form/error surfaces                              |
| avatar.tsx                         |   No   |   —   | HIGH     | Rendered in all 3 headers                                |
| badge.tsx                          |  YES   |  YES  | DONE     | `badge.stories.tsx` — 2 VRT snapshots                    |
| beautiful-layout.tsx               |   No   |   —   | LOW      | One-off layout helper                                    |
| beautiful-typography.tsx           |   No   |   —   | LOW      | One-off typography helper                                |
| breadcrumb.tsx                     |   No   |   —   | MEDIUM   | Page navigation primitive                                |
| button.tsx                         |  YES   |  YES  | DONE     | `button.stories.tsx` — 2 VRT snapshots                   |
| calendar-skeleton.tsx              |   No   |   —   | LOW      | Loading state, narrow use                                |
| calendar.tsx                       |   No   |   —   | MEDIUM   | Date picker primitive                                    |
| card.tsx                           |  YES   |  YES  | DONE     | `card.stories.tsx` — 2 VRT snapshots                     |
| celebration.tsx                    |   No   |   —   | LOW      | Animation overlay, one-off                               |
| chart-skeleton.tsx                 |   No   |   —   | LOW      | Loading state                                            |
| checkbox.tsx                       |   No   |   —   | MEDIUM   | Forms primitive                                          |
| collapsible.tsx                    |   No   |   —   | LOW      | Wraps Radix Collapsible                                  |
| command.tsx                        |   No   |   —   | LOW      | Command palette primitive                                |
| data-state.tsx                     |   No   |   —   | MEDIUM   | Empty/loading/error wrapper                              |
| delightful-loading.tsx             |   No   |   —   | LOW      | Animation overlay                                        |
| dialog.tsx                         |   No   |   —   | HIGH     | 35 import sites — **Plan 22-02 backfill candidate**      |
| draggable.tsx                      |   No   |   —   | LOW      | DnD helper                                               |
| dropdown-menu.tsx                  |   No   |   —   | HIGH     | Headers + tables                                         |
| encouraging-empty-state.tsx        |   No   |   —   | LOW      | Empty-state variant                                      |
| form.tsx                           |   No   |   —   | HIGH     | 14 import sites — **Plan 22-02 backfill candidate**      |
| input.tsx                          |  YES   |   —   | DONE     | `input.stories.tsx` (no VRT snapshot yet — defer)        |
| label.tsx                          |   No   |   —   | MEDIUM   | Forms primitive                                          |
| lesson-status.tsx                  |   No   |   —   | MEDIUM   | Status pill used across scheduling                       |
| loading-skeleton.tsx               |   No   |   —   | LOW      | Loading state                                            |
| optimized-form.tsx                 |   No   |   —   | LOW      | Perf-tuned wrapper                                       |
| page-container.tsx                 |   No   |   —   | LOW      | Layout primitive                                         |
| password-strength.tsx              |   No   |   —   | MEDIUM   | Auth form helper                                         |
| popover.tsx                        |   No   |   —   | MEDIUM   | Radix wrapper                                            |
| progress.tsx                       |   No   |   —   | LOW      | Loading progress bar                                     |
| responsive-dialog.tsx              |   No   |   —   | MEDIUM   | Responsive dialog wrapper                                |
| responsive-form.tsx                |   No   |   —   | LOW      | Responsive form wrapper                                  |
| scroll-area.tsx                    |   No   |   —   | LOW      | Wraps Radix ScrollArea                                   |
| select.tsx                         |   No   |   —   | HIGH     | 35 import sites — **Plan 22-02 backfill candidate**      |
| separator.tsx                      |   No   |   —   | LOW      | Visual divider                                           |
| sheet.tsx                          |   No   |   —   | MEDIUM   | Mobile/side drawer                                       |
| sidebar.tsx                        |   No   |   —   | N/A      | Replaced by `layout/AppSidebar.tsx` — unused legacy      |
| skeleton.tsx                       |  YES   |  YES  | DONE     | `skeleton.stories.tsx` — 1 VRT snapshot                  |
| slider.tsx                         |   No   |   —   | LOW      | Range input                                              |
| sonner.tsx                         |   No   |   —   | LOW      | Toaster mount point                                      |
| spinner.tsx                        |   No   |   —   | LOW      | Loading spinner                                          |
| switch.tsx                         |   No   |   —   | MEDIUM   | Toggle primitive                                         |
| table.tsx                          |   No   |   —   | HIGH     | 21 import sites — **Plan 22-02 backfill candidate**      |
| tabs.tsx                           |   No   |   —   | HIGH     | 16 import sites — **Plan 22-02 backfill candidate**      |
| textarea.tsx                       |   No   |   —   | MEDIUM   | Forms primitive                                          |
| tooltip.tsx                        |   No   |   —   | MEDIUM   | Radix wrapper                                            |
| touch-button.tsx                   |   No   |   —   | LOW      | Touch-target button variant                              |
| virtualized-list.tsx               |   No   |   —   | LOW      | Perf wrapper                                             |
| virtualized-table.tsx              |   No   |   —   | LOW      | Perf wrapper                                             |
| warm-greeting.tsx                  |   No   |   —   | LOW      | Decorative                                               |

### `src/components/` (top-level + non-ui subfolders: 21 components)

| Component (relative)                       | Story? | VRT? | Priority | Notes                                                  |
| ------------------------------------------ | :----: | :--: | :------- | :----------------------------------------------------- |
| AdaptiveTime.tsx                           |   No   |  —   | LOW      | Inline timezone-aware time formatter                   |
| ApprovalGuard.tsx                          |   No   |  —   | LOW      | Auth-gated wrapper                                     |
| TimezoneAwareLessonTime.tsx                |   No   |  —   | MEDIUM   | Used in many lesson cards                              |
| TimezoneNotice.tsx                         |   No   |  —   | LOW      | Inline banner                                          |
| bulk-create-confirmation.tsx               |   No   |  —   | LOW      | Admin scheduling dialog                                |
| bulk-create-templates.tsx                  |   No   |  —   | LOW      | Admin scheduling templates                             |
| calendar-preview.tsx                       |   No   |  —   | LOW      | Admin schedule preview helper                          |
| enhanced-error-boundary.tsx                |   No   |  —   | LOW      | Error-boundary wrapper                                 |
| error-boundary.tsx                         |   No   |  —   | LOW      | Error-boundary base                                    |
| landing/HeroSection.tsx                    |   No   |  —   | LOW      | Public landing hero                                    |
| landing/IceParticleCanvas.tsx              |   No   |  —   | LOW      | three.js canvas wrapper                                |
| landing/IceParticles.tsx                   |   No   |  —   | LOW      | three.js scene                                         |
| layout/AppLayout.tsx                       |   No   |  —   | N/A      | PINNED per CLAUDE.md — no story by design              |
| layout/AppSidebar.tsx                      |   No   |  —   | N/A      | PINNED per CLAUDE.md — no story by design              |
| mobile-navigation.tsx                      |   No   |  —   | LOW      | Mobile nav drawer                                      |
| optimized-image.tsx                        |   No   |  —   | LOW      | Image wrapper                                          |
| production-error-boundary.tsx              |   No   |  —   | LOW      | Production error boundary                              |
| public/PublicLayout.tsx                    |   No   |  —   | LOW      | Public-pages layout                                    |
| public/VideoModal.tsx                      |   No   |  —   | LOW      | Public video modal                                     |
| schedule-calendar-styles.tsx               |   No   |  —   | LOW      | CSS-in-JS injection                                    |
| service-worker-notifications.tsx           |   No   |  —   | LOW      | Service-worker bridge                                  |

### `src/features/admin/components/` (80 components)

| Component (relative)                                            | Story? | VRT? | Priority | Notes                                              |
| --------------------------------------------------------------- | :----: | :--: | :------- | :------------------------------------------------- |
| analytics/CoachDetailView.tsx                                   |   No   |  —   | LOW      | Single-use admin drill-down                        |
| analytics/CoachOverviewCards.tsx                                |   No   |  —   | MEDIUM   | Reused in analytics dashboard                      |
| analytics/OverviewCards.tsx                                     |   No   |  —   | MEDIUM   | Reused in analytics dashboard                      |
| analytics/PaymentStats.tsx                                      |   No   |  —   | MEDIUM   | Payment analytics card                             |
| analytics/RevenueBreakdownChart.tsx                             |  YES   | YES  | DONE     |                                                    |
| analytics/RevenueChart.tsx                                      |  YES   | YES  | DONE     |                                                    |
| analytics/StudentActivityChart.tsx                              |  YES   | YES  | DONE     |                                                    |
| coaches/management/CoachList.tsx                                |   No   |  —   | LOW      | Admin table                                        |
| coaches/management/CoachPendingApprovals.tsx                    |   No   |  —   | LOW      | Admin queue                                        |
| coaches/management/CoachStatusActions.tsx                       |   No   |  —   | LOW      | Admin action row                                   |
| coaches/management/EditCoachPricingDialog.tsx                   |   No   |  —   | LOW      | Admin dialog                                       |
| coaches/management/NewCoachDialog.tsx                           |   No   |  —   | LOW      | Admin dialog                                       |
| coaches/proposals/CoachProposalQueue.tsx                        |   No   |  —   | LOW      | Admin queue                                        |
| dashboard/ActivityFeed.tsx                                      |  YES   | YES  | DONE     |                                                    |
| dashboard/QuickActions.tsx                                      |  YES   | YES  | DONE     |                                                    |
| dashboard/SmartKPICards.tsx                                     |  YES   | YES  | DONE     |                                                    |
| dashboard/TodayTimeline.tsx                                     |  YES   | YES  | DONE     |                                                    |
| layout/AdminBreadCrumbs.tsx                                     |   No   |  —   | LOW      | Admin breadcrumbs                                  |
| layout/AdminCommandPalette.tsx                                  |   No   |  —   | LOW      | Admin command palette                              |
| layout/AdminHeader.tsx                                          |   No   |  —   | LOW      | Admin header bar                                   |
| layout/PageHeader.tsx                                           |   No   |  —   | MEDIUM   | Reused across admin pages                          |
| management/DefaultPricingSettings.tsx                           |   No   |  —   | LOW      | Admin settings form                                |
| management/PendingApprovals.tsx                                 |   No   |  —   | LOW      | Admin queue (top-level variant)                    |
| management/RinkDialog.tsx                                       |   No   |  —   | LOW      | Admin dialog                                       |
| management/UserManagement.tsx                                   |   No   |  —   | LOW      | Admin management surface                           |
| payments/PaymentDetail.tsx                                      |   No   |  —   | LOW      | Admin detail view                                  |
| payments/PaymentFilter.tsx                                      |   No   |  —   | LOW      | Admin filter bar                                   |
| payments/PaymentNoteForm.tsx                                    |   No   |  —   | LOW      | Admin form                                         |
| payments/PaymentTable.tsx                                       |   No   |  —   | LOW      | Admin table                                        |
| reports/AttendanceReport.tsx                                    |   No   |  —   | LOW      | Admin report                                       |
| reports/PayoutReport.tsx                                        |   No   |  —   | LOW      | Admin report                                       |
| reports/RevenueReport.tsx                                       |   No   |  —   | LOW      | Admin report                                       |
| scheduling/AdminAssignmentDialog.tsx                            |   No   |  —   | LOW      | Heavy MSW graph — defer                            |
| scheduling/BlockedDateDialog.tsx                                |   No   |  —   | LOW      | Heavy MSW graph — defer                            |
| scheduling/BlockedDatesManager.tsx                              |   No   |  —   | LOW      | Heavy MSW graph — defer                            |
| scheduling/BookingDialog.tsx                                    |   No   |  —   | LOW      | Heavy MSW graph — defer                            |
| scheduling/BulkActionsToolbar.tsx                               |   No   |  —   | LOW      | Scheduling toolbar                                 |
| scheduling/CalendarErrorBoundary.tsx                            |   No   |  —   | LOW      | Error boundary                                     |
| scheduling/CalendarEvent.tsx                                    |   No   |  —   | LOW      | FullCalendar event renderer                        |
| scheduling/CalendarHeader.tsx                                   |   No   |  —   | LOW      | Calendar chrome                                    |
| scheduling/CalendarToolbar.tsx                                  |   No   |  —   | LOW      | Calendar chrome                                    |
| scheduling/CompactTimeSlotDialog.tsx                            |   No   |  —   | LOW      | Heavy MSW graph — defer                            |
| scheduling/ConflictResolution.tsx                               |   No   |  —   | LOW      | Heavy MSW graph — defer                            |
| scheduling/DateRangeFilter.tsx                                  |   No   |  —   | LOW      | Filter primitive                                   |
| scheduling/DayDetailPopover.tsx                                 |   No   |  —   | LOW      | Popover                                            |
| scheduling/DialogComponents.tsx                                 |   No   |  —   | LOW      | Shared dialog parts                                |
| scheduling/EditLessonTypeDialog.tsx                             |   No   |  —   | LOW      | Heavy MSW graph — defer                            |
| scheduling/EnhancedBookingDialog.tsx                            |   No   |  —   | LOW      | Heavy MSW graph — defer                            |
| scheduling/EnhancedCalendarHeader.tsx                           |   No   |  —   | LOW      | Calendar chrome                                    |
| scheduling/ExistingBookings.tsx                                 |   No   |  —   | LOW      | Bookings list                                      |
| scheduling/NewScheduleManager.tsx                               |   No   |  —   | LOW      | Heavy MSW graph — defer                            |
| scheduling/RecurringPatternPreview.tsx                          |   No   |  —   | LOW      | Preview                                            |
| scheduling/ScheduleExceptions.tsx                               |   No   |  —   | LOW      | Exceptions list                                    |
| scheduling/ScheduleHeader.tsx                                   |   No   |  —   | LOW      | Calendar chrome                                    |
| scheduling/ScheduleValidation.tsx                               |   No   |  —   | LOW      | Validation results                                 |
| scheduling/StudentSelector.tsx                                  |   No   |  —   | LOW      | Selector form field                                |
| scheduling/TimeSlotDialog.tsx                                   |   No   |  —   | LOW      | Heavy MSW graph — defer                            |
| scheduling/TimeSlotDialogAdapter.tsx                            |   No   |  —   | LOW      | Adapter (see CLAUDE.md guardrails)                 |
| scheduling/TimeSlotList.tsx                                     |   No   |  —   | LOW      | List view                                          |
| scheduling/TravelDateBlocker.tsx                                |   No   |  —   | LOW      | Travel-date helper                                 |
| scheduling/TravelDateManager.tsx                                |   No   |  —   | LOW      | Travel-date manager                                |
| scheduling/UndoBulkCreationButton.tsx                           |   No   |  —   | LOW      | Action button                                      |
| scheduling/WorkingBlockedDatesManager.tsx                       |   No   |  —   | LOW      | Heavy MSW graph — defer                            |
| students/StudentDetailTabs.tsx                                  |   No   |  —   | LOW      | Tabs                                               |
| students/StudentPricingForm.tsx                                 |   No   |  —   | LOW      | Pricing form                                       |
| students/management/OptimizedStudentList.tsx                    |   No   |  —   | LOW      | Admin list                                         |
| students/management/PendingApprovals.tsx                        |   No   |  —   | LOW      | Admin queue                                        |
| students/management/StudentList.tsx                             |   No   |  —   | LOW      | Admin table                                        |
| students/management/StudentManager.tsx                          |   No   |  —   | LOW      | Admin management surface                           |
| students/profile/LessonNotes.tsx                                |   No   |  —   | LOW      | Notes panel                                        |
| students/profile/StudentForm.tsx                                |   No   |  —   | LOW      | Profile form                                       |
| students/profile/StudentNotes.tsx                               |   No   |  —   | LOW      | Notes panel                                        |
| students/profile/StudentProfile.tsx                             |   No   |  —   | LOW      | Profile container                                  |
| students/progress/AchievementsManager.tsx                       |   No   |  —   | LOW      | Achievements                                       |
| students/progress/LessonProgress.tsx                            |   No   |  —   | LOW      | Progress display                                   |
| students/progress/ProgressChart.tsx                             |   No   |  —   | LOW      | Chart                                              |
| students/progress/SkillsManager.tsx                             |   No   |  —   | LOW      | Skills manager                                     |
| students/progress/StudentAttendance.tsx                         |   No   |  —   | LOW      | Attendance display                                 |
| students/shared/NewStudentDialog.tsx                            |   No   |  —   | LOW      | Admin dialog                                       |
| students/shared/StudentCard.tsx                                 |   No   |  —   | LOW      | Card                                               |

### `src/features/auth/components/` (1 component)

| Component (relative)     | Story? | VRT? | Priority | Notes                                  |
| ------------------------ | :----: | :--: | :------- | :------------------------------------- |
| ChangePasswordForm.tsx   |   No   |  —   | LOW      | Single component, low marginal value   |

### `src/features/coach/components/` (14 components)

| Component (relative)                          | Story? | VRT? | Priority | Notes                                            |
| --------------------------------------------- | :----: | :--: | :------- | :----------------------------------------------- |
| dashboard/CoachOverviewCards.tsx              |  YES   | YES  | DONE     |                                                  |
| dashboard/CoachPastLessons.tsx                |  YES   | YES  | DONE     |                                                  |
| dashboard/CoachUpcomingLessons.tsx            |  YES   | YES  | DONE     |                                                  |
| earnings/EarningsOverview.tsx                 |   No   |  —   | HIGH     | Coach landing widget — **Plan 22-02 candidate**  |
| earnings/PaymentHistory.tsx                   |   No   |  —   | MEDIUM   | Earnings drill-down                              |
| layout/CoachCommandPalette.tsx                |   No   |  —   | LOW      | Coach command palette                            |
| layout/CoachHeader.tsx                        |   No   |  —   | LOW      | Coach header bar                                 |
| profile/CoachProfileForm.tsx                  |   No   |  —   | LOW      | Coach profile form                               |
| profile/GoogleCalendarConnect.tsx             |   No   |  —   | LOW      | Google Calendar OAuth UI                         |
| proposals/ProposalsList.tsx                   |   No   |  —   | LOW      | Coach proposals list                             |
| proposals/ProposeAvailabilityForm.tsx         |   No   |  —   | LOW      | Coach proposals form                             |
| schedule/CoachBlockedDates.tsx                |   No   |  —   | LOW      | Coach blocked-date manager                       |
| schedule/CoachScheduleManager.tsx             |   No   |  —   | LOW      | Heavy MSW graph — defer                          |
| students/CoachStudentList.tsx                 |   No   |  —   | LOW      | Coach students list                              |

### `src/features/notifications/components/` (1 component)

| Component (relative)        | Story? | VRT? | Priority | Notes                                                       |
| --------------------------- | :----: | :--: | :------- | :---------------------------------------------------------- |
| NotificationsPopover.tsx    |   No   |  —   | HIGH     | Renders in all 3 headers — **Plan 22-02 candidate**         |

### `src/features/scheduling/components/` (21 components)

| Component (relative)                            | Story? | VRT? | Priority | Notes                                                |
| ----------------------------------------------- | :----: | :--: | :------- | :--------------------------------------------------- |
| RinkSelector.tsx                                |   No   |  —   | LOW      | Selector form field                                  |
| calendar/CalendarGrid.tsx                       |   No   |  —   | LOW      | FullCalendar wrapper — defer                         |
| calendar/CalendarHeader.tsx                     |   No   |  —   | LOW      | Calendar chrome                                      |
| calendar/CalendarToolbar.tsx                    |   No   |  —   | LOW      | Calendar chrome                                      |
| calendar/FCEventContent.tsx                     |  YES   | YES  | DONE     | `FCEventContent.stories.tsx` — 1 VRT                 |
| calendar/MobileScheduleList.tsx                 |   No   |  —   | LOW      | Mobile schedule list                                 |
| calendar/ScheduleCalendar.tsx                   |   No   |  —   | LOW      | Calendar shell                                       |
| calendar/TimeSlotCell.tsx                       |   No   |  —   | LOW      | Cell renderer                                        |
| common/BookingValidator.tsx                     |   No   |  —   | LOW      | Validator                                            |
| common/BreakInput.tsx                           |   No   |  —   | LOW      | Form field                                           |
| common/BreakInputs.tsx                          |   No   |  —   | LOW      | Form field group                                     |
| common/ConflictDetector.tsx                     |   No   |  —   | LOW      | Conflict detector                                    |
| dialogs/BulkCreateDialog.tsx                    |   No   |  —   | LOW      | Heavy MSW graph — defer                              |
| dialogs/CreateTimeSlotDialog.tsx                |   No   |  —   | LOW      | Heavy MSW graph — defer                              |
| display/DayAccordion.tsx                        |   No   |  —   | LOW      | Display group                                        |
| display/MobileTimeSlotList.tsx                  |   No   |  —   | LOW      | Mobile list                                          |
| display/TimeSlotListItem.tsx                    |   No   |  —   | LOW      | List item                                            |
| forms/BookingForm.tsx                           |   No   |  —   | LOW      | Booking form                                         |
| forms/BulkTimeSlotForm.tsx                      |   No   |  —   | LOW      | Bulk-create form                                     |
| forms/RecurringPatternForm.tsx                  |   No   |  —   | LOW      | Recurrence form                                      |
| forms/TimeSlotForm.tsx                          |   No   |  —   | LOW      | Time-slot form                                       |

_Note: `src/features/scheduling/context/ScheduleContext.tsx` is a React context provider, not a UI component — excluded from the totals above._

### `src/features/student/components/` (14 components)

| Component (relative)                         | Story? | VRT? | Priority | Notes                                                  |
| -------------------------------------------- | :----: | :--: | :------- | :----------------------------------------------------- |
| booking/BookingCalendar.tsx                  |   No   |  —   | LOW      | Booking calendar — heavy MSW graph                     |
| booking/BookingDialog.tsx                    |   No   |  —   | LOW      | Booking dialog — heavy MSW graph                       |
| booking/CoachBrowse.tsx                      |   No   |  —   | LOW      | Coach browse grid                                      |
| booking/CoachProfileCard.tsx                 |   No   |  —   | MEDIUM   | Card used in booking flow                              |
| dashboard/LessonSummary.tsx                  |   No   |  —   | MEDIUM   | Lesson summary card                                    |
| dashboard/NextLessonHero.tsx                 |   No   |  —   | HIGH     | Front-page hero — **Plan 22-02 candidate**             |
| dashboard/OutstandingPayments.tsx            |   No   |  —   | HIGH     | Front-page payments card — **Plan 22-02 candidate**    |
| dashboard/StudentProgress.tsx                |  YES   | YES  | DONE     |                                                        |
| dashboard/UpcomingLessons.tsx                |  YES   | YES  | DONE     |                                                        |
| layout/StudentCommandPalette.tsx             |   No   |  —   | LOW      | Student command palette                                |
| layout/StudentHeader.tsx                     |   No   |  —   | LOW      | Student header bar                                     |
| profile/ProfileForm.tsx                      |   No   |  —   | LOW      | Profile form                                           |
| schedule/CancellationDialog.tsx              |   No   |  —   | LOW      | Cancellation dialog                                    |
| schedule/LessonCard.tsx                      |   No   |  —   | MEDIUM   | Lesson card used across student surfaces               |

### `src/features/wardrobe/components/` (33 components)

| Component (relative)                                | Story? |   VRT?    | Priority | Notes                                                       |
| --------------------------------------------------- | :----: | :-------: | :------- | :---------------------------------------------------------- |
| BestFitBadge.tsx                                    |   No   |     —     | HIGH     | 6 import sites — **Plan 22-02 candidate**                   |
| CatalogGrid.tsx                                     |  YES   |   YES*    | DONE     | `*` baseline PNG pending Plan 22-03                         |
| CategoryBadge.tsx                                   |   No   |     —     | MEDIUM   | Category pill used on cards                                 |
| DressCard.tsx                                       |  YES   |   YES*    | DONE     | `*` baseline PNG pending Plan 22-03                         |
| DressFormCore.tsx                                   |   No   |     —     | LOW      | Inner form (admin) — heavy MSW                              |
| DressStatusBadge.tsx                                |   No   |     —     | HIGH     | 9 import sites — **Plan 22-02 candidate**                   |
| MeasurementForm.tsx                                 |  YES   |   YES*    | DONE     | `*` baseline PNG pending Plan 22-03                         |
| WardrobeFilterBar.tsx                               |  YES   |   YES*    | DONE     | `*` baseline PNG pending Plan 22-03                         |
| admin/ApproveDressDialog.tsx                        |   No   |     —     | LOW      | Admin dialog                                                |
| admin/DressForm.tsx                                 |   No   |     —     | LOW      | Admin wrapper around DressFormCore                          |
| admin/DressImageGallery.tsx                         |   No   |     —     | LOW      | Image gallery                                               |
| admin/DressInventoryGrid.tsx                        |   No   |     —     | LOW      | Admin grid                                                  |
| admin/MarkReturnedDialog.tsx                        |   No   |     —     | LOW      | Admin dialog                                                |
| admin/PendingApprovalQueue.tsx                      |  YES   |   YES*    | DONE     | `*` baseline PNG pending Plan 22-03                         |
| admin/RecordPaymentDialog.tsx                       |   No   |     —     | LOW      | Admin dialog                                                |
| admin/RejectDressDialog.tsx                         |   No   |     —     | LOW      | Admin dialog                                                |
| admin/RentalsTable.tsx                              |   No   |     —     | LOW      | Admin table                                                 |
| admin/RequestQueueTable.tsx                         |   No   |     —     | LOW      | Admin queue                                                 |
| admin/RequestResponseDialog.tsx                     |   No   |     —     | LOW      | Admin dialog                                                |
| admin/StatusFilterChips.tsx                         |   No   |     —     | LOW      | Filter chip group                                           |
| admin/WardrobeSettingsForm.tsx                      |   No   |     —     | LOW      | Settings form (the original `randomBytes` trigger)          |
| consigner/ConsignerDressForm.tsx                    |   No   |     —     | LOW      | Consigner form                                              |
| consigner/ConsignerEarningsTable.tsx                |  YES   |   YES*    | DONE     | `*` baseline PNG pending Plan 22-03                         |
| consigner/MyConsignedDressesList.tsx                |   No   |     —     | MEDIUM   | Consigner landing list                                      |
| detail/DressDetailHero.tsx                          |  YES   |   YES*    | DONE     | `*` baseline PNG pending Plan 22-03                         |
| detail/DressDetailView.tsx                          |   No   |     —     | LOW      | Detail page shell                                           |
| detail/DressImageCarousel.tsx                       |   No   |     —     | HIGH     | Hero on every dress detail — **Plan 22-02 candidate**       |
| detail/FitCheckCard.tsx                             |  YES   |   YES*    | DONE     | `*` baseline PNG pending Plan 22-03                         |
| detail/PricingTierTable.tsx                         |   No   |     —     | MEDIUM   | Tier table on detail page                                   |
| detail/StructuredSizeSummary.tsx                    |   No   |     —     | LOW      | Size summary block                                          |
| request/MyRentalsView.tsx                           |   No   |     —     | LOW      | Renter landing view                                         |
| request/RentalStatusBadge.tsx                       |  YES   |   YES*    | DONE     | `*` baseline PNG pending Plan 22-03 (2 VRT IDs)             |
| request/RequestRentalDialog.tsx                     |  YES   |   YES*    | DONE     | `*` baseline PNG pending Plan 22-03                         |

## Pages (Reference Only)

Story coverage targets components, not pages. Pages are integration shells covered by Playwright E2E specs where present. Listed here for STORY-04 completeness — all 39 protected pages are marked `N/A` for Storybook backfill.

| Page                                                                                |  E2E?  | Story shell? |
| ----------------------------------------------------------------------------------- | :----: | :----------: |
| src/app/(protected)/admin/coaches/page.tsx                                          |   No   |     N/A      |
| src/app/(protected)/admin/dashboard/page.tsx                                        |   No   |     N/A      |
| src/app/(protected)/admin/guide/page.tsx                                            |   No   |     N/A      |
| src/app/(protected)/admin/payments/page.tsx                                         |   No   |     N/A      |
| src/app/(protected)/admin/reports/page.tsx                                          |   No   |     N/A      |
| src/app/(protected)/admin/schedule/page.tsx                                         |   No   |     N/A      |
| src/app/(protected)/admin/settings/page.tsx                                         |   No   |     N/A      |
| src/app/(protected)/admin/students/page.tsx                                         |   No   |     N/A      |
| src/app/(protected)/admin/wardrobe/[id]/edit/page.tsx                               |   No   |     N/A      |
| src/app/(protected)/admin/wardrobe/new/page.tsx                                     |   No   |     N/A      |
| src/app/(protected)/admin/wardrobe/page.tsx                                         |   No   |     N/A      |
| src/app/(protected)/admin/wardrobe/pending-approval/page.tsx                        |   No   |     N/A      |
| src/app/(protected)/admin/wardrobe/rentals/page.tsx                                 |   No   |     N/A      |
| src/app/(protected)/admin/wardrobe/requests/page.tsx                                |   No   |     N/A      |
| src/app/(protected)/admin/wardrobe/settings/page.tsx                                |   No   |     N/A      |
| src/app/(protected)/coach/dashboard/page.tsx                                        |   No   |     N/A      |
| src/app/(protected)/coach/earnings/page.tsx                                         |   No   |     N/A      |
| src/app/(protected)/coach/guide/page.tsx                                            |   No   |     N/A      |
| src/app/(protected)/coach/page.tsx                                                  |   No   |     N/A      |
| src/app/(protected)/coach/profile/page.tsx                                          |   No   |     N/A      |
| src/app/(protected)/coach/proposals/page.tsx                                        |   No   |     N/A      |
| src/app/(protected)/coach/schedule/page.tsx                                         |   No   |     N/A      |
| src/app/(protected)/coach/students/page.tsx                                         |   No   |     N/A      |
| src/app/(protected)/student/book/page.tsx                                           |   No   |     N/A      |
| src/app/(protected)/student/dashboard/page.tsx                                      |   No   |     N/A      |
| src/app/(protected)/student/guide/page.tsx                                          |   No   |     N/A      |
| src/app/(protected)/student/payments/page.tsx                                       |   No   |     N/A      |
| src/app/(protected)/student/policies/page.tsx                                       |   No   |     N/A      |
| src/app/(protected)/student/profile/page.tsx                                        |   No   |     N/A      |
| src/app/(protected)/student/schedule/[lessonId]/page.tsx                            |   No   |     N/A      |
| src/app/(protected)/student/schedule/page.tsx                                       |   No   |     N/A      |
| src/app/(protected)/student/settings/page.tsx                                       |   No   |     N/A      |
| src/app/(protected)/wardrobe/[id]/page.tsx                                          |   No   |     N/A      |
| src/app/(protected)/wardrobe/consigned/[id]/edit/page.tsx                           |   No   |     N/A      |
| src/app/(protected)/wardrobe/consigned/new/page.tsx                                 |   No   |     N/A      |
| src/app/(protected)/wardrobe/consigned/page.tsx                                     |   No   |     N/A      |
| src/app/(protected)/wardrobe/measurements/page.tsx                                  |   No   |     N/A      |
| src/app/(protected)/wardrobe/my-rentals/page.tsx                                    |   No   |     N/A      |
| src/app/(protected)/wardrobe/page.tsx                                               |   No   |     N/A      |

## Backfill Priority Definitions

- **HIGH**: ≥10 import sites OR ships in 3+ user flows OR ships in a paid v2.0 surface (wardrobe).
- **MEDIUM**: 3–9 import sites, single primary flow.
- **LOW**: 1–2 import sites, internal admin tooling, or one-off forms.
- **DONE**: Component already has a `.stories.tsx` file. (A `*` annotation in the VRT? column means the story exists but the baseline PNG is pending Plan 22-03.)
- **N/A**: Pages, layout primitives pinned by CLAUDE.md (`AppLayout`, `AppSidebar`), or legacy components no longer wired in.

## Phase 22 Backfill Targets (Plan 22-02)

12 components have been pre-selected per [22-RESEARCH §High-Leverage Backfill Candidates](../.planning/phases/22-project-storybook-audit/22-RESEARCH.md):

**Tier 1 — UI primitives (≥10 import sites each):**

1. `src/components/ui/dialog.tsx` (35 sites)
2. `src/components/ui/select.tsx` (35 sites)
3. `src/components/ui/table.tsx` (21 sites)
4. `src/components/ui/tabs.tsx` (16 sites)
5. `src/components/ui/form.tsx` (14 sites)

**Tier 2 — Wardrobe v2.0 widgets:**

6. `src/features/wardrobe/components/DressStatusBadge.tsx` (9 sites)
7. `src/features/wardrobe/components/BestFitBadge.tsx` (6 sites)
8. `src/features/wardrobe/components/detail/DressImageCarousel.tsx` (hero element)

**Tier 3 — Dashboard / notification widgets:**

9. `src/features/student/components/dashboard/NextLessonHero.tsx` (front-page hero)
10. `src/features/student/components/dashboard/OutstandingPayments.tsx` (front-page card)
11. `src/features/coach/components/earnings/EarningsOverview.tsx` (coach landing widget)
12. `src/features/notifications/components/NotificationsPopover.tsx` (renders in all 3 headers)

Expected post-backfill coverage: ~40 stories (~17%) — an honest v2.0 step forward, not 100%.

---

_Maintained by the Phase 22 process. PRs that add a `.stories.tsx` file should also flip the corresponding row in this file from `No` to `YES`. Reviewers verify this during PR review._
