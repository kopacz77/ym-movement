# Scheduling Components

This directory contains all components related to scheduling functionality in the Yura Scheduler application. The components are organized into subdirectories based on their purpose and functionality.

## Directory Structure

```
src/features/scheduling/components/
├── common/       - Shared utility components
├── forms/        - Form components for data entry
├── dialogs/      - Dialog/modal components
├── calendar/     - Calendar-specific components
└── display/      - Display-only components
```

## Component Categories

### Common Components

Located in `common/`

These are shared utility components used across multiple scheduling features:

- **BreakInput.tsx** - Input component for defining break periods
- **BreakInputs.tsx** - Container for multiple break inputs
- **ConflictDetector.tsx** - Identifies and displays scheduling conflicts
- **BookingValidator.tsx** - Validates booking constraints and rules

### Form Components

Located in `forms/`

These components handle data input and form submission:

- **TimeSlotForm.tsx** - Form for creating/editing individual time slots
- **RecurringPatternForm.tsx** - Form for creating recurring schedule patterns
- **BulkTimeSlotForm.tsx** - Form for bulk creation of time slots
- **BookingForm.tsx** - Form for booking a lesson in a time slot

### Dialog Components

Located in `dialogs/`

These are modal dialog components that typically wrap form components:

- **CreateTimeSlotDialog.tsx** - Dialog for creating a new time slot
- **BulkCreateDialog.tsx** - Dialog for bulk time slot creation
- **ManageTimeSlotDialog.tsx** - Dialog for managing existing time slots

### Calendar Components

Located in `calendar/`

These components handle the calendar interface and interactions:

- **CalendarGrid.tsx** - Main calendar grid component
- **CalendarHeader.tsx** - Calendar header with navigation and controls
- **TimeSlotCell.tsx** - Individual cell representing a time slot in the calendar

### Display Components

Located in `display/`

These components are primarily for displaying data without handling input:

- **TimeSlotListItem.tsx** - Item display in a list of time slots
- **DesktopCalendarView.tsx** - Calendar view optimized for desktop screens
- **MobileTimeSlotList.tsx** - List view optimized for mobile screens
- **DayAccordion.tsx** - Expandable accordion for viewing days

## Usage Patterns

### Component Hierarchy

- **Dialogs** contain **Forms** and may use **Common** components
- **Display** components present data received from parent components
- **Calendar** components work together to create the complete calendar UI

### Data Flow Pattern

1. User interacts with a **Display** or **Calendar** component
2. Interaction triggers a **Dialog** containing a **Form**
3. **Form** uses **Common** components for validation
4. On submission, the form calls API functions via hooks

### Hook Pattern

Most components should use hook-based APIs rather than direct API calls:

```jsx
// Preferred approach using hooks
const { createTimeSlot } = useTimeSlots();
createTimeSlot.mutateAsync(data);

// Avoid direct API calls
// api.admin.schedule.createTimeSlot.mutate(data);
```

## Adding New Components

When adding new components:

1. Place them in the appropriate subdirectory based on their purpose
2. Use the hook pattern for data fetching and mutations
3. Split logic between forms (data entry) and dialogs (presentation)
4. Reuse common components for validation and utility functions

## Testing Components

- Most components can be tested individually by mocking their props
- Dialog components should be tested with their contained form components
- Hook dependencies should be mocked in component tests