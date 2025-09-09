# Yura Scheduler v3 - Complete Rebuild Guide

> **Enterprise-grade figure skating lesson management platform rebuild specification**

This document provides a comprehensive blueprint for rebuilding the Yura Scheduler v3 application from scratch, including all architectural decisions, features, and implementation details discovered through project analysis.

## Project Overview

**Application Type**: Enterprise-grade figure skating lesson management platform  
**Architecture**: Full-stack Next.js application with PostgreSQL database  
**Target Users**: Figure skating instructors (admins), students, and coaches  
**Core Purpose**: Comprehensive lesson scheduling, student management, and payment processing

---

## Technology Stack

### Frontend Framework
```json
{
  "framework": "Next.js 15.3.4",
  "react": "^19.0.0",
  "typescript": "^5.8.2",
  "routing": "App Router"
}
```

### UI & Styling
```json
{
  "styling": "Tailwind CSS ^3.4.7",
  "components": "shadcn/ui (Radix UI primitives)",
  "icons": "Lucide React ^0.522.0",
  "animations": "tailwindcss-animate ^1.0.7",
  "notifications": "Sonner ^2.0.1",
  "fonts": "Geist ^1.4.2"
}
```

### Backend & Database
```json
{
  "api": "TRPC ^11.0.0-rc.824",
  "database": "PostgreSQL with Prisma ORM ^6.5.0",
  "auth": "NextAuth.js ^4.24.11",
  "email": "Resend ^4.1.2",
  "validation": "Zod ^3.24.2",
  "external_apis": "Google Calendar API"
}
```

### Development Tools
```json
{
  "linter": "Biome 2.0.4",
  "testing": "Playwright ^1.55.0 + Vitest ^3.2.4",
  "git_hooks": "Husky ^9.1.7",
  "package_manager": "pnpm >=9.0.0",
  "node_version": ">=20.15.0"
}
```

---

## Database Schema Design

### Core Entities

#### Users & Authentication
```prisma
model User {
  id                 String   @id @default(cuid())
  email              String   @unique
  name               String?
  password           String?
  role               Role     @default(STUDENT)
  emailVerified      DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  
  // Relations
  Student            Student?
  Notification       Notification[]
  PasswordResetToken PasswordResetToken[]
  StudentNote        StudentNote[]
  BlockedDateRange   BlockedDateRange[]
  
  @@index([role])
  @@index([emailVerified])
}

enum Role {
  ADMIN
  COACH  
  STUDENT
}
```

#### Student Management
```prisma
model Student {
  id                   String   @id @default(cuid())
  userId               String   @unique
  phone                String?
  maxLessonsPerWeek    Int      @default(3)
  notes                String?
  level                Level    @default(PRELIMINARY)
  emergencyContact     Json?
  isApproved           Boolean  @default(false)
  approvedAt           DateTime?
  approvedById         String?
  parentConsent        Boolean  @default(false)
  
  // Custom Pricing
  customPricingEnabled Boolean  @default(false)
  privateLessonPrice   Float?
  groupLessonPrice     Float?
  choreographyPrice    Float?
  competitionPrepPrice Float?
  
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  // Relations
  User                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  Lesson               Lesson[]
  Payment              Payment[]
  StudentNote          StudentNote[]
  
  @@index([isApproved])
  @@index([level])
}

enum Level {
  PRE_PRELIMINARY
  PRELIMINARY
  PRE_JUVENILE
  JUVENILE
  INTERMEDIATE
  NOVICE
  JUNIOR
  SENIOR
}
```

