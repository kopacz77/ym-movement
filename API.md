# API Documentation - Yura Scheduler v3

## Overview

The Yura Scheduler v3 API is built with TRPC v11, providing end-to-end type safety and excellent developer experience. All endpoints are automatically validated and include comprehensive security measures.

## Authentication

All API endpoints require authentication except for public auth routes. The API uses NextAuth.js with role-based access control.

### Roles
- **ADMIN**: Full access to all endpoints
- **STUDENT**: Limited access to student-specific endpoints

### Headers
```typescript
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

## Base URL
- **Development**: `http://localhost:3000/api/trpc`
- **Production**: `https://your-domain.com/api/trpc`

## Admin Endpoints

### Authentication (`admin.auth`)

#### Change Password
```typescript
admin.auth.changePassword.useMutation()
```
**Input:**
```typescript
{
  currentPassword: string;
  newPassword: string;
}
```
**Security:** Input sanitization, password strength validation, bcrypt hashing

---

### Students (`admin.students`)

#### Get All Students
```typescript
admin.students.getAll.useQuery()
```
**Returns:** Array of students with profile data, pricing, and status

#### Create Student
```typescript
admin.students.create.useMutation()
```
**Input:**
```typescript
{
  email: string;
  name: string;
  phone?: string;
  notes?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}
```
**Security:** Input sanitization, duplicate email prevention

#### Update Student
```typescript
admin.students.update.useMutation()
```
**Input:** Student ID + partial student data
**Security:** Authorization check, input sanitization

#### Delete Student
```typescript
admin.students.delete.useMutation()
```
**Input:** `{ id: string }`
**Security:** Cascade deletion of related records

#### Approve Student
```typescript
admin.students.approve.useMutation()
```
**Input:** `{ studentId: string }`
**Security:** Admin role verification

---

### Scheduling (`admin.schedule`)

#### Get Time Slots
```typescript
admin.schedule.timeSlots.getByDateRange.useQuery()
```
**Input:**
```typescript
{
  startDate: Date;
  endDate: Date;
  rinkId?: string;
}
```
**Returns:** Time slots with booking information

#### Create Time Slot
```typescript
admin.schedule.timeSlots.create.useMutation()
```
**Input:**
```typescript
{
  startTime: Date;
  endTime: Date;
  rinkId: string;
  isRecurring?: boolean;
  recurringPattern?: {
    frequency: 'WEEKLY' | 'DAILY';
    interval: number;
    endDate?: Date;
  };
}
```
**Security:** Conflict detection, time validation

#### Bulk Create Time Slots
```typescript
admin.schedule.timeSlots.createBulk.useMutation()
```
**Input:** Array of time slot data with template support
**Security:** Batch validation, conflict resolution

#### Delete Time Slots
```typescript
admin.schedule.timeSlots.deleteBulk.useMutation()
```
**Input:** `{ timeSlotIds: string[] }`
**Security:** Prevents deletion of slots with bookings

#### Get Blocked Dates
```typescript
admin.schedule.getBlockedDates.useQuery()
```
**Returns:** Array of blocked date ranges with type and metadata

#### Create Blocked Date
```typescript
admin.schedule.createBlockedDate.useMutation()
```
**Input:**
```typescript
{
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: 'TRAVEL' | 'COMPETITION' | 'OTHER';
}
```
**Security:** Date validation, conflict detection with existing slots

#### Update Blocked Date
```typescript
admin.schedule.updateBlockedDate.useMutation()
```
**Input:** Blocked date ID and updated fields
**Security:** Ownership verification, date validation

#### Delete Blocked Date
```typescript
admin.schedule.deleteBlockedDate.useMutation()
```
**Input:** `{ id: string }`
**Security:** Ownership verification, cascade handling

---

### Payments (`admin.payments`)

#### Get All Payments
```typescript
admin.payments.getAll.useQuery()
```
**Returns:** Payment records with student information

