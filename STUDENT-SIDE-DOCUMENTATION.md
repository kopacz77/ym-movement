# Student Side Documentation - YM Movement

## Recent Critical Fixes (2025-08-30)

### ✅ **React Error #130 Production Fix**
- **Issue Resolved**: Fixed critical React error #130 occurring only in production environment
- **Root Cause**: Undefined `lesson.type` property in `UpcomingLessons` component causing `.replace()` method calls on undefined
- **Solution**: Added null-safe access pattern with fallback: `{lesson.type ? lesson.type.replace("_", " ") : "Private"}`
- **Impact**: Student dashboard now loads successfully in production, matching development behavior
- **File**: `src/features/student/components/dashboard/UpcomingLessons.tsx:108`

### ✅ **Header Layout Standardization**
- **Achievement**: Student header now matches admin header alignment and spacing standards
- **Changes**: Updated `StudentHeader.tsx` container structure from `space-y-4` to proper flex column layout
- **Alignment Fix**: Added controlled margins (`mb-1 lg:mb-1`) and responsive typography matching admin standards
- **Layout Consistency**: Proper alignment with sidebar logo and navigation elements
- **Impact**: Visual consistency across admin and student portals with professional appearance

### ✅ **Enhanced Student Welcome Experience**
- **New Feature**: Added `WarmGreeting` component to student header with personalized welcome messages
- **Styling**: Larger, professional typography replacing plain text student name display
- **Personalization**: Role-specific greetings like "Welcome back, [Name]!" and "Good morning, [Name]!"
- **Consistency**: Matches admin portal's warm, professional greeting system
- **Implementation**: `<WarmGreeting name={session?.user?.name || "Student"} role="student" />`

### ✅ **Icon Component Safety Improvements** 
- **Bug Fix**: Added fallback handling for undefined Icon components in `LessonStatusBadge`
- **Components Updated**: Both `LessonStatusBadge` and `LessonStatusIndicator` with `|| Clock` fallbacks
- **Safety**: Prevents React errors when invalid status values are passed to status components
- **Fallbacks**: Added `|| "Unknown"` for status labels and `|| "text-gray-500"` for color classes

---

## Overview

The student side of YM Movement provides a comprehensive interface for figure skating students to manage their lessons, track progress, and communicate with instructors. The student portal is built with React 19, Next.js 15, and TypeScript, following modern web development patterns.

## Architecture & Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS + Radix UI components
- **State Management**: React hooks + tRPC for server state
- **Authentication**: NextAuth.js with JWT sessions

### Backend Integration
- **API Layer**: tRPC v11 with type-safe queries/mutations
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: Role-based access (STUDENT role required)
- **External Services**: Google Calendar integration, Email notifications

## Student Portal Features

### 1. Dashboard (`/student/dashboard`)
**Primary Interface**: Main landing page showing lesson overview and quick actions

**Components**:
- `UpcomingLessons` - Next 3 scheduled lessons with quick access
- `LessonSummary` - Statistics and weekly progress tracking
- Payment information with Venmo (@yura-min) and Zelle ((714) 743-7071) details

**Key Features**:
- Weekly lesson limit tracking with progress bar
- Lesson statistics (upcoming, completed, cancelled)
- Quick "Book a Lesson" action button
- Error boundaries for graceful error handling

**API Endpoints**:
- `student.profile.getStudentLessonStats` - Lesson statistics and weekly limits

### 2. Lesson Booking (`/student/book`)
**Purpose**: Interactive calendar interface for booking available lesson slots

**Components**:
- `BookingCalendar` - Full calendar view with available time slots
- `BookingDialog` - Lesson booking form with conflict detection
- Dynamic loading with calendar skeleton for better UX

**Key Features**:
- Real-time availability checking
- Automatic conflict detection
- Google Calendar integration
- Pricing display based on lesson type
- Mobile-responsive calendar interface

**API Endpoints**:
- `student.booking.getAvailableTimeSlots` - Available slots for booking
- `student.booking.bookLesson` - Create new lesson booking

### 3. Student Schedule (`/student/schedule`)
**Purpose**: View and manage all scheduled lessons

**Components**:
- `StudentScheduleClient` - Main schedule interface
- `LessonCard` - Individual lesson details with actions
- `CancellationDialog` - Lesson cancellation workflow

**Key Features**:
- Chronological lesson listing
- Lesson status indicators (scheduled, completed, cancelled, rescheduled)
- Cancellation with automatic notifications
- Rescheduling capabilities
- Payment status tracking