#### Scheduling System
```prisma
model Rink {
  id               String   @id @default(cuid())
  name             String   @unique
  timezone         String
  address          String
  maxCapacity      Int?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  // Relations
  Lesson           Lesson[]
  RinkTimeSlot     RinkTimeSlot[]
  RecurringPattern RecurringPattern[]
}

model RinkTimeSlot {
  id          String   @id @default(cuid())
  rinkId      String
  startTime   DateTime
  endTime     DateTime
  maxStudents Int      @default(1)
  isActive    Boolean  @default(true)
  recurringId String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  Rink        Rink     @relation(fields: [rinkId], references: [id], onDelete: Cascade)
  Lesson      Lesson[]
  
  @@index([rinkId, startTime])
  @@index([startTime])
  @@index([isActive])
}

model Lesson {
  id                    String       @id @default(cuid())
  studentId             String
  rinkId                String
  startTime             DateTime
  endTime               DateTime
  duration              Int
  type                  LessonType   @default(PRIVATE)
  area                  RinkArea     @default(MAIN_RINK)
  status                LessonStatus @default(SCHEDULED)
  cancellationReason    String?
  cancellationTime      DateTime?
  notes                 String?
  price                 Float
  timeSlotId            String?
  googleCalendarEventId String?
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt
  
  // Relations
  Student               Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  Rink                  Rink         @relation(fields: [rinkId], references: [id])
  RinkTimeSlot          RinkTimeSlot? @relation(fields: [timeSlotId], references: [id])
  Payment               Payment?
  
  @@index([studentId, startTime])
  @@index([rinkId, startTime])
  @@index([status])
}

enum LessonType {
  PRIVATE
  GROUP
  CHOREOGRAPHY
  COMPETITION_PREP
}

enum LessonStatus {
  SCHEDULED
  CANCELLED
  COMPLETED
}

enum RinkArea {
  MAIN_RINK
  PRACTICE_RINK
  DANCE_STUDIO
}
```

#### Payment System
```prisma
model Payment {
  id             String        @id @default(cuid())
  lessonId       String        @unique
  studentId      String
  amount         Float
  method         PaymentMethod
  status         PaymentStatus @default(PENDING)
  referenceCode  String        @unique
  verifiedBy     String?
  verifiedAt     DateTime?
  reminderSentAt DateTime?
  notes          String?
  lesson_date    DateTime
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  
  // Relations
  Lesson         Lesson        @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  Student        Student       @relation(fields: [studentId], references: [id])
  
  @@index([studentId, status])
  @@index([status, lesson_date])
  @@index([referenceCode])
}

enum PaymentMethod {
  VENMO
  ZELLE
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
}
```

#### Advanced Features
```prisma
model BlockedDateRange {
  id          String          @id @default(cuid())
  title       String
  description String?
  startDate   DateTime
  endDate     DateTime
  type        BlockedDateType @default(TRAVEL)
  createdById String
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  
  User        User            @relation(fields: [createdById], references: [id])
  
  @@index([startDate, endDate])
}

enum BlockedDateType {
  TRAVEL
  COMPETITION
  OTHER
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  message   String
  isRead    Boolean  @default(false)
  type      String   @default("INFO")
  link      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  User      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([createdAt])
}
```

---

## Architecture Patterns

### Project Structure
```
src/
├── app/                     # Next.js App Router
│   ├── (protected)/         # Protected routes
│   │   ├── admin/           # Admin dashboard pages
│   │   └── student/         # Student portal pages
│   ├── auth/                # Authentication pages
│   ├── api/                 # API routes
│   └── globals.css          # Global styles
├── components/
│   ├── ui/                  # Base UI components (shadcn/ui)
│   ├── layout/              # Layout components
│   └── [shared components]
├── features/                # Feature-based organization
│   ├── admin/               # Admin-specific features
│   ├── student/             # Student-specific features
│   ├── scheduling/          # Scheduling components
│   └── auth/                # Authentication features
├── lib/                     # Utility libraries
│   ├── api.ts               # TRPC client setup
│   ├── auth.ts              # Authentication config
│   ├── db.ts                # Database connection
│   ├── email.ts             # Email utilities
│   └── utils.ts             # General utilities
├── hooks/                   # Custom React hooks
├── server/                  # Server-side code
│   └── api/                 # TRPC routers
└── types/                   # TypeScript type definitions
```

### TRPC API Structure
```typescript
// Main router structure
export const appRouter = createTRPCRouter({
  // Admin routes
  admin: createTRPCRouter({
    auth: adminAuthRouter,
    students: adminStudentsRouter, 
    schedule: adminScheduleRouter,
    payments: adminPaymentsRouter,
    analytics: adminAnalyticsRouter,
  }),
  
  // Student routes  
  student: createTRPCRouter({
    profile: studentProfileRouter,
    booking: studentBookingRouter,
    schedule: studentScheduleRouter,
  }),
  
  // Shared routes
  notifications: createTRPCRouter({
    notifications: notificationsRouter,
  }),
  
  passwordReset: passwordResetRouter,
});
```

---

## Key Features Implementation

### 1. Authentication System

#### NextAuth.js Configuration
```typescript
// src/lib/auth.ts
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // bcrypt password verification
        // Role-based authorization
        // Return user with role
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.role = token.role;
      return session;
    }
  }
};
```