#### Update Payment Status
```typescript
admin.payments.updateStatus.useMutation()
```
**Input:**
```typescript
{
  paymentId: string;
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  adminNotes?: string;
}
```
**Security:** Admin authorization, audit logging

---

### Analytics (`admin.analytics`)

#### Get Dashboard Stats
```typescript
admin.analytics.getDashboardStats.useQuery()
```
**Returns:** Revenue, student counts, lesson statistics

#### Get Revenue Data
```typescript
admin.analytics.getRevenueData.useQuery()
```
**Input:** Date range parameters
**Returns:** Revenue breakdown by time period

## Student Endpoints

### Profile (`student.profile`)

#### Get Profile
```typescript
student.profile.get.useQuery()
```
**Returns:** Student profile with pricing and progress

#### Update Profile
```typescript
student.profile.update.useMutation()
```
**Input:** Partial profile data
**Security:** User can only update own profile

---

### Booking (`student.booking`)

#### Get Available Slots
```typescript
student.booking.getAvailableSlots.useQuery()
```
**Input:**
```typescript
{
  startDate: Date;
  endDate: Date;
  rinkId?: string;
}
```
**Returns:** Available time slots for booking

#### Book Lesson
```typescript
student.booking.bookLesson.useMutation()
```
**Input:**
```typescript
{
  timeSlotId: string;
  lessonType: string;
  notes?: string;
}
```
**Security:** Conflict detection, student authorization

#### Cancel Lesson
```typescript
student.booking.cancelLesson.useMutation()
```
**Input:** `{ lessonId: string }`
**Security:** Cancellation policy enforcement

---

### Schedule (`student.schedule`)

#### Get My Lessons
```typescript
student.schedule.getMyLessons.useQuery()
```
**Input:** Date range (optional)
**Returns:** Student's booked lessons with details

## Error Handling

All endpoints include standardized error handling:

```typescript
{
  code: 'UNAUTHORIZED' | 'BAD_REQUEST' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR';
  message: string;
  details?: Record<string, any>;
}
```

### Common Error Codes
- `UNAUTHORIZED`: Invalid authentication or insufficient permissions
- `BAD_REQUEST`: Invalid input data or validation failure
- `NOT_FOUND`: Requested resource does not exist
- `CONFLICT`: Operation conflicts with existing data
- `RATE_LIMITED`: Too many requests from client

## Security Features

### Input Sanitization
All endpoints automatically sanitize user input to prevent XSS attacks:
```typescript
// Automatically applied to all string inputs
sanitizeInput(userInput) // Escapes HTML, removes scripts
```

### Rate Limiting
- **Authentication endpoints**: 5 attempts per 15 minutes
- **General API**: 100 requests per minute per user
- **Bulk operations**: Special limits based on operation type

### Audit Logging
Critical operations are logged for security monitoring:
```typescript
logSecurityEvent('STUDENT_CREATED', {
  userId: session.user.id,
  studentEmail: email,
  timestamp: new Date()
});
```

### Validation Schema Examples

#### Student Creation
```typescript
const createStudentSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100),
  phone: z.string().optional(),
  notes: z.string().max(1000).optional(),
  emergencyContact: z.object({
    name: z.string().min(1).max(100),
    phone: z.string().min(1).max(20),
    relationship: z.string().min(1).max(50)
  }).optional()
});
```

#### Time Slot Creation
```typescript
const createTimeSlotSchema = z.object({
  startTime: z.date(),
  endTime: z.date(),
  rinkId: z.string().uuid(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.object({
    frequency: z.enum(['WEEKLY', 'DAILY']),
    interval: z.number().min(1).max(30),
    endDate: z.date().optional()
  }).optional()
}).refine(data => data.endTime > data.startTime, {
  message: "End time must be after start time"
});
```

## Real-time Features

### WebSocket Events
The API supports real-time updates for:
- New bookings and cancellations
- Payment status changes
- Schedule updates
- System notifications

