# Milestones

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
