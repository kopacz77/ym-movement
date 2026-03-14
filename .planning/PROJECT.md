# YM Movement Multi-Coach Platform

## What This Is

YM Movement is an existing ice dance lesson scheduling platform built for coach Yura Min. It currently supports a single-coach model with admin and student roles. This project evolves it into a multi-coach marketplace where Yura becomes a "super admin" who manages a roster of coaches across multiple disciplines (ice dance, dry land dance, off-ice conditioning, etc.), while also continuing to coach her own students. Coaches get their own dashboards to manage availability, view students, and track earnings. Students browse and book by coach.

## Core Value

Students can discover, browse, and book lessons from multiple coaches across different disciplines, while the super admin maintains full visibility and control over the entire coaching operation including revenue splits and payouts.

## Requirements

### Validated

- ✓ Student signup with email/password and admin approval — existing
- ✓ Role-based dashboards (admin/student) — existing
- ✓ Time slot management with conflict detection — existing
- ✓ Lesson booking with automatic payment creation — existing
- ✓ Lesson type management (Private, Choreography, Group, Competition Prep) — existing
- ✓ Payment tracking with Venmo/Zelle/Cash and manual verification — existing
- ✓ Google Calendar sync for lesson events — existing
- ✓ Student self-service lesson cancellation with 24-hour policy — existing
- ✓ Notification system (in-app + email) — existing
- ✓ Revenue and attendance reports — existing
- ✓ Blocked dates management (travel, competitions) — existing
- ✓ Rink/venue management — existing
- ✓ Student guide and admin guide pages — existing
- ✓ Lesson policies (public + student-facing) — existing

### Active

- [ ] New COACH role with dedicated dashboard (schedule, students, earnings)
- [ ] Coach self-registration flow (signup, profile creation, submit for approval)
- [ ] Super admin coach invitation/manual creation
- [ ] Coach approval queue for super admin
- [ ] Coach profile system (bio, photo, skills/disciplines, rates, certifications/experience)
- [ ] Coach availability management (propose time slots, super admin approve/override)
- [ ] Per-coach revenue split configuration (negotiated individually)
- [ ] Student browse-by-coach booking flow
- [ ] Per-coach Google Calendar integration (each coach connects own calendar)
- [ ] Super admin coaches overview dashboard (all coaches, hours, earnings, status)
- [ ] Super admin cross-coach schedule visibility
- [ ] Super admin revenue reports with per-coach breakdowns and payout tracking
- [ ] Yura dual-role support (super admin + active coach with own students)
- [ ] Existing data migration (current lessons/students assigned to Yura as coach)

### Out of Scope

- Mobile native app — web-first, responsive design sufficient
- Real-time chat between coaches and students — use existing notification system
- Automated payout processing (Stripe/PayPal) — track amounts owed, pay outside app
- Coach-to-coach messaging — communicate outside the platform
- Student reviews/ratings of coaches — defer to future version
- Multi-location/franchise support — single organization (YM Movement)

## Context

- **Existing codebase**: Next.js 15 + React 19 + TypeScript + TRPC v11 + Prisma + PostgreSQL (Neon)
- **Auth**: NextAuth.js with currently two roles (ADMIN, STUDENT) — needs COACH and SUPER_ADMIN roles
- **Database**: Prisma ORM with existing User, Student, Lesson, Payment, Rink, RinkTimeSlot, RecurringPattern entities
- **Calendar**: Google Calendar API integration currently tied to a single admin account
- **UI**: Tailwind CSS + Radix UI + shadcn/ui components, fixed sidebar layout architecture
- **Current state**: 28 pages (8 public, 5 auth, 10 admin, 10 student), 324 source files, 0 TS errors, 0 lint issues
- **Deployment**: Production on Vercel with Neon PostgreSQL
- **The admin (Yura) is also the product owner** — she will continue coaching while managing other coaches

## Constraints

- **Tech stack**: Must extend existing Next.js/TRPC/Prisma stack — no rewrites
- **Backward compatibility**: All existing student and admin functionality must continue working
- **Database**: Must migrate existing data (lessons, students, payments) to associate with Yura as coach
- **Layout architecture**: Sidebar and layout system is locked per CLAUDE.md — new coach dashboard must follow same patterns
- **Google Calendar**: Per-coach calendar integration requires OAuth flow for each coach
- **Biome**: All code must pass Biome linting (not ESLint)
- **Prisma relations**: Must use PascalCase relation names per project convention

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Add COACH and SUPER_ADMIN roles (not reuse ADMIN) | Clean separation of concerns, existing ADMIN behavior preserved during migration | — Pending |
| Coaches self-manage availability with super admin override | Balances coach autonomy with platform control | — Pending |
| Students browse by coach (not by discipline/unified calendar) | Simpler UX, coach-centric relationship model | — Pending |
| Per-coach negotiated revenue splits | Flexibility for different coach arrangements | — Pending |
| Per-coach Google Calendar (not master calendar) | Each coach owns their schedule, simpler OAuth | — Pending |
| Shared rink pool managed by super admin | Centralized venue management, coaches pick from existing rinks | — Pending |
| Yura is both super admin and coach | Preserves existing coaching relationship, dog-foods the coach experience | — Pending |

---
*Last updated: 2026-03-14 after initialization*