### Subscription Example
```typescript
// Subscribe to booking updates
const { data } = api.admin.schedule.subscribeToBookings.useSubscription();
```

## Testing

### API Testing
All endpoints include comprehensive tests:
```bash
# Run API tests
pnpm test __tests__/api/

# Run security tests
pnpm test __tests__/security/

# Run specific endpoint tests
pnpm test __tests__/api/admin/students.test.ts
```

### Example Test
```typescript
it('should create student with sanitized input', async () => {
  const maliciousInput = {
    name: '<script>alert("xss")</script>',
    email: 'test@example.com'
  };
  
  const result = await trpc.admin.students.create.mutate(maliciousInput);
  expect(result.name).not.toContain('<script>');
});
```

---

## Reports & Analytics (`admin.analytics`)

### Get Overview Data
```typescript
admin.analytics.getOverview.useQuery()
```
**Returns:** Dashboard overview statistics
```typescript
{
  totalStudents: number;
  activeLessons: number;
  pendingPayments: number;
  monthlyRevenue: number;
}
```

### Get Revenue Report
```typescript
admin.analytics.getRevenueReport.useQuery({ period })
```
**Input:**
```typescript
{
  period: "week" | "month" | "year"
}
```
**Returns:** Revenue data grouped by date
```typescript
Array<{
  date: string;
  totalRevenue: number;
  byMethod: Record<string, number>;
  byLessonType: Record<string, number>;
  byStudentLevel: Record<string, number>;
}>
```

### Get Student Activity Report  
```typescript
admin.analytics.getStudentActivity.useQuery({ period })
```
**Input:**
```typescript
{
  period: "week" | "month" | "year"
}
```
**Returns:** Attendance and lesson activity data
```typescript
Array<{
  date: string;
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  byType: Record<string, number>;
  byArea: Record<string, number>;
}>
```

### Get Individual Student Attendance
```typescript
admin.analytics.getStudentAttendance.useQuery({ 
  studentId, 
  startDate?, 
  endDate? 
})
```
**Input:**
```typescript
{
  studentId: string;
  startDate?: Date;
  endDate?: Date;
}
```
**Returns:** Detailed attendance metrics for a specific student

---

## Payment Management (`admin.payment`)

### Get Payments with Filtering
```typescript
admin.payment.getPayments.useQuery({ 
  search?, 
  status?, 
  startDate?, 
  endDate?, 
  page?, 
  limit? 
})
```
**Input:**
```typescript
{
  search?: string;        // Search by student name or reference code
  status?: PaymentStatus; // PENDING | COMPLETED | FAILED
  startDate?: Date;
  endDate?: Date;
  page?: number;         // For pagination (min: 1)
  limit?: number;        // Max 100 per page
}
```
**Returns:** Paginated payments with student and lesson details

### Get Payment by ID
```typescript
admin.payment.getPaymentById.useQuery({ paymentId })
```
**Returns:** Complete payment details including student and lesson information

### Verify Payment
```typescript
admin.payment.verifyPayment.useMutation()
```
**Input:**
```typescript
{
  paymentId: string;
  verifiedBy: string;
}
```
**Action:** Changes payment status from PENDING to COMPLETED and records verification details

### Send Payment Reminder
```typescript
admin.payment.sendPaymentReminder.useMutation()
```
**Input:**
```typescript
{
  paymentId: string;
}
```
**Action:** Sends email reminder to student and updates `reminderSentAt` timestamp
**Email Features:**
- Professional HTML template with payment details
- Payment method instructions (Venmo/Zelle)
- Reference code highlighted for easy copying
- Direct link to student payment dashboard
- Contact information for support

### Add Payment Note
```typescript
admin.payment.addPaymentNote.useMutation()
```
**Input:**
```typescript
{
  paymentId: string;
  notes: string;
}
```
**Action:** Appends timestamped note to payment record

