# Student Self-Service Lesson Cancellation

**Date**: 2026-03-03
**Status**: Approved
**Approach**: Wire up existing infrastructure (Approach A)

## Problem

Students cannot cancel lessons themselves. If they book the wrong time or need to switch, they must contact the admin directly. The admin wants students to have self-service cancellation with a clear policy: lessons are locked 24 hours before, and day-of cancellations are allowed but the student is responsible for the full lesson fee.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cancellation window | 24 hours | Already coded, good protection for admin |
| Day-of cancellation | Allow with stern warning + fee acknowledgment checkbox | Flexibility for students while making policy clear |
| Payment handling on cancel | Keep payment as-is (PENDING) | Admin handles manually via existing Venmo/Zelle workflow |
| Admin notification | In-app notification only | Uses existing notification system, simple |
| Rebooking after cancel | Not included | YAGNI - can add later if needed |
| Configurable window | Not included | Hardcoded 24h, YAGNI |

## User Experience

### Lesson Detail Page (`/student/schedule/[lessonId]`)

- "Cancel Lesson" button shown on SCHEDULED lessons only
- Not shown on CANCELLED or COMPLETED lessons

### Standard Cancellation (> 24 hours before lesson)

1. Student clicks "Cancel Lesson"
2. Dialog opens with cancellation policy text
3. Student enters reason (required)
4. Student confirms cancellation
5. Lesson cancelled, Google Calendar event deleted, admin notified

### Late Cancellation (<= 24 hours before lesson)

1. Student clicks "Cancel Lesson"
2. **Warning dialog** opens with:
   - Red warning icon
   - Bold: "Late Cancellation - You Will Be Charged"
   - Policy: "Cancellations within 24 hours are subject to the full lesson fee of $XX.XX"
   - Required reason field
   - Required checkbox: "I understand I am responsible for the lesson fee"
3. "Confirm Cancellation" disabled until checkbox checked
4. On confirm: lesson cancelled, calendar cleaned up, admin notified with "(Late cancellation)" flag

### Schedule List (`/student/schedule`)

- Cancel action available on lesson cards in the upcoming tab

## Backend Changes

### Modify: `student.booking.cancelLesson`

- Remove the 24-hour block (currently throws error)
- Allow cancellation at any time before lesson start
- Track whether it's a late cancellation (within 24 hours)
- Add admin in-app notification after cancellation

### Remove: `student.lessons.cancelLesson`

- Duplicate, weaker endpoint without policy enforcement or calendar cleanup
- Removing to avoid confusion

### Admin Notification

- Created for all ADMIN users on student cancellation
- Title: "Lesson Cancelled by Student"
- Message: "[Student Name] cancelled their [Type] lesson on [Date] at [Time]"
- Late cancellation flag appended when applicable
- Type: WARNING

## Components

| Component | Change |
|-----------|--------|
| `CancellationDialog.tsx` | Add late-cancel mode with fee warning + checkbox |
| `[lessonId]/page.tsx` | Add "Cancel Lesson" button, wire to dialog |
| `client.tsx` (schedule list) | Add cancel action to lesson cards |
| `bookingQueries.ts` | Allow late cancels, add admin notification |
| `lessonQueries.ts` (student) | Remove duplicate cancel endpoint |

## Not Doing (YAGNI)

- Rebooking flow after cancel
- Configurable cancellation window
- Cancellation history table
- Automatic fee tracking or new payment statuses
- Email notification to admin
- Cancellation limits per student
