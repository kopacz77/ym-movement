# Requirements: YM Movement Multi-Coach Platform

**Defined:** 2026-03-14
**Core Value:** Students can discover, browse, and book lessons from multiple coaches across different disciplines, while the super admin maintains full visibility and control over the entire coaching operation including revenue splits and payouts.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Auth & Roles

- [ ] **AUTH-01**: System supports SUPER_ADMIN, COACH, and STUDENT roles with appropriate route guards and TRPC middleware
- [ ] **AUTH-02**: Existing ADMIN role maps to SUPER_ADMIN without breaking current user sessions or requiring re-login
- [ ] **AUTH-03**: Yura's user account functions as both SUPER_ADMIN and COACH simultaneously with access to both admin and coach features
- [ ] **AUTH-04**: New coaches can self-register through a signup flow similar to students, pending super admin approval

### Coach Management

- [ ] **CMGT-01**: Super admin can view a queue of pending coach applications and approve or deny them
- [ ] **CMGT-02**: Coach profiles include bio, photo, skills/disciplines, lesson rates, and certifications/experience
- [ ] **CMGT-03**: Super admin can manually create coach accounts or send invitation links
- [ ] **CMGT-04**: Super admin can activate, deactivate, or suspend coach accounts

### Coach Dashboard

- [ ] **CDSH-01**: Coaches have a dedicated dashboard showing their upcoming and past lessons
- [ ] **CDSH-02**: Coaches can propose time slot availability, which super admin can approve or override
- [ ] **CDSH-03**: Coaches can view their earnings, pending payouts, and lesson payment history
- [ ] **CDSH-04**: Coaches can see a list of students who have booked lessons with them

### Scheduling

- [ ] **SCHD-01**: Time slots (RinkTimeSlot) are associated with a specific coach via coachId
- [ ] **SCHD-02**: Conflict detection is scoped per-coach -- different coaches can have overlapping slots at different rinks
- [ ] **SCHD-03**: All existing time slots, lessons, and payments are migrated to associate with Yura as coach
- [ ] **SCHD-04**: Each coach can manage their own blocked dates (travel, competitions) independently

### Student Booking

- [ ] **BOOK-01**: Students select a coach first, then see that coach's available time slots for booking
- [ ] **BOOK-02**: Lesson cards, schedule views, and payment records display which coach the lesson is with
- [ ] **BOOK-03**: A single student can book lessons with multiple different coaches across disciplines

### Super Admin

- [ ] **SADM-01**: Super admin dashboard shows all coaches with status, total hours booked, and earnings summary
- [ ] **SADM-02**: Super admin can view any coach's calendar, upcoming lessons, and student roster
- [ ] **SADM-03**: Revenue reports include platform-wide totals and per-coach breakdowns with payout calculations
- [ ] **SADM-04**: All existing database queries (179 identified) are scoped to prevent cross-coach data leakage

### Integration

- [ ] **INTG-01**: Each coach connects their own Google Calendar via OAuth, with encrypted token storage
- [ ] **INTG-02**: Per-coach revenue split percentages are configurable by super admin, tracking amounts owed per coach
- [ ] **INTG-03**: Coaches receive booking confirmation, cancellation, and payment notifications for their lessons

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Coach Features

- **ACFT-01**: Coach performance analytics (student retention, booking rates, revenue trends)
- **ACFT-02**: Coach availability templates (recurring weekly schedules)
- **ACFT-03**: Coach-to-student messaging within the platform

### Advanced Student Features

- **ASTD-01**: Student reviews and ratings of coaches
- **ASTD-02**: Coach recommendation engine based on student skill level and goals
- **ASTD-03**: Browse by discipline (see all coaches offering ice dance, dry land, etc.)

### Platform Features

- **PLAT-01**: Automated payout processing via Stripe Connect or similar
- **PLAT-02**: Multi-organization/franchise support
- **PLAT-03**: Advanced scheduling with round-robin or auto-assignment

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time chat | High complexity, use existing notification system instead |
| Automated payment processing (Stripe) | Manual Venmo/Zelle/Cash verification is the current model; track amounts only |
| Mobile native app | Responsive web sufficient for current user base |
| Coach-set pricing | Super admin controls pricing; coaches don't set their own rates |
| Multi-tenancy | Single organization (YM Movement), not a SaaS platform |
| Round-robin booking | Students explicitly choose their coach |
| Complex group enrollment | Existing group lesson type is sufficient |

## Traceability

Which phases cover which requirements. Updated by create-roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 2 | Complete |
| CMGT-01 | Phase 2 | Complete |
| CMGT-02 | Phase 2 | Complete |
| CMGT-03 | Phase 2 | Complete |
| CMGT-04 | Phase 2 | Complete |
| CDSH-01 | Phase 2 | Complete |
| CDSH-02 | Phase 2 | Complete |
| CDSH-03 | Phase 2 | Complete |
| CDSH-04 | Phase 2 | Complete |
| SCHD-01 | Phase 4 | Complete |
| SCHD-02 | Phase 4 | Complete |
| SCHD-03 | Phase 1 | Complete |
| SCHD-04 | Phase 4 | Complete |
| BOOK-01 | Phase 5 | Pending |
| BOOK-02 | Phase 5 | Pending |
| BOOK-03 | Phase 5 | Pending |
| SADM-01 | Phase 3 | Complete |
| SADM-02 | Phase 3 | Complete |
| SADM-03 | Phase 3 | Complete |
| SADM-04 | Phase 3 | Complete |
| INTG-01 | Phase 6 | Pending |
| INTG-02 | Phase 7 | Pending |
| INTG-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-15 after Phase 4 completion*