### Get Payment Statistics
```typescript
admin.payment.getPaymentStats.useQuery()
```
**Returns:** Aggregated payment metrics
```typescript
{
  totalPayments: number;
  pendingAmount: number;
  completedAmount: number;
}
```

---

## Notifications System (`notifications.notifications`)

### Get User Notifications
```typescript
notifications.notifications.getNotifications.useQuery()
```
**Returns:** Array of user notifications ordered by creation date
```typescript
Array<{
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  link?: string;
  createdAt: Date;
}>
```
**Auto-refresh:** Every 60 seconds when user is authenticated
**Error Handling:** Gracefully handles 401 errors without showing toast notifications

### Mark Notification as Read
```typescript
notifications.notifications.markAsRead.useMutation()
```
**Input:**
```typescript
{
  id: string;
}
```

### Mark All Notifications as Read
```typescript
notifications.notifications.markAllAsRead.useMutation()
```
**Action:** Marks all unread notifications for the current user as read

---

## Export Utilities

### Client-Side Export Functions
Located in `src/lib/export-utils.ts`, these functions provide comprehensive report export capabilities:

#### CSV Exports
```typescript
// Export revenue data to CSV
exportRevenueToCSV(data: RevenueDataItem[], options: ExportOptions)

// Export attendance data to CSV  
exportAttendanceToCSV(data: AttendanceDataItem[], options: ExportOptions)

// Export combined report with summary statistics
exportCombinedReportToCSV(
  revenueData: RevenueDataItem[], 
  attendanceData: AttendanceDataItem[], 
  overviewData: OverviewData, 
  options: ExportOptions
)
```

#### PDF Export
```typescript
// Export styled PDF report via browser print dialog
exportToPDF(
  revenueData: RevenueDataItem[], 
  attendanceData: AttendanceDataItem[], 
  overviewData: OverviewData, 
  options: ExportOptions
): Promise<void>
```

**Features:**
- Professional styling with YM Movement branding
- Summary statistics cards
- Formatted data tables
- Responsive design for print
- Error handling for popup blockers

---

## Email Integration

### Payment Reminder Emails
```typescript
sendPaymentReminderEmail(
  studentEmail: string,
  studentName: string,
  paymentDetails: {
    amount: number;
    referenceCode: string;
    dueDate: Date;
    lessonDate?: Date;
    lessonType?: string;
    paymentMethod: string;
  }
): Promise<EmailResult>
```

**Email Features:**
- Professional HTML template with YM Movement branding
- Payment amount and due date prominently displayed
- Payment method instructions (Venmo @yura-min or Zelle (714) 743-7071)
- Reference code highlighted for easy copying
- Lesson details when available
- Contact information and support links
- Direct link to student payment dashboard
- Automated reminder footer

**Error Handling:**
- Graceful fallback in development environment
- Comprehensive logging for debugging
- Non-blocking errors (payment operations continue even if email fails)

### Email Configuration
- **Service**: Resend API (with fallback to mock in development)
- **From Address**: `YM Movement <info@ym-movement.com>`
- **Environment Variables**: `RESEND_API_KEY`, `NEXT_PUBLIC_BASE_URL`

## Development

### Adding New Endpoints
1. Create router in `src/server/api/routers/`
2. Add validation schemas with Zod
3. Implement security measures (sanitization, authorization)
4. Add comprehensive tests
5. Update this documentation

### TRPC Client Usage
```typescript
import { api } from '@/lib/api';

// In React components
const { data, isLoading } = api.admin.students.getAll.useQuery();

// Mutations
const createStudent = api.admin.students.create.useMutation({
  onSuccess: () => {
    toast.success('Student created successfully');
  }
});
```

## Support

For API support and questions:
- **Documentation**: Check this file and inline code comments
- **Issues**: Report bugs via GitHub issues
- **Security**: Report vulnerabilities privately to security team