# Project Research Summary

**Project:** Yura Scheduler v3 -- Multi-Coach Milestone
**Domain:** Multi-coach ice skating/dance lesson scheduling platform
**Researched:** 2026-03-14
**Confidence:** HIGH

## Executive Summary

YM Movement is an existing, production single-coach scheduling platform for ice dance lessons built on Next.js 15, TRPC v11, Prisma 6, and PostgreSQL (Neon). The multi-coach milestone extends it from a personal coaching tool into a multi-instructor marketplace where multiple coaches manage their own schedules, students, and earnings under a platform owner (Yura) who is simultaneously a super admin and an active coach. The recommended approach is an **additive extension** of the existing architecture -- no framework migrations, no new npm dependencies, no rewrites. Every technology needed is already installed. The work is fundamentally a schema and authorization refactoring, not a technology change.

The single most important architectural decision is data isolation: the codebase has 179 unscoped database queries across 13 admin query files that currently return ALL data globally. Adding `coachId` columns without simultaneously scoping these queries will leak data between coaches. The second critical decision is modeling the student-coach relationship as many-to-many (via a `CoachStudent` junction table), not one-to-one, because ice skating students commonly train with multiple coaches for different disciplines. Getting either of these wrong requires a costly second migration.

The key risks are: (1) JWT sessions containing stale role values after the ADMIN-to-SUPER_ADMIN migration, locking Yura out of production; (2) Google Calendar's singleton architecture becoming a bottleneck when multiple coaches need per-user OAuth; and (3) the sheer number of queries that need coach-scoping auditing. All three are well-understood and have concrete prevention strategies. The overall risk profile is manageable because the existing codebase is well-structured, the stack requires zero changes, and the migration can be phased incrementally with rollback safety at each step.

## Key Findings

### Recommended Stack

No new npm packages are required. The entire multi-coach extension uses libraries already installed and in production. This is a significant advantage -- zero dependency risk.

**Core technologies (unchanged):**
- **NextAuth.js v4** (keep, do not migrate to Auth.js v5/Better Auth) -- ecosystem is in flux post-merger; migration risk for zero benefit
- **TRPC v11 middleware** (extend existing pattern) -- add `coachProcedure`, `superAdminProcedure`; no external RBAC library needed (CASL and trpc-shield are overkill for 4 roles)
- **Prisma Client Extensions** (new usage) -- automatic `coachId` filtering via `$extends()` query wrappers; replaces PostgreSQL RLS (which has recent CVEs and breaks Prisma type safety on Neon)
- **Node.js built-in `crypto`** (new usage) -- AES-256-GCM encryption for OAuth tokens at rest; `prisma-field-encryption` is incompatible with Prisma 6.19+
- **googleapis OAuth2Client** (new usage pattern) -- per-coach OAuth replacing the current service account singleton; already installed at v150.0.1

