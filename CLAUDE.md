# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Dev server**: `pnpm dev` or `npm run dev` (runs on port **3100**)
- **Build**: `pnpm build` or `npm run build`
- **Type checking**: `pnpm type-check` or `npm run type-check`
- **Linting**: `pnpm lint` or `npm run lint`
- **Format code**: `pnpm format` or `npm run format`
- **Auto-fix lint issues**: `pnpm lint:fix` or `npm run lint:fix`
- **Database migrations**: `pnpm prisma:migrate` or `npm run prisma:migrate`
- **Lesson type migration**: `pnpm migrate:lesson-types` (migrate existing lessons to use lesson types)

## Developer Tools

### API Documentation (Swagger)
**Development-only tool** for viewing complete API structure and testing endpoints.

- **Access**: Visit `http://localhost:3100/api-docs` when running `pnpm dev`
- **Security**: Only available in development mode (returns 404 in production)
- **Features**: Interactive API testing, request/response schemas, endpoint catalog
- **Documentation**: See [SWAGGER-API-DOCS.md](docs/SWAGGER-API-DOCS.md) for usage guide

## Testing Commands

**End-to-End Testing**: Uses **Playwright** for comprehensive browser testing

- **Run all E2E tests**: `npm run test:e2e` or `pnpm test:e2e`
- **Run E2E tests with UI**: `npm run test:e2e:ui` (interactive mode)
- **Run E2E tests headed**: `npm run test:e2e:headed` (visible browser)
- **Debug E2E tests**: `npm run test:e2e:debug` (step-by-step debugging)
- **View test report**: `npm run test:e2e:report` (HTML report)
- **Generate test code**: `npm run test:e2e:codegen` (record interactions)
- **Run all tests**: `npm run test:all` (unit + E2E tests)

**Test Coverage**:
- Student signup and registration flow
- Admin dashboard functionality
- Lesson scheduling and booking
- Authentication and authorization
- Payment processing workflows
- Responsive design across devices
- Email notification systems
- Complete end-to-end user journeys

## MCP Server Configuration

**shadcn/ui MCP Server**: Configured for enhanced UI component access and development.

**Setup Requirements**:
1. **GitHub Personal Access Token**: Used for GitHub API access (5000 requests/hour vs 60 without)
2. **Claude Code MCP Setup**: Configured using official Claude Code MCP commands
3. **Restart Required**: Must restart Claude Code after configuration changes

**Current Setup Status**: ✅ **CONFIGURED AND CONNECTED**
- Server: `@jpisnice/shadcn-ui-mcp-server` 
- Status: Connected (verified with `claude mcp list`)
- Added with: `claude mcp add shadcn-ui npx @jpisnice/shadcn-ui-mcp-server -e GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here`

**Available MCP Tools**:
- `mcp__shadcn-ui__list_components` - List all available shadcn/ui components
- `mcp__shadcn-ui__get_component` - Get specific component source code
- `mcp__shadcn-ui__get_component_demo` - Get component usage examples
- `mcp__shadcn-ui__get_component_metadata` - Get component dependencies and info
- `mcp__shadcn-ui__list_blocks` - List all available UI blocks
- `mcp__shadcn-ui__get_block` - Get complete block implementations (including calendar blocks)

**Usage**: Particularly useful for calendar component development, UI consistency, and accessing latest shadcn/ui patterns.

## Docker Commands (Recommended for Local Development)

**Docker Development Environment**: Containerized Next.js app using Neon cloud database with optional Redis caching.

**Quick Start**:
```bash
# First time: Build the Docker image
pnpm docker:build

# Start development environment with hot reload
pnpm docker:dev

# Access app at http://localhost:3000
# Uses your .env file (Neon database connection)
```

**Core Commands**:
- **Start development**: `pnpm docker:dev` (foreground with logs)
- **Start in background**: `pnpm docker:dev -d` (detached mode)
- **Stop all services**: `pnpm docker:down`
- **View logs**: `pnpm docker:logs`
- **Container shell**: `pnpm docker:shell` (for debugging)
- **Clean rebuild**: `pnpm docker:clean` (removes containers, volumes, images)

**Build Commands**:
- **Build containers**: `pnpm docker:build` (required first time)
- **Rebuild from scratch**: `pnpm docker:clean && pnpm docker:build`

**Optional Redis** (for caching):
```bash
# Start app + Redis
docker-compose --profile redis up

# Redis available at localhost:6379
```

**Development Workflow**:
1. `pnpm docker:build` - Build Docker image (first time only)
2. `pnpm docker:dev` - Start Next.js app in Docker
3. Visit `http://localhost:3000` - App with hot reload enabled
4. Edit files in VS Code - Changes auto-reload in container
5. `pnpm docker:down` - Stop when done

