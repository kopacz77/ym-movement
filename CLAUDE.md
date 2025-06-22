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
- **Advanced scheduling**: Time slot management with conflict detection
- **Bulk operations**: Optimized bulk time slot creation with templates and real-time validation
- **Student management**: Approval workflow, custom pricing, lesson tracking
- **Payment tracking**: Venmo/Zelle integration with manual verification
- **Google Calendar sync**: Automatic event creation/updates
- **Notification system**: Real-time updates and alerts

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