**API Endpoints**:
- `student.profile.getStudentLessons` - All student lessons with filters
- `student.booking.cancelLesson` - Cancel scheduled lessons

### 4. Student Profile (`/student/profile`)
**Purpose**: Personal information management

**Components**:
- `ProfileForm` - Personal details editing
- Emergency contact information
- Phone number management

**Key Features**:
- Personal information updates
- Emergency contact management
- Profile validation and error handling

**API Endpoints**:
- `student.profile.getStudentProfile` - Student profile data
- `student.profile.updateStudentProfile` - Update personal information

### 5. Payment Tracking (`/student/payments`)
**Purpose**: Payment history and outstanding balance management

**Key Features**:
- Payment history with status tracking
- Outstanding balance display
- Payment method instructions
- Integration with Venmo/Zelle workflows

## Security Implementation

### Authentication & Authorization
- **Protected Routes**: All student routes require authentication
- **Role Verification**: STUDENT role enforcement at API level
- **Session Management**: JWT-based sessions with 7-day expiration
- **CSRF Protection**: Built-in Next.js CSRF protection

### API Security
- **tRPC Procedures**: All student endpoints use `protectedProcedure`
- **Input Validation**: Zod schema validation on all inputs
- **Error Handling**: Sanitized error messages to prevent information leakage
- **Rate Limiting**: Built-in request throttling

### Data Protection
- **Student Isolation**: API queries automatically filter by authenticated student ID
- **Sensitive Data**: Emergency contacts and personal info encrypted at rest
- **Audit Logging**: All booking/cancellation actions logged

## User Experience Features

### Responsive Design
- **Mobile-First**: Optimized for mobile devices and tablets
- **Progressive Disclosure**: Complex forms broken into manageable steps
- **Touch-Friendly**: 44px minimum touch targets, optimized interactions
- **Offline Support**: Service worker for basic offline functionality

### Error Handling
- **Error Boundaries**: React error boundaries prevent white screens
- **Toast Notifications**: Sonner-based notification system
- **Graceful Degradation**: Fallbacks for API failures
- **Debug Mode**: Enhanced error reporting in development

### Performance Optimizations
- **Dynamic Imports**: Code splitting for faster initial loads
- **Skeleton Loading**: Loading states for better perceived performance
- **Image Optimization**: Next.js Image component with WebP/AVIF support
- **Caching**: Smart caching strategies for API responses

## Database Schema (Student-Related)

### Student Table
```sql
model Student {
  id                    String   @id @default(cuid())
  userId                String   @unique
  phone                 String?
  emergencyContact      Json?    // { name, phone, relationship }
  customPricingEnabled  Boolean  @default(false)
  privateLessonPrice    Decimal? @db.Decimal(6,2)
  choreographyPrice     Decimal? @db.Decimal(6,2)
  maxLessonsPerWeek     Int      @default(3)
  notes                 String?
  createdAt            DateTime @default(now())
  
  // Relations
  User     User     @relation(fields: [userId], references: [id])
  Lesson   Lesson[] @relation("StudentLessons")
  Payment  Payment[]
}
```

### Lesson Table (Student Perspective)
```sql
model Lesson {
  id          String       @id @default(cuid())
  studentId   String
  rinkId      String
  startTime   DateTime
  endTime     DateTime
  lessonType  LessonType   @default(PRIVATE)
  status      LessonStatus @default(SCHEDULED)
  price       Decimal      @db.Decimal(6,2)
  notes       String?
  
  // Relations
  Student Student @relation("StudentLessons", fields: [studentId], references: [id])
  Rink    Rink    @relation(fields: [rinkId], references: [id])
  Payment Payment?
}
```

## Component Architecture

### Shared UI Components
- `LessonStatusBadge` - Status indicators with icons
- `LessonStatusIndicator` - Compact status displays
- Error boundaries and loading states
- Form validation components

### Student-Specific Components
- Dashboard widgets (`LessonSummary`, `UpcomingLessons`)
- Booking components (`BookingCalendar`, `BookingDialog`)
- Profile management (`ProfileForm`)
- Schedule management (`LessonCard`, `CancellationDialog`)

### Layout Components
- `StudentHeader` - Navigation and user menu
- `StudentSidebar` - Main navigation menu
- `StudentCommandPalette` - Quick action shortcuts

## API Structure

