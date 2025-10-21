# Calendar Integration Guide - Lesson Type Management

## Overview

The admin calendar now fully supports lesson type management directly from the calendar interface. When the admin clicks on a time slot, she can:

1. **Assign students with lesson type selection** - Choose between Private, Choreography, Group, or Competition Prep
2. **View lesson types** - See lesson type badges for all assigned students
3. **Edit lesson types** - Change lesson type with automatic price updates

## User Workflow

### 1. Assigning a Student to a Time Slot

**Steps:**
1. Admin clicks on a time slot in the calendar
2. "Manage Time Slot" dialog opens showing slot details
3. Click "Assign Student with Lesson Type" button
4. New dialog opens with:
   - Time slot details (date, time, rink)
   - Student selector dropdown
   - Lesson type selector with pricing
   - Optional notes field
5. Select student and lesson type
6. Click "Assign Student"
7. System creates lesson with correct pricing

**Features:**
- Shows custom pricing if student has it enabled
- Calculates price automatically based on lesson type
- Creates Google Calendar event with lesson type
- Sends notification to student
- Creates payment record

### 2. Viewing Assigned Lessons

When admin clicks on a booked time slot, the dialog shows:

**For each assigned student:**
- Student name
- Lesson type badge (color-coded)
  - **Purple**: Choreography
  - **Blue**: Private
  - **Green**: Group
  - **Orange**: Competition Prep
- Price ($)
- Edit button (pencil icon)
- Remove button (X icon)

### 3. Editing Lesson Type

**Steps:**
1. Click on a time slot with assigned students
2. Click the Edit (pencil) icon next to any student
3. "Edit Lesson Type" dialog opens showing:
   - Current lesson type
   - Lesson type selector with pricing
   - Price change preview
   - Optional notes field
4. Select new lesson type
5. Click "Update Lesson Type"
6. System:
   - Updates lesson type and price
   - Updates Google Calendar event
   - Updates payment amount
   - Notifies student of change
   - Logs change for audit

## UI Components

### TimeSlotDialog (Enhanced)

**Location:** `src/features/admin/components/scheduling/TimeSlotDialog.tsx`

**New Features:**
- "Assign Student with Lesson Type" button
- Lesson type badges with color coding
- Price display for each lesson
- Edit button for each lesson
- Enhanced lesson list with better formatting

### AdminAssignmentDialog

**Location:** `src/features/admin/components/scheduling/AdminAssignmentDialog.tsx`

**Features:**
- Time slot details display
- Student selector with email
- Lesson type selector with live pricing
- Custom pricing indicator
- Notes field
- Smart price calculation

### EditLessonTypeDialog

**Location:** `src/features/admin/components/scheduling/EditLessonTypeDialog.tsx`

**Features:**
- Current lesson type display
- All lesson types available
- Price change preview
- Change justification notes
- Prevents submission without changes

## Pricing Logic

### Default Pricing
```
Private Lesson:     $75
Choreography:       $90
Group Lesson:       $45
Competition Prep:   $95
```

### Custom Student Pricing
If student has `customPricingEnabled: true`, their custom prices override defaults:
- `privateLessonPrice`: Custom private rate
- `choreographyPrice`: Custom choreography rate
- `groupLessonPrice`: Custom group rate
- `competitionPrepPrice`: Custom competition prep rate

### Automatic Price Updates
When lesson type changes:
1. System checks if student has custom pricing
2. Uses custom price if available, otherwise default
3. Updates lesson record
4. Updates payment record
5. Notifies student of change

## Visual Design

### Lesson Type Badge Colors

```typescript
CHOREOGRAPHY:      Purple badge (bg-purple-100, text-purple-700)
PRIVATE:           Blue badge (bg-blue-100, text-blue-700)
GROUP:             Green badge (bg-green-100, text-green-700)
COMPETITION_PREP:  Orange badge (bg-orange-100, text-orange-700)
```

### Enhanced Lesson Cards

Each assigned lesson displays in a rounded card with:
- Light background (`bg-muted/30`)
- Student name (bold)
- Lesson type badge with color
- Price in muted text
- Two icon buttons (Edit and Remove)
- Hover effects for buttons

## Calendar Event Display

