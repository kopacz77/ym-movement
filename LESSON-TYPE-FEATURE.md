# Lesson Type Management Feature

## Overview

The YM Movement Scheduler now supports comprehensive lesson type management, allowing admins to specify whether lessons are **Private Lessons** or **Choreography Lessons**, each with their own pricing structure.

## Features

### 1. **Student Self-Booking with Lesson Type Selection**
Students can now choose between Private and Choreography lessons when booking through their portal.

**Location:** Student booking interface already supports this feature.

### 2. **Admin Manual Assignment with Lesson Type**
Admins can now specify the lesson type when manually assigning students to time slots.

**Components:**
- `AdminAssignmentDialog` - New dialog for assigning students with lesson type selection
- `assignStudentToTimeSlot` mutation - Updated to accept `lessonType` and `notes` parameters

### 3. **Edit Existing Lesson Types**
Admins can modify the lesson type of existing lessons, which automatically updates pricing and Google Calendar events.

**Components:**
- `EditLessonTypeDialog` - New dialog for editing lesson types
- `updateLessonType` mutation - New mutation for updating lesson types

## Pricing System

The system supports two-tier pricing:

### Default Pricing (from `DefaultPricing` table)
- **Private Lesson**: $75
- **Choreography**: $90
- **Group Lesson**: $45
- **Competition Prep**: $95

### Custom Student Pricing
Students can have custom pricing enabled with specific rates per lesson type:
- `customPricingEnabled`: Boolean flag
- `privateLessonPrice`: Custom private lesson rate
- `choreographyPrice`: Custom choreography rate
- `groupLessonPrice`: Custom group lesson rate
- `competitionPrepPrice`: Custom competition prep rate

**Priority:** Custom pricing overrides default pricing when enabled.

## API Endpoints

### 1. Assign Student with Lesson Type

```typescript
api.admin.schedule.assignStudentToTimeSlot.useMutation()
```

**Input:**
```typescript
{
  timeSlotId: string;
  studentId: string;
  lessonType?: LessonType; // Optional, defaults to PRIVATE
  notes?: string;          // Optional notes
}
```

**Features:**
- Automatically calculates price based on lesson type and student pricing
- Creates Google Calendar event with lesson type in title
- Sends notification to student with lesson details
- Updates payment record with correct amount

### 2. Update Lesson Type

```typescript
api.admin.schedule.updateLessonType.useMutation()
```

**Input:**
```typescript
{
  lessonId: string;
  lessonType: LessonType;  // PRIVATE, CHOREOGRAPHY, GROUP, or COMPETITION_PREP
  notes?: string;          // Optional notes about the change
}
```

**Features:**
- Recalculates price based on new lesson type
- Updates Google Calendar event
- Updates associated payment amount
- Notifies student of the change
- Logs security event for audit trail

## Component Usage

### AdminAssignmentDialog

Use this dialog when you want to manually assign a student to a time slot with lesson type selection.

```typescript
import { AdminAssignmentDialog } from "@/features/admin/components/scheduling/AdminAssignmentDialog";

function MyComponent() {
  const [open, setOpen] = useState(false);
  const timeSlot = {
    id: "slot-123",
    startTime: new Date(),
    endTime: new Date(),
    rink: { id: "rink-1", name: "Main Rink" },
  };

  return (
    <AdminAssignmentDialog
      timeSlot={timeSlot}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
```

**Features:**
- Student selector with search
- Lesson type selector with pricing display
- Shows custom pricing indicator
- Notes field for additional information
- Automatic cache invalidation on success

### EditLessonTypeDialog

Use this dialog to edit the lesson type of an existing lesson.

```typescript
import { EditLessonTypeDialog } from "@/features/admin/components/scheduling/EditLessonTypeDialog";

function MyLessonComponent() {
  const [open, setOpen] = useState(false);

  return (
    <EditLessonTypeDialog
      lessonId="lesson-123"
      currentType={LessonType.PRIVATE}
      currentPrice={75}
      currentNotes="Working on axel jumps"
      studentId="student-456"
      studentName="John Doe"
      open={open}
      onOpenChange={setOpen}
    />
  );
}
```

**Features:**
- Shows current lesson type and price
- Displays price change preview
- Notes field pre-filled with existing lesson notes
- Edit and update notes - displayed in time slot view
- Disabled submit if no changes made
- Toast notifications for success/error

## Integration Points

### Calendar Events
- Lesson type is included in Google Calendar event titles
- Format: `"[LESSON_TYPE] Lesson with [Student Name]"`
- Example: `"CHOREOGRAPHY Lesson with Jane Smith"`

### Notifications
Students receive notifications when:
1. **New lesson assigned**: Includes lesson type in message
2. **Lesson type changed**: Shows old type → new type transition

### Payment Records
- Payment amount is automatically calculated based on lesson type
- Updating lesson type updates the payment amount
- Payment record maintains history through audit logs

