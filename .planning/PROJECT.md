# YM Movement Multi-Coach Platform

## What This Is

YM Movement is a multi-coach ice dance lesson scheduling platform for coach Yura Min. It supports SUPER_ADMIN, COACH, and STUDENT roles. Coaches have dedicated dashboards to manage availability, view students, and track earnings. Students browse and book lessons by coach. The super admin (Yura) manages the coaching operation including onboarding, scheduling oversight, and revenue splits, while also coaching her own students.

## Current Milestone: v1.1 Test & Stabilize

**Goal:** Write comprehensive E2E tests for all v1.0 multi-coach features, update existing tests for the new role system, and fix any bugs discovered — making v1.0 production-ready.

**Shipped:** v1.0 Multi-Coach (2026-03-16)

The platform is a fully functional multi-coach marketplace. All 26 v1 requirements are satisfied across auth, coach management, coach dashboard, scheduling, student booking, super admin oversight, and integrations. No automated tests exist for multi-coach features.

**Codebase:** ~64,864 lines TypeScript across 194+ modified files
**Test suite:** 13 E2E test files (~5,000 lines) covering pre-multi-coach features only

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
- ✓ SUPER_ADMIN/COACH/STUDENT role hierarchy with route guards and TRPC middleware — v1.0
- ✓ Coach self-registration with admin approval queue — v1.0
- ✓ Coach profile system (bio, skills, rates, certifications) — v1.0
- ✓ Coach dashboard (schedule, students, earnings, proposals) — v1.0
- ✓ Per-coach time slot ownership and conflict detection — v1.0
- ✓ Student browse-by-coach booking flow — v1.0
- ✓ Per-coach Google Calendar OAuth integration — v1.0
- ✓ Configurable revenue splits with payout reports — v1.0
- ✓ Super admin cross-coach visibility and management — v1.0
- ✓ Dual-role navigation (super admin + coach) — v1.0
- ✓ Data migration (existing data associated with Yura as coach) — v1.0
- ✓ Per-coach data isolation (179+ queries scoped) — v1.0
- ✓ Coach notifications (booking, cancellation, payment, revenue split changes) — v1.0
- ✓ Coach account lifecycle (create, approve, suspend, activate, deactivate) — v1.0

### Active

- [ ] E2E tests for coach onboarding flow (self-registration, admin approval/denial, manual creation)
- [ ] E2E tests for coach dashboard (schedule view, students list, earnings summary, profile edit)
- [ ] E2E tests for student browse-by-coach booking flow (coach browse, selection, calendar, booking)
- [ ] E2E tests for revenue splits and payout reports (inline editor, payout calculations, CSV export)
- [ ] E2E tests for per-coach scheduling (conflict detection, blocked dates, time slot proposals)
- [ ] E2E tests for data isolation (coach A cannot see coach B's data, role guard enforcement)
- [ ] E2E tests for dual-role navigation (admin ↔ coach switching)
- [ ] Update 13 existing E2E test files for SUPER_ADMIN role system (backward compatibility)
- [ ] Test data seeding infrastructure (coach accounts, multi-coach test scenarios)
- [ ] Bug fixes for issues discovered during testing

### Out of Scope

- Mobile native app — web-first, responsive design sufficient
- Real-time chat between coaches and students — use existing notification system
- Automated payout processing (Stripe/PayPal) — track amounts owed, pay outside app
- Coach-to-coach messaging — communicate outside the platform
- Student reviews/ratings of coaches — defer to future version
- Multi-location/franchise support — single organization (YM Movement)

## Context

- **Existing codebase**: Next.js 15 + React 19 + TypeScript + TRPC v11 + Prisma + PostgreSQL (Neon)
- **Auth**: NextAuth.js with SUPER_ADMIN, COACH, and STUDENT roles
- **Database**: Prisma ORM with User, Student, Lesson, Payment, Rink, RinkTimeSlot, Coach, CoachStudent, ProposedTimeSlot, and more
- **Calendar**: Per-coach Google Calendar OAuth with AES-256-GCM encrypted token storage
- **UI**: Tailwind CSS + Radix UI + shadcn/ui components, fixed sidebar layout architecture
- **Deployment**: Production on Vercel with Neon PostgreSQL
- **The admin (Yura) is also the product owner** — she coaches while managing other coaches

## Constraints

- **Tech stack**: Must extend existing Next.js/TRPC/Prisma stack — no rewrites
- **Backward compatibility**: All existing student and admin functionality must continue working
- **Layout architecture**: Sidebar and layout system is locked per CLAUDE.md — new features must follow same patterns
- **Biome**: All code must pass Biome linting (not ESLint)
- **Prisma relations**: Must use PascalCase relation names per project convention

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Add COACH and SUPER_ADMIN roles (not reuse ADMIN) | Clean separation of concerns, existing ADMIN behavior preserved during migration | ✓ Shipped v1.0 |
| Coaches self-manage availability with super admin override | Balances coach autonomy with platform control | ✓ Shipped v1.0 |
| Students browse by coach (not by discipline/unified calendar) | Simpler UX, coach-centric relationship model | ✓ Shipped v1.0 |
| Per-coach negotiated revenue splits | Flexibility for different coach arrangements | ✓ Shipped v1.0 |
| Per-coach Google Calendar (not master calendar) | Each coach owns their schedule, simpler OAuth | ✓ Shipped v1.0 |
| Shared rink pool managed by super admin | Centralized venue management, coaches pick from existing rinks | ✓ Shipped v1.0 |
| Yura is both super admin and coach | Preserves existing coaching relationship, dog-foods the coach experience | ✓ Shipped v1.0 |
| Playwright E2E for test coverage (not unit tests) | E2E tests verify real user flows, existing infra is mature | — Pending |
| Extend existing test helpers (not rewrite) | test-utils.ts has proven patterns for auth, booking, etc. | — Pending |

---
*Last updated: 2026-03-16 after v1.1 milestone start*