Time slots in the calendar show:
- Time range
- Student count (X / Y students)
- Color coding by status:
  - **Green**: Confirmed lessons
  - **Yellow**: Tentative
  - **Red**: Cancelled (strikethrough)
  - **Blue**: Default/Available

## API Integration

### Queries Used
- `api.admin.schedule.getTimeSlots` - Fetches time slots with lesson data
- `api.admin.student.getStudents` - Fetches approved students
- `api.student.profile.getStudentPricing` - Gets custom pricing

### Mutations Used
- `api.admin.schedule.assignStudentToTimeSlot` - Assigns student with lesson type
- `api.admin.schedule.updateLessonType` - Updates lesson type
- `api.admin.schedule.unassignStudent` - Removes student from slot

## Database Updates

The `getTimeSlots` query now includes:
```typescript
Lesson: {
  select: {
    id: true,
    type: true,        // NEW: Lesson type
    price: true,       // NEW: Lesson price
    status: true,
    notes: true,
    Student: { ... }
  }
}
```

## Notifications

### Student Notifications

**When assigned:**
- Title: "New Lesson Scheduled"
- Message: "A new [LESSON_TYPE] lesson has been scheduled for [DATE] at [TIME]"
- Link: Direct link to student schedule

**When lesson type changed:**
- Title: "Lesson Type Updated"
- Message: "Your lesson on [DATE] has been updated to [NEW_TYPE]"
- Shows old price → new price
- Link: Direct link to lesson details

## Cache Management

All operations automatically invalidate relevant caches:
- `admin.schedule.getTimeSlots` - Time slot list
- `admin.schedule.getLessonsByDate` - Date-based queries
- `admin.student.getStudents` - Student list

This ensures the calendar updates immediately after any change.

## Error Handling

### Assignment Errors
- Time slot full
- Student already assigned
- Student not found
- Invalid lesson type

### Edit Errors
- Lesson not found
- Permission denied
- Price calculation failed

All errors show user-friendly toast messages with specific error descriptions.

## Testing Checklist

### Admin Assignment Flow
- [ ] Click time slot opens management dialog
- [ ] "Assign Student with Lesson Type" button works
- [ ] Student selector shows all approved students
- [ ] Lesson type selector shows all types with prices
- [ ] Custom pricing indicator appears when applicable
- [ ] Assignment creates lesson with correct type and price
- [ ] Calendar updates immediately after assignment
- [ ] Student receives notification

### Edit Lesson Type Flow
- [ ] Edit button appears for each assigned lesson
- [ ] Clicking edit opens lesson type dialog
- [ ] Current type is pre-selected
- [ ] Price change preview is accurate
- [ ] Update button is disabled when no change
- [ ] Update changes lesson type and price
- [ ] Payment record is updated
- [ ] Student receives notification
- [ ] Google Calendar event is updated

### Visual Tests
- [ ] Lesson type badges show correct colors
- [ ] Price displays correctly formatted ($XX.XX)
- [ ] Cards are properly aligned and sized
- [ ] Buttons have hover effects
- [ ] Icons are clearly visible
- [ ] Dialog is responsive on mobile

## Troubleshooting

### Lesson type not showing
- Check that `getTimeSlots` query includes `type` field
- Verify lessons have type set in database
- Check TypeScript interface includes `type: LessonType`

### Price not updating
- Verify `updateLessonType` mutation is called
- Check payment record update logic
- Verify default pricing exists in database
- Check student custom pricing fields

### Badges wrong color
- Check `getLessonTypeBadgeColor` function
- Verify LessonType enum values match
- Check Tailwind classes are available

### Dialog not opening
- Check state management in TimeSlotDialog
- Verify timeSlotForAssignment is defined
- Check AdminAssignmentDialog props
- Look for console errors

## Future Enhancements

Potential improvements:
1. **Bulk lesson type changes** - Update multiple lessons at once
2. **Lesson type filtering** - Filter calendar by lesson type
3. **Quick lesson type toggle** - Change type with single click
4. **Lesson type analytics** - Show breakdown in reports
5. **Lesson type restrictions** - Limit slots to specific types
6. **Drag-and-drop lesson type** - Change type by dragging

---

**Last Updated:** 2025-10-14
**Version:** 3.2.1
**Integration:** Calendar + Lesson Type Management