## Database Schema

### Lesson Type Enum
```prisma
enum LessonType {
  PRIVATE
  GROUP
  CHOREOGRAPHY
  COMPETITION_PREP
}
```

### Student Pricing Fields
```prisma
model Student {
  customPricingEnabled Boolean  @default(false)
  privateLessonPrice   Float?
  groupLessonPrice     Float?
  choreographyPrice    Float?
  competitionPrepPrice Float?
}
```

### Lesson Model
```prisma
model Lesson {
  type  LessonType @default(PRIVATE)
  price Float
  notes String?
  // ... other fields
}
```

## Security & Audit

### Security Logging
All lesson type changes are logged for audit purposes:

```typescript
logSecurityEvent("LESSON_TYPE_UPDATED", {
  userId: adminId,
  lessonId,
  oldType: "PRIVATE",
  newType: "CHOREOGRAPHY",
  oldPrice: 75,
  newPrice: 90,
});
```

### Input Sanitization
All notes and text inputs are sanitized using the `sanitizeInput()` function to prevent XSS attacks.

## User Workflows

### Admin Workflow: Assign Student with Lesson Type

1. Admin navigates to schedule calendar
2. Clicks on available time slot
3. Selects "Assign Student" option
4. `AdminAssignmentDialog` opens
5. Admin selects:
   - Student from dropdown
   - Lesson type (Private/Choreography/etc.)
   - Optional notes
6. System calculates price based on student's pricing
7. Admin clicks "Assign Student"
8. System:
   - Creates lesson with specified type and price
   - Creates Google Calendar event
   - Sends notification to student
   - Creates payment record
   - Invalidates relevant caches

### Admin Workflow: Change Lesson Type

1. Admin views lesson details (in calendar or list)
2. Clicks "Edit Lesson Type" button (pencil icon)
3. `EditLessonTypeDialog` opens with current notes pre-filled
4. Admin selects new lesson type
5. System shows price change preview
6. Admin edits notes (previous notes are visible and editable)
7. Admin clicks "Update Lesson Type"
8. System:
   - Updates lesson type and price
   - Updates lesson notes
   - Updates Google Calendar event
   - Updates payment amount
   - Sends notification to student
   - Logs audit event
9. Notes are displayed in the time slot view below the lesson type badge

### Student Workflow: Book with Lesson Type

1. Student navigates to booking calendar
2. Selects available time slot
3. `BookingDialog` opens with lesson type selector
4. Student chooses:
   - Private Lesson or Choreography
   - Payment method
   - Optional notes
5. System shows pricing for selected type
6. Student clicks "Book Lesson"
7. System creates lesson with student's selection

## Testing Recommendations

### Unit Tests
- Test price calculation logic for all lesson types
- Test custom pricing override behavior
- Test default pricing fallback
- Test input sanitization

### Integration Tests
- Test admin assignment flow with lesson types
- Test lesson type update flow
- Test student booking with lesson types
- Test Google Calendar integration
- Test notification creation

### E2E Tests
```typescript
test('Admin can assign student with choreography lesson', async ({ page }) => {
  // Navigate to schedule
  // Click time slot
  // Select student
  // Select "Choreography" lesson type
  // Verify price shows $90
  // Submit assignment
  // Verify lesson appears in calendar
  // Verify notification sent to student
});

test('Admin can change lesson type from private to choreography', async ({ page }) => {
  // Navigate to lesson details
  // Click "Edit Lesson Type"
  // Select "Choreography"
  // Verify price preview shows change
  // Submit update
  // Verify lesson updated
  // Verify student received notification
});
```

## Migration Notes

### Existing Lessons
All existing lessons have `type: PRIVATE` by default. No migration is needed as the schema already supports the lesson type field.

### Backward Compatibility
- Student booking still works without selecting lesson type (defaults to PRIVATE)
- Admin assignment without lesson type parameter defaults to PRIVATE
- All existing code continues to work unchanged

## Future Enhancements

Potential improvements for future versions:

1. **Bulk Lesson Type Updates**
   - Update multiple lessons at once
   - Batch price recalculation

2. **Lesson Type Analytics**
   - Revenue breakdown by lesson type
   - Popular lesson type trends
   - Student preference tracking

3. **Lesson Type Restrictions**
   - Limit certain time slots to specific lesson types
   - Student-level lesson type eligibility

4. **Custom Lesson Types**
   - Allow admins to create custom lesson types
   - Flexible pricing per custom type

5. **Lesson Type Templates**
   - Save common lesson configurations
   - Quick assignment with templates

## Support

For questions or issues with lesson type functionality:

1. Check this documentation
2. Review API documentation in `API.md`
3. Check component source code with inline comments
4. Contact development team

---

**Last Updated:** 2025-12-27
**Version:** 3.2.2
**Feature:** Lesson Type Management with Notes Persistence