#### Role-Based Middleware
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  
  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  const { pathname } = request.nextUrl;
  
  // Admin route protection
  if (pathname.startsWith('/admin') && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/student', request.url));
  }
  
  // Student route protection
  if (pathname.startsWith('/student') && token.role !== 'STUDENT') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  
  return NextResponse.next();
}
```

### 2. Student Management System

#### Student Registration Flow
```typescript
// Multi-step registration with validation
const studentRegistrationSteps = [
  {
    id: 'personal',
    title: 'Personal Information',
    fields: ['name', 'email', 'phone', 'dateOfBirth']
  },
  {
    id: 'skating',
    title: 'Skating Information', 
    fields: ['level', 'experience', 'goals']
  },
  {
    id: 'emergency',
    title: 'Emergency Contact',
    fields: ['emergencyName', 'emergencyPhone', 'relationship']
  },
  {
    id: 'consent',
    title: 'Parent Consent',
    fields: ['parentConsent', 'liability']
  }
];
```

#### Admin Approval Workflow
```typescript
// TRPC mutation for student approval
approveStudent: adminProcedure
  .input(z.object({ studentId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const student = await ctx.db.student.update({
      where: { id: input.studentId },
      data: { 
        isApproved: true, 
        approvedAt: new Date(),
        approvedById: ctx.session.user.id
      }
    });
    
    // Send approval notification
    await createNotification({
      userId: student.userId,
      title: 'Account Approved!',
      message: 'Welcome to YM Movement! You can now book lessons.',
      type: 'SUCCESS'
    });
    
    return student;
  });
```

### 3. Advanced Scheduling System

#### Time Slot Management
```typescript
// Bulk time slot creation with templates
export const bulkCreateSlots = {
  templates: {
    weeklyRecurring: {
      daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 60, // minutes
      breakDuration: 15,
      weeks: 4
    },
    weekendIntensive: {
      daysOfWeek: [6, 0], // Sat-Sun
      startTime: '08:00', 
      endTime: '18:00',
      slotDuration: 90,
      breakDuration: 30,
      weeks: 8
    }
  }
};
```

#### Blocked Dates System
```typescript
// Prevent scheduling on blocked dates
createBlockedDate: adminProcedure
  .input(z.object({
    title: z.string(),
    description: z.string().optional(),
    startDate: z.date(),
    endDate: z.date(),
    type: z.enum(['TRAVEL', 'COMPETITION', 'OTHER'])
  }))
  .mutation(async ({ input, ctx }) => {
    // Check for conflicting time slots
    const conflictingSlots = await ctx.db.rinkTimeSlot.findMany({
      where: {
        startTime: { gte: input.startDate },
        endTime: { lte: input.endDate },
        isActive: true
      }
    });
    
    if (conflictingSlots.length > 0) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Cannot block dates: ${conflictingSlots.length} existing time slots would conflict`
      });
    }
    
    return ctx.db.blockedDateRange.create({
      data: {
        ...input,
        createdById: ctx.session.user.id
      }
    });
  });
```

#### Google Calendar Integration
```typescript
// src/lib/google-calendar.ts
export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;
  
  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    
    this.calendar = google.calendar({ version: 'v3', auth });
  }
  
  async createLessonEvent(lesson: Lesson, student: Student) {
    const event = {
      summary: `${lesson.type} Lesson - ${student.User.name}`,
      description: `Lesson with ${student.User.name}\nType: ${lesson.type}\nNotes: ${lesson.notes || 'None'}`,
      start: {
        dateTime: lesson.startTime.toISOString(),
        timeZone: 'America/Los_Angeles'
      },
      end: {
        dateTime: lesson.endTime.toISOString(), 
        timeZone: 'America/Los_Angeles'
      },
      attendees: [
        { email: process.env.INSTRUCTOR_EMAIL },
        { email: student.User.email }
      ]
    };
    
    const response = await this.calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: event
    });
    
    return response.data.id;
  }
}
```

### 4. Payment System

#### Payment Processing Workflow
```typescript
// Payment creation on lesson booking
bookLesson: studentProcedure
  .input(z.object({
    timeSlotId: z.string(),
    lessonType: z.enum(['PRIVATE', 'GROUP', 'CHOREOGRAPHY', 'COMPETITION_PREP']),
    notes: z.string().optional()
  }))
  .mutation(async ({ input, ctx }) => {
    const student = await ctx.db.student.findUniqueOrThrow({
      where: { userId: ctx.session.user.id }
    });
    
    // Calculate price (custom pricing or default)
    const price = await calculateLessonPrice(student, input.lessonType);
    
    // Create lesson and payment atomically
    const lesson = await ctx.db.lesson.create({
      data: {
        studentId: student.id,
        type: input.lessonType,
        price,
        // ... other fields
      }
    });
    
    const payment = await ctx.db.payment.create({
      data: {
        lessonId: lesson.id,
        studentId: student.id,
        amount: price,
        method: student.preferredPaymentMethod || 'VENMO',
        referenceCode: generateReferenceCode(),
        lesson_date: lesson.startTime
      }
    });
    
    // Create notification
    await createNotification({
      userId: ctx.session.user.id,
      title: 'Lesson Booked Successfully!',
      message: `Your ${input.lessonType.toLowerCase()} lesson has been scheduled.`,
      link: `/student/lessons/${lesson.id}`
    });
    
    return { lesson, payment };
  });
```

#### Automated Payment Reminders
```typescript
// src/lib/email.ts
export async function sendPaymentReminderEmail(
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
) {
  const paymentInstructions = paymentDetails.paymentMethod === 'VENMO' 
    ? 'Send payment to @yura-min on Venmo'
    : 'Send payment via Zelle to (714) 743-7071';
    
  const emailTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Payment Reminder - YM Movement</h2>
      
      <p>Hi ${studentName},</p>
      
      <p>This is a friendly reminder that you have an outstanding payment for your upcoming lesson.</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Payment Details:</h3>
        <p><strong>Amount:</strong> $${paymentDetails.amount}</p>
        <p><strong>Reference Code:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${paymentDetails.referenceCode}</code></p>
        <p><strong>Due Date:</strong> ${paymentDetails.dueDate.toLocaleDateString()}</p>
        ${paymentDetails.lessonDate ? `<p><strong>Lesson Date:</strong> ${paymentDetails.lessonDate.toLocaleDateString()}</p>` : ''}
      </div>
      
      <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Payment Instructions:</h3>
        <p>${paymentInstructions}</p>
        <p><strong>Important:</strong> Please include the reference code <code>${paymentDetails.referenceCode}</code> in your payment note.</p>
      </div>
      
      <p>Questions? Reply to this email or contact us at support@ym-movement.com</p>
      
      <p>Thank you!<br>YM Movement Team</p>
    </div>
  `;
  
  await resend.emails.send({
    from: 'YM Movement <info@ym-movement.com>',
    to: studentEmail,
    subject: `Payment Reminder - $${paymentDetails.amount} Due`,
    html: emailTemplate
  });
}
```

### 5. Notification System

#### Real-time Notifications
```typescript
// Auto-refresh notifications every 60 seconds
export function useNotifications() {
  const { data: notifications } = api.notifications.notifications.getNotifications.useQuery(
    undefined,
    {
      refetchInterval: 60000, // 60 seconds
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        // Don't retry on 401 errors (authentication issues)
        if (error.data?.code === 'UNAUTHORIZED') return false;
        return failureCount < 3;
      },
      onError: (error) => {
        // Silently handle 401 errors during authentication transitions
        if (error.data?.code !== 'UNAUTHORIZED') {
          console.error('Failed to fetch notifications:', error);
        }
      }
    }
  );
  
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  
  return { notifications, unreadCount };
}
```

### 6. Business Intelligence & Reporting

#### Export System
```typescript
// src/lib/export-utils.ts
export function exportRevenueToCSV(
  data: RevenueDataItem[], 
  options: ExportOptions
) {
  const headers = [
    'Date',
    'Total Revenue', 
    'Private Lessons',
    'Group Lessons',
    'Choreography',
    'Competition Prep',
    'Venmo Payments',
    'Zelle Payments',
    'Completed Lessons',
    'Student Count'
  ];
  
  const csvRows = [
    headers.join(','),
    ...data.map(item => [
      item.date,
      item.totalRevenue,
      item.byLessonType.PRIVATE || 0,
      item.byLessonType.GROUP || 0,
      item.byLessonType.CHOREOGRAPHY || 0,
      item.byLessonType.COMPETITION_PREP || 0,
      item.byMethod.VENMO || 0,
      item.byMethod.ZELLE || 0,
      item.completedLessons,
      item.uniqueStudents
    ].join(','))
  ];
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Download file
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `revenue-report-${options.period}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportToPDF(
  revenueData: RevenueDataItem[],
  attendanceData: AttendanceDataItem[],
  overviewData: OverviewData,
  options: ExportOptions
): Promise<void> {
  // Create print-optimized version
  const printContent = generatePrintHTML(revenueData, attendanceData, overviewData);
  
  // Open print dialog
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Popup blocked - please allow popups to generate PDF');
  }
  
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}
```

---

## Security Implementation

### Input Sanitization
```typescript
// Custom sanitization hook
export function useSanitizedInput() {
  const sanitizeInput = useCallback((input: string): string => {
    if (!input) return "";
    
    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
      .replace(/javascript:/gi, "")
      .replace(/vbscript:/gi, "")
      .replace(/on\w+=/gi, "")
      .substring(0, 10000); // Max length limit
  }, []);
  
  return { sanitizeInput };
}
```

### Rate Limiting
```typescript
// src/lib/rate-limit.ts
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private maxRequests = 5,
    private windowMs = 15 * 60 * 1000 // 15 minutes
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier);
    
    if (!userRequests || now > userRequests.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }
    
    if (userRequests.count >= this.maxRequests) {
      return false;
    }
    
    userRequests.count++;
    return true;
  }
}

export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000);
```

### Security Headers (Next.js Config)
```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: `
            default-src 'self';
            script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com;
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
            font-src 'self' https://fonts.gstatic.com;
            img-src 'self' data: https: blob:;
            connect-src 'self' https://accounts.google.com https://api.resend.com;
            frame-src https://accounts.google.com;
            object-src 'none';
            base-uri 'self';
            form-action 'self';
            upgrade-insecure-requests;
          `.replace(/\s{2,}/g, ' ').trim()
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains'
        }
      ]
    }
  ];
}
```

---

## Performance Optimizations

### React Performance Patterns
```typescript
// Optimized context with splitting
const BulkOperationsContext = createContext<BulkOperationsContextType | undefined>(undefined);

export function BulkOperationsProvider({ children }: { children: React.ReactNode }) {
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      selectedSlots,
      setSelectedSlots,
      isSelectionMode,
      setIsSelectionMode,
      selectSlot: (id: string) => {
        setSelectedSlots(prev => new Set(prev).add(id));
      },
      deselectSlot: (id: string) => {
        setSelectedSlots(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      },
      clearSelection: () => {
        setSelectedSlots(new Set());
      }
    }),
    [selectedSlots, isSelectionMode]
  );
  
  return (
    <BulkOperationsContext.Provider value={contextValue}>
      {children}
    </BulkOperationsContext.Provider>
  );
}
```

### Virtualized Lists for Large Datasets
```typescript
// src/components/ui/virtualized-table.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualizedTable<T>({ 
  data, 
  columns, 
  rowHeight = 50 
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10, // Render 10 extra items for smooth scrolling
  });
  
  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <TableRow data={data[virtualRow.index]} columns={columns} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Debounced Search
```typescript
// src/hooks/useDebounced.ts
export function useDebouncedSearch(
  searchFunction: (query: string) => Promise<any>,
  delay = 300
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const debouncedQuery = useMemo(
    () => debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }
      
      setIsLoading(true);
      try {
        const searchResults = await searchFunction(searchQuery);
        setResults(searchResults);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, delay),
    [searchFunction, delay]
  );
  
  useEffect(() => {
    debouncedQuery(query);
  }, [query, debouncedQuery]);
  
  return { query, setQuery, results, isLoading };
}
```

---

## Testing Strategy

### E2E Testing with Playwright

#### Test Structure
```typescript
// tests/helpers/test-utils.ts
export class TestHelper {
  constructor(private page: Page) {}
  
  async loginAsAdmin() {
    await this.page.goto('/auth/login');
    await this.page.fill('[data-testid="email"]', 'admin@test.com');
    await this.page.fill('[data-testid="password"]', 'ADMINPASS2025!');
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/admin');
  }
  
  async loginAsStudent() {
    await this.page.goto('/auth/login');
    await this.page.fill('[data-testid="email"]', 'student@test.com');
    await this.page.fill('[data-testid="password"]', 'StudentPassword123!');
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/student');
  }
  
  async createTimeSlot(data: {
    date: string;
    startTime: string;
    endTime: string;
    rinkName: string;
  }) {
    await this.page.click('[data-testid="create-slot-button"]');
    await this.page.fill('[data-testid="slot-date"]', data.date);
    await this.page.fill('[data-testid="slot-start-time"]', data.startTime);
    await this.page.fill('[data-testid="slot-end-time"]', data.endTime);
    await this.page.selectOption('[data-testid="rink-select"]', data.rinkName);
    await this.page.click('[data-testid="save-slot-button"]');
  }
}
```

#### Test Suites Coverage
1. **Authentication & Authorization** - Login/logout, role-based access
2. **Student Management** - Registration, approval, profile management
3. **Lesson Scheduling** - Time slots, booking, conflicts, cancellations
4. **Admin Dashboard** - Analytics, student management, bulk operations
5. **Payment System** - Payment tracking, reminders, verification
6. **Reports & Export** - CSV/PDF generation, data accuracy
7. **Notifications** - Real-time updates, mark as read functionality
8. **UI Components** - Toast notifications, dialogs, forms
9. **E2E Workflows** - Complete user journeys
10. **Performance** - Load times, memory usage, error handling

---

## Deployment Configuration

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/yura_scheduler"

# Authentication
NEXTAUTH_SECRET="your-32-character-secret-key"
NEXTAUTH_URL="https://your-domain.com"

# Google Calendar Integration
GOOGLE_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----"
GOOGLE_CALENDAR_ID="calendar-id@group.calendar.google.com"
INSTRUCTOR_EMAIL="instructor@example.com"

# Email Service
RESEND_API_KEY="your-resend-api-key"

# Optional Development
NODE_ENV="production"
ENABLE_AUTH_BYPASS="false"
```

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:20-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Netlify Configuration
```toml
# netlify.toml
[build]
  command = "npx prisma generate && npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NEXT_USE_NETLIFY_EDGE = "true"
```

---

## Development Workflow

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build", 
    "start": "next start",
    "lint": "biome check ./src",
    "lint:fix": "biome check --apply ./src",
    "format": "biome format --write ./src",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:all": "npm run test:run && npm run test:e2e",
    "prisma:migrate": "prisma migrate deploy",
    "security:audit": "node scripts/security-audit.js"
  }
}
```

### Git Hooks (Husky)
```bash
#!/usr/bin/env sh
# .husky/pre-commit
. "$(dirname -- "$0")/_/husky.sh"

