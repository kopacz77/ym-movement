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

## Docker Commands (Recommended)

- **Docker dev environment**: `pnpm docker:dev` (includes hot reload)
- **Docker production**: `pnpm docker:up` 
- **Stop containers**: `pnpm docker:down`
- **View logs**: `pnpm docker:logs`
- **Clean up**: `pnpm docker:clean`

## Documentation Commands

- **Documentation server**: `pnpm docs:dev` (serves at localhost:3001)
- **Documentation with auto-open**: `pnpm docs:serve`
- **Documentation preview**: `pnpm docs:preview`

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
- **Bulk operations**: Optimized bulk time slot creation with templates, real-time validation, and bulk delete with selection
- **Enhanced editing**: Edit time slots with proper timezone handling and accurate time display
- **Student management**: Approval workflow, custom pricing, lesson tracking
- **Payment tracking**: Venmo/Zelle integration with manual verification
- **Google Calendar sync**: Automatic event creation/updates
- **Notification system**: Real-time updates and alerts with authentication guards

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

## Recent Major Updates (2025-01-07)

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