# Requirements: YM Movement v1.1 Test & Stabilize

**Defined:** 2026-03-16
**Core Value:** Verify all v1.0 multi-coach features work correctly through automated E2E testing, ensuring production readiness.

## v1.1 Requirements

Requirements for test and stabilization release. Each maps to roadmap phases.

### Test Infrastructure

- [x] **TINF-01**: Test data seeding script creates coach accounts, multi-coach scenarios, and student-coach relationships for E2E tests
- [x] **TINF-02**: Test helper utilities extended with coach login, coach creation, coach approval, and coach-specific booking functions
- [x] **TINF-03**: Existing 13 E2E test files updated to work with SUPER_ADMIN role system (previously ADMIN) without breaking

### Coach Flow Tests

- [ ] **CTST-01**: E2E test verifies coach self-registration flow (signup form, submission, pending status)
- [ ] **CTST-02**: E2E test verifies admin coach approval and denial flow (approve/deny from queue, coach account activation)
- [ ] **CTST-03**: E2E test verifies coach dashboard displays upcoming lessons, past lessons, student list, and earnings summary
- [ ] **CTST-04**: E2E test verifies coach profile editing persists changes (bio, skills, certifications)
- [ ] **CTST-05**: E2E test verifies coach time slot proposal and admin approval/denial flow

### Student Booking Tests

- [ ] **STST-01**: E2E test verifies student browse-by-coach flow (coach grid, profile viewing, coach selection)
- [ ] **STST-02**: E2E test verifies two-step booking (select coach, view availability, book lesson, confirmation)
- [ ] **STST-03**: E2E test verifies coach name displays in lesson cards, schedule views, and payment records

### Admin & Revenue Tests

- [ ] **ATST-01**: E2E test verifies super admin can view all coaches with status, hours, and earnings
- [ ] **ATST-02**: E2E test verifies inline revenue split editor updates coach split percentage
- [ ] **ATST-03**: E2E test verifies payout report shows per-coach breakdown with correct calculations and CSV export

### Security & Isolation Tests

- [ ] **SECT-01**: E2E test verifies coach A cannot see coach B's lessons, students, or earnings
- [ ] **SECT-02**: E2E test verifies role guards prevent unauthorized route access (student to admin, coach to admin, etc.)
- [ ] **SECT-03**: E2E test verifies dual-role navigation (admin to coach view and back) works correctly

### Stabilization

- [ ] **STAB-01**: All bugs discovered during test writing are fixed and verified
- [ ] **STAB-02**: All E2E tests pass in CI-compatible headless mode

## v2 Requirements

Deferred to future release.

### Advanced Testing

- **ADVT-01**: Unit tests for TRPC router procedures (Vitest)
- **ADVT-02**: Unit tests for pricing waterfall logic
- **ADVT-03**: Integration tests for Google Calendar OAuth flow (mocked)
- **ADVT-04**: Performance/load testing for concurrent multi-coach bookings

## Out of Scope

| Feature | Reason |
|---------|--------|
| Google Calendar OAuth E2E tests | Cannot test real OAuth flow in automated tests; requires manual verification |
| Visual regression testing | Not needed for functional verification; can add later |
| Unit test coverage for all components | Focus on E2E for this milestone; unit tests are v2 |
| Mobile-specific E2E tests | Responsive design already covered by existing viewport tests |
| CI/CD pipeline setup | Test infrastructure only; deployment pipeline is separate |

## Traceability

Which phases cover which requirements. Updated by create-roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TINF-01 | Phase 8 | Complete |
| TINF-02 | Phase 8 | Complete |
| TINF-03 | Phase 8 | Complete |
| CTST-01 | Phase 9 | Pending |
| CTST-02 | Phase 9 | Pending |
| CTST-03 | Phase 9 | Pending |
| CTST-04 | Phase 9 | Pending |
| CTST-05 | Phase 9 | Pending |
| STST-01 | Phase 10 | Pending |
| STST-02 | Phase 10 | Pending |
| STST-03 | Phase 10 | Pending |
| ATST-01 | Phase 9 | Pending |
| ATST-02 | Phase 9 | Pending |
| ATST-03 | Phase 9 | Pending |
| SECT-01 | Phase 10 | Pending |
| SECT-02 | Phase 10 | Pending |
| SECT-03 | Phase 10 | Pending |
| STAB-01 | Phase 11 | Pending |
| STAB-02 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after roadmap creation*