### Student Profile Queries
```typescript
// Get student profile with user data
student.profile.getStudentProfile({ studentId })

// Get lesson statistics and weekly limits
student.profile.getStudentLessonStats({ studentId })

// Get filtered lessons with status/date filters
student.profile.getStudentLessons({ 
  studentId, 
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED",
  startDate?: Date,
  endDate?: Date 
})

// Update student profile information
student.profile.updateStudentProfile({
  studentId,
  phone?: string,
  emergencyContact?: { name, phone, relationship }
})
```

### Booking Queries
```typescript
// Get available time slots for booking
student.booking.getAvailableTimeSlots({
  startDate: Date,
  endDate: Date
})

// Book a lesson
student.booking.bookLesson({
  timeSlotId: string,
  lessonType: "PRIVATE" | "CHOREOGRAPHY"
})

// Cancel a scheduled lesson
student.booking.cancelLesson({
  lessonId: string,
  reason?: string
})
```

## Error Handling & Recovery

### Common Error Scenarios
1. **Authentication Failures**: Redirect to login with proper error messages
2. **Booking Conflicts**: Real-time validation with alternative suggestions
3. **Network Issues**: Retry mechanisms and offline state management
4. **Validation Errors**: Clear field-level error messages

### Error Boundary Implementation
- Page-level error boundaries prevent complete crashes
- Component-level boundaries isolate widget failures
- Fallback UI provides user-friendly error states
- Debug information available in development mode

## Mobile Optimization

### Responsive Breakpoints
- **Mobile**: < 768px - Single column layout, touch-optimized
- **Tablet**: 768px - 1024px - Adaptive layout with collapsed sidebar
- **Desktop**: > 1024px - Full sidebar and multi-column layout

### Touch Interactions
- Minimum 44px touch targets
- Optimized form inputs for mobile keyboards
- Swipe gestures for calendar navigation
- Pull-to-refresh functionality

## Testing Coverage

### End-to-End Tests
- Complete student signup and booking workflow
- Authentication and authorization flows
- Payment workflow integration
- Cross-device compatibility testing

### Unit Tests
- Form validation logic
- API query/mutation error handling
- Component rendering with various states
- Utility function testing

### Integration Tests
- Student dashboard data loading
- Booking calendar functionality
- Profile update workflows
- Error boundary behavior

## Performance Metrics

### Core Web Vitals
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### Optimization Strategies
- Code splitting by route and feature
- Image optimization with Next.js Image component
- Database query optimization with proper indexing
- Caching strategies for frequently accessed data

## Deployment & Environment

### Production Environment
- **Hosting**: Netlify with Edge functions
- **Database**: PostgreSQL (Neon)
- **CDN**: Automatic asset optimization
- **Monitoring**: Error tracking and performance monitoring

### Environment Variables
```bash
# Authentication
NEXTAUTH_SECRET=generated_secret
NEXTAUTH_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://connection_string

# External Services
GOOGLE_CLIENT_EMAIL=service@account.com
GOOGLE_PRIVATE_KEY=private_key
RESEND_API_KEY=email_api_key
```

## Maintenance & Updates

### Regular Tasks
- Monitor error rates and performance metrics
- Update dependencies and security patches
- Review and optimize database queries
- Test cross-browser compatibility

### Feature Development
- Follow feature-based folder structure
- Maintain API-first development approach
- Implement comprehensive testing for new features
- Document breaking changes and migration paths

## Support & Troubleshooting

### Common Issues
1. **Login Problems**: Check NEXTAUTH_URL configuration
2. **Booking Failures**: Verify time slot availability and conflicts
3. **Mobile Issues**: Test touch target sizes and responsive layouts
4. **Performance**: Monitor bundle sizes and database query efficiency

### Debug Tools
- React DevTools for component inspection
- Network tab for API request monitoring
- Error boundaries with detailed error reporting
- Console logging in development mode

---

## Quick Reference

### File Structure
```
src/
├── app/(protected)/student/          # Student route pages
├── features/student/                 # Student-specific features
│   ├── api/queries/                  # tRPC queries/mutations
│   ├── components/                   # Student UI components
│   └── types/                        # TypeScript definitions
├── components/ui/                    # Shared UI components
└── lib/                             # Utility functions and configs
```

### Key Dependencies
- Next.js 15, React 19, TypeScript
- Tailwind CSS, Radix UI, Lucide Icons
- tRPC v11, Prisma ORM, NextAuth.js
- Sonner (notifications), React Hook Form + Zod

### Student Role Requirements
- User must have `role: "STUDENT"` in database
- All API endpoints require authentication
- Student ID automatically injected into queries
- Cross-student data access prevented at API level

This documentation provides a comprehensive overview of the student side implementation, including technical details, user flows, and maintenance considerations.