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

## Code Style & Standards

- Uses **Biome** for linting and formatting (not ESLint/Prettier)
- Configured for 2-space indentation, 100 character line width
- Double quotes, semicolons required
- TypeScript strict mode enabled
- React 19 with Next.js 15.2.1

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS
- **Backend**: TRPC v11, Prisma ORM, PostgreSQL
- **Auth**: NextAuth.js with role-based access (ADMIN/STUDENT)
- **UI**: Radix UI components, custom design system
- **External**: Google Calendar API integration

### Database Schema (Prisma)
Core entities: User, Student, Lesson, Payment, Rink, RinkTimeSlot, RecurringPattern
- Users have roles (ADMIN/STUDENT) with role-based route protection
- Students require approval before accessing the system
- Lessons connect students to time slots at specific rinks
- Payment tracking with Venmo/Zelle integration
- Google Calendar sync for lesson events

### TRPC API Structure
**Root router** (`src/lib/root.ts`) combines:
- `admin`: Administrative functions (analytics, scheduling, student management)  
- `student`: Student-facing functionality (booking, profile, lessons)
- `notifications`: Notification system
- `passwordReset`: Password reset workflows

**Key admin sub-routers**:
- `schedule`: Complex scheduling system (time slots, lessons, rinks, recurring patterns)
- `student`: Student CRUD, approvals, notes, custom pricing
- `analytics`: Dashboard metrics and reporting
- `payment`: Payment processing and verification

### Authentication & Authorization
- NextAuth.js with custom JWT tokens
- Middleware enforces role-based route access (`middleware.ts`)
- TRPC procedures use `protectedProcedure` for authenticated routes
- Development auth bypass available via `ENABLE_AUTH_BYPASS=true`

### Project Structure
- `src/app/`: Next.js App Router pages and layouts
- `src/features/`: Feature-based organization (admin, student, auth, notifications, scheduling)
- `src/components/ui/`: Reusable UI components (Radix-based)
- `src/lib/`: Core utilities (TRPC, auth, Prisma, date utils, Google Calendar)
- `src/hooks/`: Custom React hooks
- `prisma/`: Database schema and migrations

### Scheduling System
Complex multi-layer system:
- **Rinks**: Physical locations with timezone support
- **RinkTimeSlots**: Available time periods at specific rinks
- **RecurringPatterns**: Template for creating bulk time slots
- **Lessons**: Student bookings assigned to time slots
- **Google Calendar**: Automatic event creation/updates

### Key Features
- Role-based dashboards (admin vs student views)
- Advanced scheduling with conflict detection
- Student approval workflow
- Payment tracking with manual verification
- Google Calendar integration
- Notification system
- Custom pricing per student
- Bulk operations for time slot management

## Development Notes

### Running Tests
No test framework is currently configured. Check if tests are added before running any test commands.

### Database Changes
Always run `pnpm prisma:migrate` after schema changes in `prisma/schema.prisma`.

### Environment Variables
Required for Google Calendar, database, and NextAuth configuration. See README.md for complete list.

### Code Conventions
- Feature-based file organization 
- TRPC procedures grouped by domain
- Consistent error handling with TRPC error codes
- Custom UI components follow Radix patterns
- Date handling uses date-fns library
- Form validation with React Hook Form + Zod