**Database Configuration**:
- **Type**: Neon PostgreSQL (cloud database)
- **Connection**: Configured via `DATABASE_URL` in `.env` file
- **No local PostgreSQL needed** - Uses your existing Neon database
- **Health Check**: `/api/health` endpoint verifies database connectivity

**Benefits**:
- ✅ **Consistent environment** - Same Node.js version for all developers
- ✅ **No local Node.js required** - Only Docker needed
- ✅ **Hot reload enabled** - Code changes update instantly
- ✅ **Production-like** - Matches deployed environment
- ✅ **Easy cleanup** - Remove everything with one command
- ✅ **Works with Neon** - No local database setup required

**When to Use Docker vs Local**:
- **Use Docker (`pnpm docker:dev`)** - Team consistency, production-like environment
- **Use Local (`pnpm dev`)** - Faster startup, simpler debugging
- **Both work with Neon** - Same database connection either way

**Troubleshooting**:
- **Port 3000 in use**: Stop local dev server first (`pnpm dev`)
- **Changes not updating**: Restart with `pnpm docker:down && pnpm docker:dev`
- **Build errors**: Clean rebuild with `pnpm docker:clean && pnpm docker:build`
- **Database connection fails**: Check `.env` file has correct `DATABASE_URL`
- **Out of disk space**: Run `docker system prune -a --volumes`

## Documentation Commands

**Documentation System**: Uses **MkDocs** with Material theme (replaced Docsify due to symlink issues)

### Running Documentation Locally

**Prerequisites**: MkDocs must be installed in WSL:
```bash
# Install pipx if not already installed
sudo apt install pipx

# Install MkDocs and plugins
pipx install mkdocs
pipx inject mkdocs mkdocs-material mkdocs-git-revision-date-localized-plugin
```

**Commands**:
- **Documentation server**: `mkdocs serve` (serves at localhost:8000)
- **Build documentation**: `mkdocs build` (outputs to `site/` folder)
- **Deploy to GitHub Pages**: `mkdocs gh-deploy`

**Alternative using package.json**:
- **Documentation server**: `pnpm docs:dev`
- **Build documentation**: `pnpm docs:build`
- **Deploy**: `pnpm docs:deploy`

### Documentation Structure

**Current Setup**: All documentation files in `docs/` are **real files** (copies of uppercase files in root directory). 

**When updating documentation**:
1. Update the uppercase file (e.g., `API.md`, `CONTRIBUTING.md`)
2. Copy it to the `docs/` folder (e.g., `cp API.md docs/api.md`)
3. **Never use symlinks** - they cause Git and deployment issues

### 🚨 Why We Switched from Docsify

**Problem**: Docsify created symlinks that caused catastrophic Git issues:
- "No such file or directory" errors during commits
- Build failures on Netlify/deployment platforms
- VS Code showing phantom file changes
- Windows/WSL symlink permission issues

**Solution**: MkDocs with real files - no symlinks, no problems!

## Tech Stack & Architecture

**Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Radix UI
**Backend**: TRPC v11, Prisma ORM, PostgreSQL
**Auth**: NextAuth.js with ADMIN/STUDENT roles
**External**: Google Calendar API integration

**Core Database Entities**: User, Student, Lesson, Payment, Rink, RinkTimeSlot, RecurringPattern

**Project Structure**:
- `src/app/`: Next.js App Router pages and layouts
- `src/features/`: Feature-based organization (admin, student, auth, notifications, scheduling)
- `src/components/ui/`: Reusable UI components (Radix-based)
- `src/lib/`: Core utilities (TRPC, auth, Prisma, date utils, Google Calendar)
- `src/hooks/`: Custom React hooks
- `prisma/`: Database schema and migrations

## Claude Code Agent Configuration

**Subagents Directory**: `.claude/agents/`

This project includes specialized Claude Code subagents for focused development tasks:
- Custom agent configurations stored in `.claude/agents/` directory
- Agents provide specialized capabilities for specific development workflows
- See individual agent files for specific capabilities and usage instructions

**Note**: Subagent configurations are project-specific and automatically loaded by Claude Code when working in this repository.

## Key Features

- **Role-based dashboards**: Separate admin and student interfaces
- **Advanced scheduling**: Time slot management with conflict detection and timezone support
- **Lesson type management**: Complete workflow for Private, Choreography, Group, and Competition Prep lessons
  - Calendar-integrated assignment and editing
  - Visual color-coded badges (Purple=Choreography, Blue=Private, Green=Group, Orange=Competition Prep)
  - Automatic pricing based on lesson type and student custom rates
  - Edit lesson types with price preview and automatic payment/calendar updates
