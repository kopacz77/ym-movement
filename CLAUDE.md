# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Dev server**: `pnpm dev` or `npm run dev` 
- **Build**: `pnpm build` or `npm run build`
- **Type checking**: `pnpm type-check` or `npm run type-check`
- **Linting**: `pnpm lint` or `npm run lint`
- **Format code**: `pnpm format` or `npm run format`
- **Auto-fix lint issues**: `pnpm lint:fix` or `npm run lint:fix`
- **Database migrations**: `pnpm prisma:migrate` or `npm run prisma:migrate`

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

**Playwright MCP Server**: Configured for automated browser testing and web automation.

**Current Setup Status**: ✅ **CONFIGURED AND CONNECTED**
- Server: `@executeautomation/playwright-mcp-server`
- Status: Connected (verified with `claude mcp list`)
- Added with: `claude mcp add playwright npx @executeautomation/playwright-mcp-server`

**Available Testing Capabilities**:
- Browser automation for end-to-end testing
- Web page navigation and form interaction
- Screenshot capture and visual testing
- Data extraction from web pages
- Automated testing of signup/login flows
- Performance and accessibility testing

**Usage**: Essential for comprehensive testing of the YM Movement application, particularly for testing the student signup flow, admin dashboard functionality, and cross-browser compatibility.

## Docker Commands (Recommended)

- **Docker dev environment**: `pnpm docker:dev` (includes hot reload)
- **Docker production**: `pnpm docker:up` 
- **Stop containers**: `pnpm docker:down`
- **View logs**: `pnpm docker:logs`
- **Clean up**: `pnpm docker:clean`

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

## Key Features

- **Role-based dashboards**: Separate admin and student interfaces
- **Advanced scheduling**: Time slot management with conflict detection and timezone support
- **Blocked dates management**: Create and manage blocked periods (travel, competitions) with calendar integration
- **Bulk operations**: Optimized bulk time slot creation with templates, real-time validation, and bulk delete with selection
- **Enhanced editing**: Edit time slots with proper timezone handling and accurate time display
- **Compact time slot creation**: Context-aware dialog with smart defaults and no scrolling required
- **Student management**: Approval workflow, custom pricing, lesson tracking
- **Payment tracking**: Venmo/Zelle integration with manual verification
- **Google Calendar sync**: Automatic event creation/updates
- **Unified notifications**: Sonner toast system with consistent styling and centered positioning

## Code Standards

- **Biome** for linting/formatting (not ESLint/Prettier)
- 2-space indentation, 100 character line width, double quotes
- TypeScript strict mode, React Hook Form + Zod validation
- Feature-based organization, custom UI components follow Radix patterns
- Date handling with date-fns library

## Development Notes

- No test framework configured
- Always run `pnpm prisma:migrate` after schema changes
- Development auth bypass: `ENABLE_AUTH_BYPASS=true`
- Environment variables required for Google Calendar, database, NextAuth
- **IMPORTANT**: Prisma relation names use PascalCase (e.g., `User`, `Lesson`, `Student`, `Rink`) - always use these in includes and access patterns

## Recent Major Updates (2025-08-07)

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