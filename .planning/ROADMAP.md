# Roadmap

**Project:** YM Movement Multi-Coach Platform

## Completed Milestones

- **v1.0 Multi-Coach** (2026-03-16) — 7 phases, 25 plans, 26 requirements | [Archive](milestones/v1.0-ROADMAP.md)

## Current Milestone: v1.1 Test & Stabilize

**Milestone Goal:** Write comprehensive E2E tests for all v1.0 multi-coach features, update existing tests for the new role system, and fix any bugs discovered — making v1.0 production-ready.

## Phases

### Phase 8: Test Infrastructure & Legacy Updates

**Goal:** Test helpers, seed scripts, and all 13 existing E2E tests updated to work with the multi-coach role system, providing the foundation for all new test authoring.
**Depends on:** Nothing (first phase of v1.1)
**Requirements:** TINF-01, TINF-02, TINF-03
**Plans:** TBD

**Success Criteria:**
1. Test seed script creates coach accounts with multi-coach scenarios and student-coach relationships
2. Test helpers support coach login, coach creation, coach approval, and coach-specific booking flows
3. All 13 existing E2E tests pass with SUPER_ADMIN role system without breaking

---

### Phase 9: Coach & Admin Flow Tests

**Goal:** E2E tests verify all coach lifecycle flows (signup, approval, dashboard, profile, proposals) and admin management flows (coach overview, revenue splits, payout reports).
**Depends on:** Phase 8
**Requirements:** CTST-01, CTST-02, CTST-03, CTST-04, CTST-05, ATST-01, ATST-02, ATST-03
**Plans:** TBD

**Success Criteria:**
1. Coach signup, admin approval/denial, and coach dashboard flows verified by passing E2E tests
2. Coach profile editing and time slot proposal flows verified by passing E2E tests
3. Admin coach overview, inline revenue split editor, and payout report with CSV export verified by passing E2E tests

---

### Phase 10: Student & Security Tests

**Goal:** E2E tests verify student browse-by-coach booking flow, coach name display across all views, data isolation between coaches, and role guard enforcement.
**Depends on:** Phase 8
**Requirements:** STST-01, STST-02, STST-03, SECT-01, SECT-02, SECT-03
**Plans:** TBD

**Success Criteria:**
1. Student browse-by-coach and two-step booking flow verified by passing E2E tests
2. Coach name display across lesson cards, schedule views, and payment records verified by passing E2E tests
3. Data isolation verified: coach A cannot see coach B's lessons, students, or earnings
4. Role guards and dual-role navigation (admin to coach and back) verified by passing E2E tests

---

### Phase 11: Stabilization

**Goal:** All bugs discovered during test writing are fixed, and the complete E2E test suite passes in CI-compatible headless mode.
**Depends on:** Phase 9, Phase 10
**Requirements:** STAB-01, STAB-02
**Plans:** TBD

**Success Criteria:**
1. All bugs discovered during test writing in Phases 8-10 are fixed and verified
2. Complete E2E test suite (existing + new) passes in headless Playwright mode with zero failures

---

## Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| 8 - Test Infrastructure & Legacy Updates | Not started | — |
| 9 - Coach & Admin Flow Tests | Not started | — |
| 10 - Student & Security Tests | Not started | — |
| 11 - Stabilization | Not started | — |

---

*Roadmap for milestone: v1.1 Test & Stabilize*