- **Blocked dates management**: Create and manage blocked periods (travel, competitions) with calendar integration
- **Bulk operations**: Optimized bulk time slot creation with templates, real-time validation, and bulk delete with selection
- **Enhanced editing**: Edit time slots with proper timezone handling and accurate time display
- **Compact time slot creation**: Context-aware dialog with smart defaults and no scrolling required
- **Student management**: Approval workflow, custom pricing per lesson type, lesson tracking
- **Payment tracking**: Venmo/Zelle integration with manual verification and automatic price calculation
- **Google Calendar sync**: Automatic event creation/updates
- **Unified notifications**: Sonner toast system with consistent styling and centered positioning

## Code Standards

- **Biome** for linting/formatting (not ESLint/Prettier)
- 2-space indentation, 100 character line width, double quotes
- TypeScript strict mode, React Hook Form + Zod validation
- Feature-based organization, custom UI components follow Radix patterns
- Date handling with date-fns library
- **Radix DropdownMenuItem hover styling**: Always use `focus:` (not `hover:`) for highlight overrides on `DropdownMenuItem`. Radix manages highlight state via focus, not CSS hover. Use `hover:` only on regular `Button` components. Example: `className="text-red-600 focus:text-red-700 focus:bg-red-50"` (not `hover:`)

## Neon Database Backup & Recovery

### Scheduled Snapshots (Dashboard Setup)
Neon supports scheduled snapshots configured via the dashboard — no external tooling needed.

