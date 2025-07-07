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