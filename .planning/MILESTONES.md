# Milestones

## v1.1 Test & Stabilize (2026-03-17)

Comprehensive E2E test suite for all v1.0 multi-coach features with zero failures, Next.js 16 proxy migration, and production-ready test infrastructure.

**Stats:** 5 phases | 11 plans | 19 requirements | 57 commits | 84 files changed | 15,902 insertions

**Key accomplishments:**
- 128 E2E tests across 12 spec files with zero failures (up from 92/222 passing baseline)
- Multi-role test infrastructure: Prisma seed scripts, storageState auth for 4 roles, idempotent test data
- Coach/admin flow coverage: signup, approval, dashboard, profile, proposals, revenue splits, payout reports
- Student/security coverage: browse-by-coach booking, data isolation, role guards, dual-role navigation
- Next.js 16 compatibility: migrated middleware.ts to proxy.ts, fixing role guard redirect failures
- Battle-tested Playwright patterns: 2-worker limit, extended timeouts, SPA navigation workarounds

**Archive:** [Roadmap](milestones/v1.1-ROADMAP.md) | [Requirements](milestones/v1.1-REQUIREMENTS.md) | [Audit](milestones/v1.1-MILESTONE-AUDIT.md)

---

## v1.0 Multi-Coach (2026-03-16)

Transformed single-coach scheduling platform into multi-coach marketplace with role-based access, coach onboarding, per-coach scheduling, student coach browsing, Google Calendar OAuth, revenue splits, and dual-role navigation.

**Stats:** 7 phases | 25 plans | 26 requirements | 106 commits | 194 files changed | 26,426 insertions

**Key accomplishments:**
- SUPER_ADMIN/COACH/STUDENT role hierarchy with TRPC middleware guards and Next.js route protection
- Coach onboarding pipeline: self-registration, admin approval queue, profile management, time slot proposals
- Per-coach data isolation across 179+ database queries preventing cross-coach data leakage
- Student two-step booking flow: browse coaches, select, view availability, book with pricing waterfall
- Per-coach Google Calendar OAuth with AES-256-GCM encrypted token storage and graceful degradation
- Configurable revenue splits with payout reports and CSV export
- Seamless dual-role navigation for Yura (super admin + coach)

**Archive:** [Roadmap](milestones/v1.0-ROADMAP.md) | [Requirements](milestones/v1.0-REQUIREMENTS.md) | [Audit](milestones/v1.0-MILESTONE-AUDIT.md)
