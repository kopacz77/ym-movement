# CLAUDE.md

Guidance for Claude Code when working in this repo. Keep this file under 200 lines — historical changelog material belongs in git, not here.

## Development Commands

- **Dev server**: `pnpm dev` (port **3100**)
- **Build**: `pnpm build`
- **Type check**: `pnpm type-check`
- **Lint / format / auto-fix**: `pnpm lint` / `pnpm format` / `pnpm lint:fix` (Biome, not ESLint)
- **DB migration (safe)**: `pnpm prisma:migrate` — wraps `prisma migrate deploy`
- **E2E tests**: `pnpm test:e2e` (Playwright; `:ui`, `:headed`, `:debug`, `:report` variants available)
- **Pre-migration safety check**: `pnpm db:check` — prints row counts for critical tables

## Production Deployment

**Hosting**: Vercel (manual CLI deploys, not GitHub-connected)
**Vercel project**: `ym-movement` (a previous `ym-movement-v2` project was consolidated/deleted on 2026-04-21)
**Domain**: `ym-movement.com`
**Runtime**: Node.js 24.x, Next.js 16.x with Turbopack

### Deploy flow
1. `pnpm build` locally first to verify (TS validation worker may SIGKILL on WSL — ignore if "Compiled successfully" appears; Vercel has more memory)
2. `npx vercel deploy --prod --yes`
3. If the domain alias drifts, re-point: `npx vercel alias set <deployment-url> ym-movement.com`
4. Verify: `npx vercel inspect ym-movement.com` — the `name` field should equal `ym-movement`

Env vars live in Vercel project settings. `.env` files are local-only. Auth token at `~/.local/share/com.vercel.cli/auth.json`.

### Middleware constraint
`src/middleware.ts` checks for session cookie *existence only* — it does NOT decrypt the JWT. This is intentional: `getToken()` from `next-auth/jwt` is incompatible with Edge Runtime in next-auth v5 beta (JWE decryption fails). Role-based access is enforced by server components (`auth()`) and the TRPC layer.

## Tech Stack & Structure

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript strict, Tailwind, Radix UI
- **Backend**: TRPC v11, Prisma ORM, PostgreSQL (Neon), NextAuth v5 beta
- **External**: Resend (email, sender `info@ym-movement.com`), Google Calendar API
- **Roles**: SUPER_ADMIN > ADMIN > COACH > STUDENT (see `src/lib/roles.ts`)

```
src/app/        — App Router pages/layouts
src/features/   — Feature modules (admin, student, coach, auth, notifications, scheduling)
src/components/ — Shared UI (Radix-based primitives in components/ui/)
src/lib/        — Core utilities (trpc, auth, prisma, email, date-fns)
src/hooks/      — Custom hooks
prisma/         — Schema + migrations
```

## Code Standards

- Biome for lint/format: 2-space indent, 100-char width, double quotes
- React Hook Form + Zod for validation
- date-fns for date handling (Luxon in select places for timezone-critical logic)
- **Prisma relations are PascalCase** (`User`, `Lesson`, `Student`, `Rink`, `Payment`) — always use these in includes and access patterns. camelCase like `student.user` will silently return undefined.
- **Radix `DropdownMenuItem` hover**: use `focus:` (not `hover:`) for highlight overrides. Radix manages highlight via focus. Example: `className="text-red-600 focus:text-red-700 focus:bg-red-50"`. `hover:` still works on plain `Button`.
- **Always run `pnpm prisma:migrate` (which maps to `migrate deploy`) after schema changes** — never `migrate dev`.

## 🚨 ABSOLUTE PROHIBITION: Destructive Database Commands

Production data was wiped once (2026-04-05, `prisma migrate reset` during a dependency update) — 1,025 time slots, 871 lessons, 871 payments gone. Recovered via Neon PITR. Never again.

**FORBIDDEN (never run unless user explicitly asks with direct intent):**
- `prisma migrate reset` — drops all tables
- `prisma db push --force-reset` — destroys data
- `prisma migrate dev` — can reset on divergence; use `migrate deploy` instead
- `DELETE FROM` without a specific `WHERE`
- `TRUNCATE`, `DROP TABLE`
- Any bulk delete that could affect more than a handful of rows

**SAFE:** `prisma generate`, `prisma migrate deploy`, `prisma db pull`, `prisma studio`.

Before any DB-touching command: verify it's on the safe list above. Before `pnpm install` or dependency updates: check that no postinstall script runs destructive Prisma commands. When uncertain: ask first.

## Neon Backup & Recovery

Neon supports scheduled snapshots via the dashboard — no external tooling needed.

**One-time setup**: Neon Console → project → Branches → production branch → Backup schedule → Daily, 30-day retention.

**Data integrity endpoint**: `GET /api/health/data` — returns row counts for critical tables.

**If data is accidentally deleted**:
1. STOP — do not run any more migrations or commands
2. Neon Console → Branches → Point-in-Time Restore to a timestamp before the incident
3. Verify with `pnpm db:check`

## 🚨 TimeSlotDialog Data Flow (IMMUTABLE)

Data chain: `timeSlotQueries.ts` → `useTimeSlots` → `useCalendarEvents` → `ScheduleManager.handleSelectEvent` → **`TimeSlotDialogAdapter.castToLessons()`** → `TimeSlotDialog`.

The adapter at `src/features/admin/components/scheduling/TimeSlotDialogAdapter.tsx`, function `castToLessons()` (lines ~58-91), MUST preserve every Lesson field — `id`, `type`, `price`, `status`, `notes`, `Student.id`, `Student.User.name`. Dropping any of them silently corrupts the UI (price shows $0.00, type shows "Unknown"). Never return partial objects; never mark the fields optional in the interface.

After any edit to that file: click a time slot with an assigned student and verify the assigned-students card shows correct price, lesson type badge, and student name, and that "Edit Lesson Type" opens with the right current price.

Related files: `TimeSlotDialog.tsx`, `ScheduleManager.tsx`, `timeSlotQueries.ts`, `calendarUtils.ts`.

## 🚨 Sidebar & Layout Architecture (IMMUTABLE)

This layout took significant effort to perfect. **Never modify it** without explicit user direction.

```tsx
// AppLayout.tsx — LOCKED
<div className="min-h-screen flex bg-background">
  <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
    <AppSidebar role={role} />
  </div>
  <div className="flex-1 lg:pl-64">
    <header className="sticky top-0 z-10 border-b bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 px-4 lg:px-6 py-4">
      <HeaderComponent />
    </header>
    <main className="flex-1 p-4 lg:p-6">
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </main>
  </div>
</div>
```

**Hard requirements (do not change):**
- Sidebar width: `w-64` (256px)
- Main content offset: `lg:pl-64`
- Sidebar header height: `h-24`; main header: `py-4`
- Header gradient: `bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50`
- Sidebar: white background, blue logo gradient, gray borders
- Active nav item: `bg-blue-50 text-blue-700 border-r-2 border-blue-700`
- Sidebar is fixed and always-visible on desktop — never collapsible, never using Radix Sidebar