**To enable** (one-time setup in Neon Console):
1. Go to [Neon Console](https://console.neon.tech) → your project
2. Navigate to **Branches** → select your production branch (usually `main`)
3. Click **Backup schedule** (or find it under branch settings)
4. Set schedule: **Daily**, retention: **30 days**
5. Save

This creates automatic daily snapshots you can restore from if data is ever lost.

### Pre-Migration Safety Check
Before running any migration, verify current data:
```bash
pnpm db:check
```
This prints row counts for all critical tables (User, Student, Rink, RinkTimeSlot, Lesson, Payment) and warns if any are empty.

### Data Integrity Endpoint
`GET /api/health/data` — returns row counts for critical tables. Use to quickly verify data integrity at any time.

### Recovery Procedure
If data is accidentally deleted:
1. **Do NOT run any more migrations or commands** — stop immediately
2. Go to Neon Console → your project → **Branches**
3. Use **Point-in-Time Restore** to restore to a timestamp before the incident
4. Verify data with `pnpm db:check`

**Reference incident**: On 2026-04-05, `prisma migrate reset` wiped 1,025 time slots, 871 lessons, and 871 payments. Recovered via Neon PITR.

## Development Notes

- No test framework configured
- Always run `pnpm prisma:migrate` after schema changes
- Development auth bypass: `ENABLE_AUTH_BYPASS=true`
- Environment variables required for Google Calendar, database, NextAuth
- **IMPORTANT**: Prisma relation names use PascalCase (e.g., `User`, `Lesson`, `Student`, `Rink`) - always use these in includes and access patterns

## 🚨 ABSOLUTE PROHIBITION: Database Destructive Operations

**⚠️ PRODUCTION DATA MUST NEVER BE MASS-DELETED UNDER ANY CIRCUMSTANCES ⚠️**

### FORBIDDEN Commands (NEVER RUN — NO EXCEPTIONS UNLESS USER EXPLICITLY ASKS)
- ❌ `prisma migrate reset` — **DROPS ALL TABLES AND DATA. ABSOLUTELY FORBIDDEN.** Only the user can authorize this, and only with an explicit direct request. Do NOT run this during dependency updates, schema changes, or any automated workflow.
- ❌ `prisma db push --force-reset` — **DESTROYS ALL DATA**
- ❌ `prisma migrate dev` — Can reset the database if migrations diverge. Use `prisma migrate deploy` instead.
- ❌ `DELETE FROM` without a specific `WHERE` clause
- ❌ `TRUNCATE` on any table
- ❌ `DROP TABLE` on any table
- ❌ Any bulk delete operation that could affect more than a handful of rows

### SAFE Prisma Commands
- ✅ `prisma generate` — generates TypeScript client (no DB changes)
- ✅ `prisma migrate deploy` — applies pending migrations only (no data loss)
- ✅ `prisma db pull` — introspects schema (read-only)
- ✅ `prisma studio` — GUI browser (read-only by default)

### Why This Rule Exists
On 2026-04-05, a `prisma migrate reset` (or equivalent) wiped all RinkTimeSlot (1,025 rows), Lesson (871 rows), and Payment (871 rows) data from production during a dependency update session. Data was recovered via Neon point-in-time restore.

### Enforcement
- **Before ANY database operation**: Verify the command is on the SAFE list above
- **Before ANY `pnpm install` or dependency update**: Check that no postinstall script runs destructive Prisma commands
- **If uncertain**: ASK THE USER before executing any database-touching command
- **Never assume a Prisma command is safe** — verify it explicitly

## 🚨 CRITICAL: TimeSlotDialog Data Flow Architecture

**⚠️ NEVER MODIFY THE ADAPTER WITHOUT PRESERVING ALL LESSON FIELDS ⚠️**

### Data Flow Chain (DO NOT BREAK)
```
Database (Prisma)
  → timeSlotQueries.ts (API query with full Lesson fields)
  → useTimeSlots hook
  → useCalendarEvents hook
  → ScheduleManager.handleSelectEvent
  → TimeSlotDialogAdapter.castToLessons() ⚠️ CRITICAL POINT
  → TimeSlotDialog component (displays price/type)
```

### TimeSlotDialogAdapter Requirements (IMMUTABLE)
**File**: `src/features/admin/components/scheduling/TimeSlotDialogAdapter.tsx`

**CRITICAL FUNCTION**: `castToLessons()` at lines 58-91

**MUST PRESERVE ALL FIELDS**:
```typescript
interface Lesson {
  id: string;
  type: string;        // ⚠️ REQUIRED - lesson type (PRIVATE, CHOREOGRAPHY, etc)
  price: number;       // ⚠️ REQUIRED - lesson price (e.g., 120)
  status: string;      // ⚠️ REQUIRED - lesson status (CONFIRMED, etc)
  notes: string | null; // ⚠️ REQUIRED - lesson notes
  Student: {
    id: string;
    User: {
      name: string | null;
    };
  };
}
```

**WHY THIS IS CRITICAL**:
- The adapter converts lesson data from unknown[] to typed Lesson[]
- If ANY field is missing from the return object, it will show as undefined in the UI
- Price displays as $0.00 if `price` field is not preserved
- Type shows as "Unknown" if `type` field is not preserved

**FORBIDDEN ACTIONS**:
- ❌ NEVER remove fields from the Lesson interface
- ❌ NEVER return partial objects from castToLessons()
- ❌ NEVER skip fields in the mapping function
- ❌ NEVER assume fields are optional - ALL are required for proper display

**TESTING CHECKLIST**:
After ANY changes to TimeSlotDialogAdapter.tsx:
1. Click a time slot with an assigned student
2. Verify "Assigned Students" card shows correct price (not $0.00)
3. Verify lesson type badge displays (Private, Choreography, etc)
4. Verify student name shows correctly
5. Verify "Edit Lesson Type" dialog opens with correct current price

**Related Files**:
- `TimeSlotDialog.tsx` - Displays the lesson cards (lines 260-330)
- `ScheduleManager.tsx` - Passes slot data to adapter
- `timeSlotQueries.ts` - Database query with Lesson selection (lines 47-72)
- `calendarUtils.ts` - TypeScript interface definitions for Lesson/TimeSlot

## Recent Major Updates (2026-04-05)

### Security Audit & Hardening

Comprehensive security audit and remediation covering dependencies, API routes, middleware, data exposure, and logging hygiene.

#### New: HTTP-Level Route Protection
- **`src/middleware.ts`** (new file): Next.js middleware enforcing role-based access on `/admin/*`, `/student/*`, `/coach/*` routes using JWT token inspection via `getToken` from `next-auth/jwt`
- Gracefully handles stale sessions (missing `role` in token) by deferring to TRPC-layer auth
- Redirects unauthenticated users to `/auth/login` with `callbackUrl` preserved

#### Dependency Security
- Removed `trpc-openapi` (unused, brought 4 transitive vulnerabilities via h3)
- Removed `node-mock-http` (potential typosquat risk)
- Updated `next` to 16.1.7 (CSRF bypass + HTTP smuggling fixes)
- Added pnpm overrides for 8 transitive dependency vulnerabilities: `dompurify`, `h3`, `effect`, `defu`, `immutable`, `picomatch`, `yaml`, `brace-expansion`

#### Password Hash Exposure Prevention
- Replaced `include: { User: true }` with explicit `User: { select: { id, name, email, role } }` across 14+ Prisma queries to prevent password hashes from reaching API responses
- **Files**: `approvalQueries.ts`, `lessonQueries.ts`, `bookingQueries.ts`, `auth-tokens.ts`

#### API Response Hardening
- Removed raw error details from 500 responses in signup, coach-signup, health check, and cron endpoints (prevents stack trace / internal info leakage)
- Updated CORS config in `next.config.js` with proper production domain (`ym-movement.com`)

#### Authentication & Authorization Fixes
- **`src/lib/security.ts`**: Replaced length-leaking `safeCompare` with HMAC-based timing-safe comparison
- **`src/server/api/routers/passwordReset.ts`**: Added password complexity validation (`validatePasswordStrength`) before allowing password resets
- **`src/lib/trpc.ts`**: Tightened `superAdminProcedure` to exclusively require `SUPER_ADMIN` role (was accepting `ADMIN`)
- **`src/lib/account-lockout.ts`**: Changed to fail-closed on DB errors (locked out instead of allowing through)
- **`src/features/admin/api/queries/student/approvalQueries.ts`**: Removed hardcoded `"admin001"` fallback IDs

#### Logging Cleanup (~138 statements removed)
- Removed API key prefix logging, PII exposure, email body dumps from server utilities
- Removed all emoji-prefixed debug logs from admin components and hooks
- Removed Turnstile widget debug logs from auth pages
- Removed form data dumps, render count tracking, and mutation callback debug logs
- Retained only `console.error` for actual failures and `logSecurityEvent` for security-relevant events

#### Student Schedule Visibility Fix
- **Bug**: Students couldn't see their booked lessons because `getStudentLessons` in `profileQueries.ts` filtered by `RinkTimeSlot.isActive`, hiding lessons on unpublished (draft) time slots
- **Fix**: Removed `isActive` filter from student's own lesson queries (`getStudentLessons`, `getStudentLessonStats`). The `isActive` filter remains correctly applied in `availabilityQueries.ts` to prevent students from browsing/booking unpublished slots
- **Design**: Draft time slots are hidden from the booking page but booked lessons always appear in the student's schedule

## Previous Major Updates (2025-10-14)

### ✅ **Comprehensive Lesson Type Management System**
- **Calendar Integration**: Complete lesson type workflow directly in admin calendar
  - Click time slot → "Assign Student with Lesson Type" button
  - Visual badges with color coding (Purple=Choreography, Blue=Private, Green=Group, Orange=Competition Prep)
  - Edit lesson type button (pencil icon) for each assigned student

- **Components Added**:
  - `AdminAssignmentDialog.tsx`: Assign students with lesson type selection
  - `EditLessonTypeDialog.tsx`: Edit existing lesson types with price preview
  - Enhanced `TimeSlotDialog.tsx`: Shows lesson types and prices for all assigned students

- **Backend Enhancements**:
  - `assignStudentToTimeSlot`: Now accepts `lessonType` and `notes` parameters
  - `updateLessonType`: New mutation for changing lesson types
  - Automatic price recalculation based on lesson type and student custom pricing
  - Google Calendar event updates with lesson type in title
  - Payment record synchronization on type changes
  - Student notifications for type updates

- **Database Migration**:
  - Migration script: `scripts/migrate-lesson-types.ts`
  - Command: `pnpm migrate:lesson-types`
  - Sets default `PRIVATE` type for existing lessons without type
  - Calculates proper pricing based on student custom rates or defaults
  - Safe error handling with comprehensive logging

- **Documentation**:
  - `LESSON-TYPE-FEATURE.md`: Complete feature documentation
  - `CALENDAR-INTEGRATION-GUIDE.md`: Calendar workflow guide
  - `MIGRATION-LESSON-TYPES.md`: Database migration guide with rollback procedures

- **Bug Fixes**:
  - Fixed TypeError for lessons without type field (null safety)
  - Added fallback to "Private" for undefined lesson types
  - Optional type and price fields in TypeScript interfaces

## Previous Major Updates (2025-08-07)

### ✅ **Reports Dashboard Export System**
- **New Feature**: Comprehensive export functionality for business reports
- **CSV Exports**: Revenue, attendance, and combined reports with proper data formatting
- **PDF Export**: Professional print-ready reports via browser dialog with YM Movement branding
- **Components**: `src/lib/export-utils.ts` with full export utilities
- **UI Enhancement**: Dropdown menu in Reports page with multiple export options
- **Features**: Error handling, popup blocker detection, responsive design

### ✅ **Email Payment Reminder System** 
- **New Feature**: Automated email reminders for outstanding payments
- **Email Template**: Professional HTML with payment details, instructions, and branding
- **Integration**: `sendPaymentReminderEmail()` function in `src/lib/email.ts`
- **Payment Methods**: Smart detection of Venmo (@yura-min) vs Zelle ((714) 743-7071) instructions  
- **API Integration**: Full integration with `admin.payment.sendPaymentReminder` mutation
- **Error Handling**: Non-blocking email failures, graceful development fallbacks

### ✅ **Notifications System Architecture**
- **API Structure**: `notifications.notifications.getNotifications` (double-nested routing)
- **Auto-refresh**: Every 60 seconds when user is authenticated  
- **Error Resilience**: Graceful handling of 404/500 errors during authentication timing
- **Features**: Mark as read, mark all as read, real-time updates
- **Database**: Notification table with proper indexing and user relationships

### ✅ **Enhanced Greeting Personalization**
- **New Feature**: Randomized punctuation in greeting system
- **Variations**: Greetings now alternate between "!" and ":)" for variety
- **Implementation**: `getPunctuation()` function in `WarmGreeting` component
- **Consistency**: Same randomization logic across greeting and toast systems
- **Timing**: Changes every ~10 minutes for stable but varied experience

## Recent Critical Student Portal Fixes (2025-08-30)

### ✅ **React Error #130 Production Resolution**
- **Critical Fix**: Resolved React error #130 that prevented student dashboard from loading in production
- **Root Cause**: Undefined `lesson.type` property causing `.replace()` calls on undefined in production data
- **Solution**: Added null-safe access with fallback in `UpcomingLessons.tsx`
- **Code**: `{lesson.type ? lesson.type.replace("_", " ") : "Private"}` 
- **Impact**: Student dashboard now loads successfully in production environment

### ✅ **Student Header Layout Standardization**
- **Layout Fix**: Aligned student header spacing and structure with admin header standards
- **Changes**: Updated container from `space-y-4` to proper flex column layout with controlled margins
- **Typography**: Added responsive text sizing and proper breadcrumb styling
- **Alignment**: Perfect alignment with sidebar logo and navigation elements
- **Consistency**: Visual parity between admin and student portal headers

### ✅ **Student Welcome Experience Enhancement**
- **Feature**: Added `WarmGreeting` component to student header replacing plain text
- **Experience**: Personalized welcome messages like "Welcome back, [Name]!" 
- **Styling**: Professional typography matching admin portal standards
- **Implementation**: `<WarmGreeting name={session?.user?.name || "Student"} role="student" />`
- **Impact**: Enhanced user experience with warm, personalized greetings

### ✅ **Icon Component Safety Hardening**
- **Bug Prevention**: Added fallback handling for undefined Icon components
- **Components**: Updated `LessonStatusBadge` and `LessonStatusIndicator` 
- **Fallbacks**: `|| Clock` for icons, `|| "Unknown"` for labels, `|| "text-gray-500"` for colors
- **Robustness**: Prevents React errors when invalid status values are encountered

## Recent Critical Bug Fixes & System Improvements (2025-09-03)

### ✅ **Critical Issue Resolution Session**
Addressed all critical and high-priority issues identified through comprehensive system audit:

#### **Student Names "Unknown" in Payments - FIXED**
- **Issue**: PaymentTable displayed "Unknown" instead of student names
- **Root Cause**: Incorrect Prisma relation naming (`student.user.name` vs `Student.User.name`)
- **Solution**: Updated `PaymentTable.tsx:111` to use PascalCase relation conventions
- **Impact**: All payment records now display correct student names

#### **Past Time Slot Booking Prevention - IMPLEMENTED**
- **Issue**: Users could book lessons for time slots that had already passed
- **Solution**: Dual-layer validation approach
  - **Frontend**: Updated `availabilityQueries.ts:54` to filter past slots from queries
  - **Backend**: Added server-side validation in `bookingQueries.ts:71` with clear error messages
- **Security**: Defense-in-depth prevents edge cases and improves data integrity

#### **Password Recovery System - FIXED**
- **Issue**: TRPC API routing inconsistencies preventing password reset
- **Root Cause**: `ResetPasswordForm.tsx` called wrong endpoints (`admin.auth.*` vs `passwordReset.*`)
- **Solution**: 
  - Updated API calls to use correct `api.passwordReset.*` endpoints
  - Converted forgot password page from fetch() to TRPC mutations for consistency
  - Verified complete password reset flow functionality
- **Impact**: Password recovery now works end-to-end

#### **Blocked Dates Styling Consistency - STANDARDIZED**
- **Issue**: Travel dates shown in inconsistent colors (blue/red instead of neutral)
- **Solution**: Standardized color scheme across all components:
  - **Travel dates**: Gray (neutral, less visually intrusive)
  - **Competition dates**: Red (important, attention-grabbing)
  - **Other dates**: Gray (neutral)
- **Files Updated**: `TravelDateBlocker.tsx`, `TravelDateManager.tsx`, `BlockedDatesManager.tsx`

#### **Notification System Integration - ACTIVATED**
- **Enhancement**: Notification UI existed but no notifications were being generated
- **Solution**: Integrated `createNotification` helper into lesson booking flow
- **Features Added**:
  - Auto-notifications for successful lesson bookings
  - Success messages with links to lesson details
  - Real-time notification display in both admin and student headers
- **Impact**: Users now receive immediate feedback for important actions

#### **Custom Student Pricing - VERIFIED**
- **Status**: Already fully implemented and functional
- **Components**: Complete admin interface with price override capabilities
- **Integration**: Booking dialog shows custom prices, backend calculates with fallbacks
- **Database**: Schema includes per-student pricing fields with toggle

### 📊 **System Status After Fixes**
- ✅ All critical data integrity issues resolved
- ✅ Security vulnerabilities addressed (past booking prevention)
- ✅ User experience enhanced (notifications, consistent styling)
- ✅ Code consistency improved (TRPC standardization)
- ✅ Database relations properly named (PascalCase conventions)

## Previous Major Updates (2025-08-05)

### ✅ **Unified Toast Notification System**
- **Achievement**: Standardized ALL toast notifications across the entire application using Sonner
- **Replaced**: Browser `alert()` and `confirm()` dialogs with beautiful, consistent Sonner toasts
- **Components**: `src/lib/toast-confirmations.ts` with standardized `showDeleteConfirmation()` and `showRemoveConfirmation()`
- **Features**: Centered positioning (`top-center`), high z-index (9999), consistent styling, action/cancel buttons
- **Impact**: 57+ components now use unified toast system, no more jarring browser dialogs

### ✅ **Blocked Dates Management System**
- **New Feature**: Complete blocked dates workflow - create, view, edit, delete
- **Calendar Integration**: Click blocked dates in calendar to view details and delete
- **Creation Interface**: Compact form with date pickers, type selection (Travel/Competition/Other), descriptions
- **Smart Validation**: Prevents time slot creation on blocked dates with informative error toasts
- **Components**: `BlockedDateDialog.tsx`, `WorkingBlockedDatesManager.tsx`
- **Database Integration**: Full CRUD operations with automatic calendar refresh

### ✅ **Compact Time Slot Creation Dialog**
- **UX Revolution**: Redesigned create time slot dialog with 70% size reduction
- **Context-Aware**: Pre-fills date, time, and rink from calendar clicks
- **Smart Defaults**: Auto-calculates 1-hour duration, intelligent form pre-population
- **No Scrolling**: Fits in standard viewport, eliminated large calendar picker
- **Form**: `CompactTimeSlotDialog.tsx` with responsive design and proper validation
- **Impact**: Streamlined workflow from 6+ steps to 3 focused inputs

### ✅ **Button Height Consistency**
- **UI Polish**: Fixed button height inconsistencies in header actions
- **Standardization**: All buttons now use `size="sm"` with consistent spacing and typography
- **Responsive**: Proper icon sizing (`h-3 w-3 sm:h-4 sm:w-4`) and text handling
- **Components**: Updated `DialogComponents.tsx` Bulk Create Slots button
- **Visual Harmony**: Uniform button row with consistent visual weight

### ✅ **Toast Confirmation Standardization**
- **System-wide**: Replaced browser `confirm()` dialogs with centered Sonner confirmations
- **Error Boundary**: Enhanced error reporting with proper toast notifications
- **Calendar Validation**: Blocked date creation attempts show elegant error toasts
- **Consistent Messaging**: Unified language, timing, and styling across all confirmations
- **User Experience**: No more jarring browser dialogs interrupting workflow

## Previous Updates (2025-01-07)

### ✅ **Bulk Delete Functionality**
- **New Feature**: Click-and-drag selection for multiple time slots
- **Components**: BulkActionsToolbar with selection mode toggle
- **Visual Feedback**: Selected slots show blue border and checkbox indicators
- **Safety Features**: Prevents deletion of slots with scheduled lessons
- **API Integration**: Uses existing `deleteBulkTimeSlots` endpoint

### ✅ **Edit Slot Timezone Fix**
- **Fixed Issue**: Edit slot now opens at correct time instead of current time
- **Implementation**: Proper UTC to local timezone conversion using Luxon DateTime
- **File**: `src/features/scheduling/components/forms/TimeSlotForm.tsx`

### ✅ **Break Duration Intervals**
- **Fixed Issue**: Break durations now show proper 5, 10, 15, 20, 25, 30 minute intervals
- **Changed**: `min={1}` to `min={5}` for number inputs in break components

### ✅ **Database Schema Consistency**
- **Critical Fix**: Updated ALL API endpoints and frontend components to use PascalCase relation names
- **Relations**: `User`, `Lesson`, `Student`, `Rink`, `Payment` (not camelCase)
- **Backend**: All TRPC queries and mutations across admin/student features
- **Frontend**: All UI components, hooks, and display logic updated
- **Impact**: Resolves 500 Internal Server Errors and prevents runtime data access issues
- **Files Updated**: 50+ TypeScript files with consistent relation naming

### ✅ **Authentication & Error Handling**
- **Fixed**: React hydration errors and 401 unauthorized notifications
- **Enhanced**: Client-side rendering guards and session checks
- **Improved**: Error boundaries and production environment handling

### ✅ **Mobile Responsiveness & Layout** (2025-01-29)
- **Enhanced**: Mobile responsive design across all major components
- **Improved**: Table responsive patterns with sticky columns and progressive disclosure
- **Updated**: Header layouts, tab systems, and form layouts for mobile
- **Maintained**: Beautiful desktop styling while adding mobile support

## 🚨 CRITICAL: SIDEBAR & LAYOUT ARCHITECTURE (IMMUTABLE)

**⚠️ THE FOLLOWING LAYOUT STANDARDS ARE FINAL AND MUST NEVER BE MODIFIED ⚠️**

### Desktop Layout Structure (DO NOT CHANGE)
```tsx
// AppLayout.tsx - LOCKED ARCHITECTURE
<div className="min-h-screen flex bg-background">
  {/* Sidebar - Fixed width, always visible on desktop */}
  <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
    <AppSidebar role={role} />
  </div>

  {/* Main content area - offset by sidebar width on desktop */}
  <div className="flex-1 lg:pl-64">
    <header className="sticky top-0 z-10 border-b bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 px-4 lg:px-6 py-4">
      <HeaderComponent />
    </header>
    
    <main className="flex-1 p-4 lg:p-6">
      <div className="mx-auto w-full max-w-7xl">
        {children}
      </div>
    </main>
  </div>
</div>
```

### Sidebar Design Standards (IMMUTABLE)
```tsx
// AppSidebar.tsx - LOCKED DESIGN
<div className="w-full h-full bg-white border-r border-gray-200 flex flex-col">
  {/* Header - EXACT height: h-24 for perfect alignment */}
  <div className="h-24 px-6 border-b flex items-center bg-white">
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 shadow-lg">
        {/* YM Movement Logo SVG */}
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-xl text-foreground">YM Movement</span>
        <span className="text-xs text-muted-foreground">Admin Dashboard</span>
      </div>
    </div>
  </div>

  {/* Navigation with locked active state styling */}
  <div className="flex-1 px-4 py-4 bg-white">
    <nav className="space-y-2">
      {/* Active: bg-blue-50 text-blue-700 border-r-2 border-blue-700 */}
      {/* Hover: hover:bg-gray-50 hover:text-gray-900 */}
    </nav>
  </div>
</div>
```

### ABSOLUTE REQUIREMENTS
1. **Sidebar Width**: EXACTLY `w-64` (256px) - NEVER CHANGE
2. **Main Content Offset**: EXACTLY `lg:pl-64` (256px) - NEVER CHANGE  
3. **Header Heights**: Sidebar `h-24`, Main header `py-4` with content - NEVER CHANGE
4. **Header Gradients**: `bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50` - NEVER CHANGE
5. **Border Alignment**: Headers must align perfectly - NEVER CHANGE
6. **Colors**: White sidebar, blue logo gradient, gray borders - NEVER CHANGE
7. **Typography**: Exact font sizes and weights as specified - NEVER CHANGE
8. **Active Navigation**: Blue background with right border - NEVER CHANGE

### FORBIDDEN ACTIONS
- ❌ NEVER use Radix Sidebar system for desktop layout
- ❌ NEVER make sidebar collapsible on desktop  
- ❌ NEVER change sidebar width or main content offset
- ❌ NEVER modify header heights or alignment
- ❌ NEVER change the color scheme or gradients
- ❌ NEVER alter the navigation active state styling
- ❌ NEVER remove fixed positioning for desktop sidebar

**This layout is the final, beautiful design that took significant effort to perfect. It must be preserved exactly as documented.**