# Type check
npm run type-check

# Lint and format
npm run lint

# Run unit tests
npm run test:run
```

---

## Key Implementation Notes

### Critical Success Factors

1. **Database Design**: Proper indexing for performance, relationship modeling for data integrity
2. **Security First**: Input sanitization, rate limiting, proper authentication flows
3. **Performance Optimization**: React optimization patterns, virtualization for large lists, debounced searches
4. **User Experience**: Responsive design, loading states, error handling, toast notifications
5. **Testing Coverage**: Comprehensive E2E testing covering all user flows
6. **Documentation**: Extensive documentation for maintainability and onboarding

### Common Pitfalls to Avoid

1. **React Error #130**: Ensure null-safe access to object properties (`lesson.type?.replace()`)
2. **Prisma Relations**: Use PascalCase for relation names (`Student.User.name` not `student.user.name`)
3. **Authentication Timing**: Handle authentication state transitions gracefully
4. **Toast Notifications**: Use consistent z-index and positioning across the app
5. **Performance**: Implement proper memoization and avoid unnecessary re-renders

### Advanced Features to Implement

1. **Real-time Updates**: WebSocket integration for live calendar updates
2. **Mobile App**: React Native version for mobile access
3. **Analytics Dashboard**: Advanced business intelligence with charts and metrics
4. **Multi-language Support**: i18n integration for international users
5. **Integration APIs**: Connect with existing rink management systems

---

## Conclusion

This rebuild guide provides a comprehensive blueprint for recreating the Yura Scheduler v3 application. The architecture emphasizes:

- **Modern Technology Stack** with cutting-edge frameworks
- **Security Best Practices** throughout the application
- **Performance Optimizations** for scalable user experience  
- **Comprehensive Testing** for reliability and maintainability
- **Enterprise-grade Features** suitable for professional use

Follow this guide systematically, implementing each feature with proper testing and documentation to achieve a production-ready application that matches or exceeds the original system's capabilities.

**Total Estimated Development Time**: 6-8 months with a team of 2-3 developers
**Recommended Approach**: Implement core features first (auth, basic scheduling) then add advanced features incrementally