**New environment variables needed:**
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` (web app OAuth, distinct from existing service account)
- `TOKEN_ENCRYPTION_KEY` (32-byte hex for token encryption)

### Expected Features

**Must have (table stakes) -- ordered by dependency:**
1. Coach Role and Basic Dashboard -- foundation; cannot do anything without coaches in the system
2. Coach Onboarding (admin invitation flow) -- mechanism for adding coaches
3. Coach Profile (bio, specialties, rates, certifications) -- students need to evaluate coaches
4. Per-Coach Availability Management -- highest complexity; fundamentally changes how time slots work (from rink-global to rink+coach scoped)
5. Coach-Scoped Lesson Assignment -- lessons attributed to the teaching coach
6. Student Browse-and-Book by Coach -- coach selection pre-step in booking flow
7. Per-Coach Google Calendar Sync -- each coach connects their own Google account via OAuth
8. Super Admin Cross-Coach Dashboard -- Yura sees all coaches' schedules, students, revenue
9. Per-Coach Revenue Tracking -- payment attribution, coach earnings view
10. Role-Based Permissions -- coach data isolation at middleware and query level

**Should have (differentiators):**
- Revenue Split Configuration (per-coach, per-lesson-type splits) -- more flexible than Mindbody/Vagaro
- Dual-Role Owner Support (Yura as admin + active coach) -- rare in scheduling platforms
- Rink-Aware Multi-Coach Scheduling (cross-coach capacity enforcement) -- leverages existing rink infrastructure

**Defer (post-MVP):**
- Skill-Based Coach Matching -- simple filters suffice initially
- Coach-Student Relationship History -- lesson history is already queryable
- Competition/Travel Coordination -- blocked dates already work per-user
- Coach Self-Registration -- admin invitation covers initial rollout

**Anti-features (explicitly do NOT build):**
- Automated payroll processing
- In-app chat/messaging
- Multi-tenant/multi-organization architecture
- Online payment processing (Stripe/Square)
- Round-robin auto-assignment
- Student self-service coach switching
- Coach-set pricing without admin approval

### Architecture Approach

The architecture follows an **additive extension** pattern: a new `Coach` entity parallel to `Student` (both linked to `User`), `coachId` foreign keys on existing tables, new TRPC router namespaces alongside existing ones, and extended middleware for new roles. The existing admin routes remain functional during migration. The coach dashboard reuses the locked AppLayout/AppSidebar patterns with a new `role="coach"` option.

**Major components:**
1. **Coach entity** -- profile, skills, rates, OAuth tokens; parallel to Student entity
2. **CoachStudent junction** -- many-to-many relationship with per-pair metadata and pricing
3. **TRPC coach/superAdmin routers** -- new namespaces alongside existing admin/student routers
4. **Coach-scoped Prisma extensions** -- automatic coachId filtering via `$extends()`; injected at TRPC context level
5. **Per-coach Google Calendar** -- OAuth2Client factory replacing singleton service account; token refresh via googleapis library
6. **Pricing waterfall** -- student custom pricing > coach pricing > global defaults > hardcoded fallback
7. **Revenue split tracking** -- simple `coachEarnings`/`platformFee` fields on Payment, not a double-entry ledger

### Critical Pitfalls

1. **Unscoped queries leak data between coaches** -- 179 queries across 13 files have no coachId filter; build a `coachScopedProcedure` middleware and audit every query file systematically. Deploy scoping WITH the schema change, never separately.

2. **JWT sessions contain stale roles after migration** -- role is set once at login and cached for 7 days; update middleware to accept BOTH `ADMIN` and `SUPER_ADMIN` BEFORE the database migration. Add periodic role refresh in the JWT callback.

3. **Existing production data has no coach association** -- add coachId as NULLABLE first, run a tested backfill script (all existing data to Yura), verify with `COUNT(*) WHERE coachId IS NULL = 0`, then optionally add NOT NULL constraint in a separate migration.

4. **Student-coach relationship is many-to-many, not one-to-one** -- use a `CoachStudent` junction table; scope ownership at the lesson level, not the student level. A student training with multiple coaches must retain history with all of them.

5. **Google Calendar singleton cannot serve multiple coaches** -- refactor from singleton to factory pattern (`getCalendarForCoach(coachId)`); make calendar integration optional per coach with graceful degradation. Defer this to a later phase since the existing integration still works for Yura.

## Implications for Roadmap

Based on combined research, here is the suggested phase structure. The ordering is driven by two principles: (1) database and auth changes must come first because everything depends on them, and (2) the coach experience should be buildable independently of student-facing changes.

### Phase 1: Auth and Database Foundation
**Rationale:** Every subsequent phase depends on the Coach model existing and auth middleware accepting new roles. This is non-negotiable as the first phase. Deploying auth changes before schema changes prevents the JWT stale-role lockout (CRITICAL-2).
**Delivers:** Coach/CoachStudent database models, coachId columns on Lesson/RinkTimeSlot/BlockedDateRange, Role enum expansion (SUPER_ADMIN, COACH), TRPC middleware (coachProcedure, superAdminProcedure), data backfill (all existing data assigned to Yura), token encryption utility.
**Addresses:** Table Stakes #1 (Coach Role foundation), #10 (Role-Based Permissions foundation)
**Avoids:** CRITICAL-2 (stale JWT), CRITICAL-4 (migration failure), CRITICAL-5 (wrong relationship model)

### Phase 2: Coach Dashboard and Profile
**Rationale:** Once coaches exist in the database, they need a place to land. The coach dashboard reuses existing admin patterns (ScheduleManager, student lists) scoped to the authenticated coach. This phase can be developed in parallel with Phase 3.
**Delivers:** Coach route group (`/coach/*`), coach layout and sidebar, coach dashboard (schedule, students, earnings read-only), coach profile editing (bio, specialties, rates), coach onboarding (admin invitation flow).
**Addresses:** Table Stakes #1 (Coach Dashboard), #2 (Coach Onboarding), #3 (Coach Profile)
**Avoids:** MODERATE-5 (frontend route structure); uses shared components with permission-based rendering

### Phase 3: Query Scoping and Super Admin
**Rationale:** With coaches in the system, data isolation becomes urgent. All 179 queries must be scoped before a second coach is added. The super admin dashboard extends existing admin views with coach filters. Can be developed in parallel with Phase 2.
**Delivers:** Coach-scoped query layer (Prisma Client Extensions or middleware-injected coachId), scoped notifications (to lesson's coach, not all admins), super admin coach management pages (list, approve, deactivate, set revenue splits), cross-coach schedule visibility.
**Addresses:** Table Stakes #8 (Super Admin Dashboard), #10 (Permissions enforcement)
**Avoids:** CRITICAL-1 (data leaks), MODERATE-1 (auth spaghetti), MODERATE-4 (notification broadcasting)

### Phase 4: Per-Coach Scheduling
**Rationale:** This is the highest-complexity feature and the core value proposition. Time slots become coach-scoped, availability management becomes per-coach, and overlap detection must account for coach boundaries. Depends on Phases 1-3 being complete.
**Delivers:** Per-coach time slot creation and management, coach-scoped blocked dates, updated overlap detection (cross-coach slots allowed at same rink), per-coach availability queries.
**Addresses:** Table Stakes #4 (Per-Coach Availability), #5 (Coach-Scoped Lessons)
**Avoids:** MINOR-1 (overlap detection), MINOR-3 (blocked date scoping)

### Phase 5: Student Multi-Coach Booking
**Rationale:** Once coaches have their own schedules, students need a way to discover and book with them. Adds a coach selection step before the existing slot selection flow. The existing booking confirmation flow stays largely the same.
**Delivers:** Coach browsing page (profiles, skills, rates), coach-specific availability view, updated booking mutation (coachId derived from slot), coach name display on student dashboard/schedule.
**Addresses:** Table Stakes #6 (Student Browse-and-Book)
**Avoids:** Anti-Pattern 5 from ARCHITECTURE.md (rewriting the booking flow)

### Phase 6: Per-Coach Google Calendar
**Rationale:** Calendar integration is important but the existing service account continues to work for Yura during development. This is a complex OAuth flow that should not block core scheduling features.
**Delivers:** OAuth connection flow in coach settings, per-coach token storage with AES-256-GCM encryption, per-coach event creation/update/delete, token refresh handling, fallback to service account if no OAuth.
**Addresses:** Table Stakes #7 (Per-Coach Google Calendar Sync)
**Avoids:** CRITICAL-3 (calendar singleton); uses factory pattern with graceful degradation

### Phase 7: Revenue, Splits, and Polish
**Rationale:** Revenue tracking is a reporting feature, not a transactional one. It requires coaching agreements to be defined (split percentages) and lessons with coachId to exist. This is the final functional phase.
**Delivers:** Payment attribution to coaches, pricing waterfall (student > coach > default), revenue split configuration per coach, payout reports, dual-role owner support (Yura as admin+coach), coach earnings dashboard.
**Addresses:** Table Stakes #9 (Revenue Tracking), Differentiators #1 (Revenue Splits), #2 (Dual-Role Owner)
**Avoids:** MODERATE-3 (over-engineering revenue as payment processing); keeps manual Venmo/Zelle flow

### Phase Ordering Rationale

- **Auth before schema** because deploying middleware that accepts new roles before the database adds them is a no-op (safe), but deploying schema changes before middleware accepts them locks users out (CRITICAL-2).
- **Query scoping before adding a second coach** because the 179 unscoped queries are the largest attack surface for data leaks (CRITICAL-1). A second coach should never see data from the first.
- **Scheduling before student booking** because coaches must have slots before students can book them. The booking flow change is minimal (add a coach selection pre-step).
- **Calendar after core scheduling** because the existing service account still works for Yura. Per-coach OAuth is complex and should not block the core multi-coach value.
- **Revenue last** because it is a reporting concern, not a scheduling concern. Manual payment tracking continues to work during development.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Auth/Database):** Needs careful migration script testing against production data clone. The backfill script and JWT role refresh logic should be validated in staging. Research the exact Prisma migration steps for adding nullable columns then adding NOT NULL constraints.
- **Phase 4 (Per-Coach Scheduling):** Highest complexity. Multi-coach overlap detection, rink capacity enforcement across coaches, and recurring pattern scoping need design spikes.
- **Phase 6 (Google Calendar OAuth):** The OAuth consent screen configuration, token refresh edge cases, and Google API quota management per coach need specific API research. Google only provides refresh tokens on first authorization -- this flow must be handled correctly.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Coach Dashboard):** Direct adaptation of existing admin dashboard patterns. Well-understood CRUD operations with role-based rendering.
- **Phase 3 (Query Scoping):** Prisma Client Extensions are well-documented. The work is tedious (179 queries) but mechanically straightforward.
- **Phase 5 (Student Booking):** Adding a pre-step to an existing booking flow. Standard UI pattern (browse > select > book).
- **Phase 7 (Revenue):** Simple Prisma models and aggregation queries. No external payment integration.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies; all recommendations use installed, production-proven libraries. Official docs verified for NextAuth v4, Prisma Extensions, googleapis OAuth2Client. |
| Features | MEDIUM-HIGH | Cross-referenced across Mindbody, Acuity, SimplyBook, Vagaro, WellnessLiving, and ice rink platforms. Feature ordering derived from dependency analysis. |
| Architecture | HIGH | Based on thorough codebase analysis -- every query file, middleware, schema model, and route structure was directly read. Patterns are additive extensions of existing code. |
| Pitfalls | HIGH | All 5 critical pitfalls verified by direct code reading with line numbers. Query count (179) was empirically determined. JWT behavior confirmed from auth.ts source. |

**Overall confidence:** HIGH

### Gaps to Address

- **Prisma Client Extensions completeness:** The `$extends()` approach must cover ALL query methods (findMany, findFirst, findUnique, create, update, delete, count, aggregate, groupBy) for ALL coach-scoped models. Missing one method is a data leak. Needs thorough integration testing. Confidence on this specific technique is MEDIUM.

- **Google OAuth consent screen:** Moving from service account to user OAuth requires Google Cloud project configuration. Unverified apps show a warning screen. For a small coaching business this is acceptable, but Google verification takes 4-6 weeks if needed for broader deployment.

- **ADMIN to SUPER_ADMIN migration path:** The exact sequence of deploying auth changes, running the data migration, and managing the transition window needs a detailed runbook. The strategy is sound but the execution order is critical -- test in staging first.

- **googleapis version gap:** Currently at v150.0.1, latest is v171.4.0. Consider upgrading in a separate PR before starting multi-coach work to avoid conflating dependency upgrades with feature changes.

- **Per-coach custom pricing vs. per-student custom pricing:** The pricing waterfall (student > coach > default) is clear in theory, but the interaction between the existing `Student.customPricingEnabled` field and the new `CoachStudent` pricing fields needs careful design during Phase 4/5 implementation.

- **trpc.ts and trpc-optimized.ts duplication:** Two files define middleware. This must be consolidated before adding new middleware to avoid authorization bypass through the wrong import.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: all 13 admin query files, `prisma/schema.prisma`, `src/lib/auth.ts`, `src/lib/trpc.ts`, `src/lib/google/calendar.ts`, `middleware.ts`, full route structure
- [NextAuth.js v4 Documentation](https://next-auth.js.org) -- Account model, JWT strategy, PrismaAdapter
- [Auth.js Prisma Adapter Schema](https://authjs.dev/getting-started/adapters/prisma) -- Account model reference
- [googleapis Node.js Client](https://github.com/googleapis/google-api-nodejs-client) -- OAuth2Client, token refresh
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2) -- Token flow
- [TRPC Middleware Documentation](https://trpc.io/docs/server/middlewares) -- Middleware patterns
- [Prisma Client Extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions) -- Query extensions
- [Node.js Crypto API](https://nodejs.org/api/crypto.html) -- AES-256-GCM encryption

### Secondary (MEDIUM confidence)
- [Mindbody Staff Management](https://www.mindbodyonline.com/business/staff-management) -- Feature landscape
- [Acuity Staff Setup](https://help.acuityscheduling.com/hc/en-us/articles/16676894081421) -- Multi-calendar patterns
- [WellnessLiving Staff Management](https://www.wellnessliving.com/features/manage-staff/) -- Staff self-service
- [Vagaro Commission Setup](https://support.vagaro.com/hc/en-us/articles/21476003452955) -- Revenue split patterns
- [Zero-Downtime Postgres Migrations](https://gocardless.com/blog/zero-downtime-postgres-migrations-the-hard-parts/) -- Migration safety
- [Multi-Tenant Database Patterns](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/) -- Architecture comparison

### Tertiary (LOW confidence)
- [Auth.js + Better Auth merger discussion](https://github.com/nextauthjs/next-auth/discussions/13252) -- Auth ecosystem direction (informational, not actionable)
- [Multi-Tenant RLS Risks](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c) -- RLS not recommended for this use case

---
*Research completed: 2026-03-14*
*Ready for roadmap: yes*
