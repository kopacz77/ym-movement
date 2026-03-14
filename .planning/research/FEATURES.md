# Feature Landscape: Multi-Coach Scheduling Marketplace

**Domain:** Ice dance/skating lesson scheduling platform (single-coach evolving to multi-coach)
**Researched:** 2026-03-14
**Confidence:** MEDIUM-HIGH (cross-referenced across Mindbody, Acuity, SimplyBook, Vagaro, Calendly Teams, WellnessLiving, ice rink platforms)

---

## Table Stakes

Features users expect from a multi-coach scheduling platform. Missing any of these makes the platform feel broken or untrustworthy. Ordered by implementation dependency.

### 1. Coach Role and Basic Dashboard

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Every multi-instructor platform (Mindbody, Acuity, Vagaro, WellnessLiving) gives instructors their own view. Without it, coaches have no reason to use the platform. |
| **Complexity** | Medium |
| **What It Includes** | Coach can log in, see their own schedule, view their assigned students, see upcoming lessons. Essentially a read-only dashboard at minimum. |
| **Dependencies** | None (foundation for everything else) |
| **Existing Foundation** | Prisma schema already has `COACH` role in the `Role` enum. User model exists. Admin dashboard patterns can be adapted. |
| **Sources** | Mindbody staff permissions, Acuity staff calendars, WellnessLiving Elevate Staff App |

### 2. Coach Onboarding (Invitation + Self-Registration)

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Every platform has a mechanism for adding staff. Mindbody uses admin-created accounts with role assignment. Acuity uses calendar-per-staff setup. Both models require admin approval. |
| **Complexity** | Medium |
| **What It Includes** | Two flows: (a) Admin invites coach via email with pre-set role, (b) Coach self-registers and awaits admin approval. Mirrors the existing student approval workflow. |
| **Dependencies** | Coach Role (#1) |
| **Existing Foundation** | Student approval workflow (isApproved, approvedAt, approvedById) provides a direct pattern to follow. Auth system with NextAuth already supports role-based access. |
| **Sources** | Mindbody staff management, Acuity staff setup |

### 3. Coach Profile (Bio, Photo, Skills, Certifications, Rates)

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Great Park Ice, Mindbody, and every coaching marketplace displays instructor profiles. Students need to evaluate and choose coaches. Rates must be visible. Ice skating rinks universally show coach specialties, certifications (PSA ratings), and rate ranges ($40-60/30min is the industry pattern). |
| **Complexity** | Medium |
| **What It Includes** | Name, bio/philosophy, photo URL, specialties (ice dance, freestyle, choreography), certifications (PSA, USFSA ratings), years of experience, rate per lesson type. Admin can view/edit any profile; coaches edit their own. |
| **Dependencies** | Coach Role (#1) |
| **Existing Foundation** | User model has name/email. Student model has level/notes. A new Coach model will mirror the Student model pattern with coach-specific fields. |
| **Sources** | Great Park Ice instructor page, Mindbody staff biographies, coaching marketplace patterns |

### 4. Per-Coach Availability Management

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Core function of every multi-provider platform. Acuity gives each staff member their own calendar. SimplyBook.me allows per-provider working hours and break times. WellnessLiving lets staff manage their own availability from mobile. Without this, multi-coach scheduling is impossible. |
| **Complexity** | High |
| **What It Includes** | Each coach sets their available time slots at specific rinks. Coaches can manage their own hours (within admin-set constraints). Time slots become coach-scoped, not global. Blocked dates become per-coach (travel, competitions). |
| **Dependencies** | Coach Profile (#3), existing RinkTimeSlot system |
| **Existing Foundation** | RinkTimeSlot model exists but is coach-agnostic. Needs a `coachId` foreign key. BlockedDateRange exists but needs coach-scoping. RecurringPattern needs coach-scoping. |
| **Critical Design Decision** | Time slots currently belong to rinks. They must now belong to rink+coach pairs. This is the single biggest schema change. |
| **Sources** | Acuity calendar-per-staff, SimplyBook provider schedules, WellnessLiving staff availability |

### 5. Coach-Scoped Lesson Assignment

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Lessons must be attributed to the coach who teaches them. Every platform tracks which instructor delivers which service. Revenue, scheduling, and student relationships all depend on this. |
| **Complexity** | Medium-High |
| **What It Includes** | Lesson model gets a `coachId` field. When a student books or admin assigns, the coach is specified. Lesson queries become coach-filterable. Coach dashboard shows only their lessons. |
| **Dependencies** | Per-Coach Availability (#4) |
| **Existing Foundation** | Lesson model exists with full status/type/pricing. Adding `coachId` is straightforward but requires migration of existing lessons (all to Yura). |
| **Sources** | Universal across all platforms |

### 6. Student Browse-and-Book by Coach

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Coaching marketplaces (Profi, Reservio, CoachHub) let clients browse profiles and book directly. Ice rink platforms display instructor cards with contact/booking. Students expect to pick their coach. |
| **Complexity** | Medium |
| **What It Includes** | Student-facing page showing available coaches with profiles. Click a coach to see their availability. Book a lesson with a specific coach. Filter by specialty, lesson type, or rink. |
| **Dependencies** | Coach Profile (#3), Per-Coach Availability (#4) |
| **Existing Foundation** | Student booking flow exists (availabilityQueries, bookingQueries). Needs to add coach selection as a pre-step before rink/time selection. |
| **Sources** | Profi coaching platform, Reservio booking flow, Great Park Ice instructor pages |

### 7. Per-Coach Google Calendar Sync

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Calendar sync is already a core feature of YM Movement. When multiple coaches exist, each needs their own calendar sync. Acuity, SimplyBook, and Calendly all support per-staff calendar integration. |
| **Complexity** | High |
| **What It Includes** | Each coach connects their own Google account. Lessons create events on the coach's calendar (not just admin's). Two-way sync for availability. OAuth per coach. |
| **Dependencies** | Coach Profile (#3), Coach-Scoped Lessons (#5) |
| **Existing Foundation** | Google Calendar integration exists for single-coach. Needs to become coach-specific (store OAuth tokens per coach, route events to correct calendar). |
| **Critical Design Decision** | Current implementation likely stores a single Google Calendar credential. Must become per-coach credential storage. |
| **Sources** | Acuity calendar sync, SimplyBook calendar integration |

### 8. Super Admin Cross-Coach Dashboard

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Mindbody, WellnessLiving, and Vagaro all give business owners full visibility across all staff. The admin must see all coaches' schedules, students, lessons, and revenue in one view. Without this, the owner loses control. |
| **Complexity** | Medium |
| **What It Includes** | Admin calendar shows all coaches (color-coded or filterable). Admin can view/edit any coach's schedule. Admin manages all students across coaches. Global analytics spanning all coaches. |
| **Dependencies** | All coach-scoped features (#4, #5) |
| **Existing Foundation** | Current admin dashboard is the foundation. Needs coach-filter overlays on existing views (schedule, students, payments, analytics). |
| **Sources** | Mindbody business management, WellnessLiving multi-location control |

### 9. Per-Coach Revenue Tracking

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Vagaro, Exercise.com, and every multi-instructor platform tracks revenue per instructor. Coaches need to see what they've earned. Admin needs to see revenue breakdown by coach. |
| **Complexity** | Medium |
| **What It Includes** | Payments attributed to the coach who taught the lesson. Coach dashboard shows their earnings (pending, confirmed, total). Admin sees per-coach revenue reports. |
| **Dependencies** | Coach-Scoped Lessons (#5), existing Payment model |
| **Existing Foundation** | Payment model exists with lesson/student links. Adding coach attribution is straightforward since lessons will have coachId. Revenue reports exist (analyticsQueries) and need coach dimension. |
| **Sources** | Vagaro payroll reports, Exercise.com payment routing |

### 10. Role-Based Permissions (Coach vs Admin vs Student)

| Aspect | Detail |
|--------|--------|
| **Why Expected** | Every platform (Mindbody has 4+ permission levels, Acuity has staff permissions, WellnessLiving has role-based access) controls what each role can see and do. Coaches should not see other coaches' students or earnings. Students should not see internal pricing structures. |
| **Complexity** | Medium |
| **What It Includes** | Coach sees: own schedule, own students, own earnings, own profile. Coach cannot: see other coaches' data, modify rink settings, approve students globally. Admin sees: everything. Student sees: available coaches, own bookings, own payments. |
| **Dependencies** | Coach Role (#1), Coach-Scoped features |
| **Existing Foundation** | TRPC middleware already handles ADMIN/STUDENT auth checks. Need to add COACH role checks and data-scoping (not just role check, but "is this YOUR data" checks). |
| **Sources** | Mindbody staff permissions (5 levels), Acuity staff permissions, WellnessLiving staff roles |

---

## Differentiators

Features that would set YM Movement apart from generic scheduling platforms. Not expected, but genuinely valuable in the ice dance coaching context.

### 1. Revenue Split Configuration (Per-Coach, Per-Lesson-Type)

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Most generic platforms handle commissions as flat percentages. YM Movement's plan for individually negotiated splits per coach AND per lesson type is more flexible than Mindbody or Vagaro's standard commission tiers. This is ideal for ice dance where a senior choreographer might have a 70/30 split but a junior coach might be 50/50. |
| **Complexity** | Medium |
| **What It Includes** | Admin sets revenue split per coach (e.g., 60% coach / 40% platform). Optionally vary by lesson type. Dashboard shows gross revenue, coach share, and platform share. Payout reports for accounting. |
| **Dependencies** | Per-Coach Revenue Tracking (Table Stakes #9) |
| **Notes** | Vagaro supports tiered commissions but not per-service-type splits. Exercise.com supports hierarchy splits but is enterprise-priced. This is genuinely differentiating for a small coaching business. |
| **Sources** | Vagaro commission tiers, Exercise.com payment splitting |

### 2. Dual-Role: Owner as Both Admin and Active Coach

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Yura is both the business owner (super admin) AND an active coach. Most platforms treat these as separate concerns. Building first-class support for the "owner-operator who also teaches" pattern is rare and valuable. |
| **Complexity** | Medium |
| **What It Includes** | Yura's account has both ADMIN + COACH permissions. Dashboard can switch between admin view (all coaches) and coach view (just Yura's schedule/students). Analytics separate Yura's coaching revenue from platform revenue. |
| **Dependencies** | Coach Role, Super Admin Dashboard |
| **Notes** | This requires careful permission design. The simplest approach: Yura's User record has role=ADMIN but ALSO has a linked Coach profile. Admin routes check for ADMIN role; coach features check for linked Coach profile. Both can be true simultaneously. |

### 3. Coach-Student Relationship History

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | In ice dance, coach-student relationships are long-term (months to years). Tracking which coaches a student has worked with, lesson history per coach, and allowing coach notes per student provides coaching continuity that generic platforms lack. |
| **Complexity** | Low-Medium |
| **What It Includes** | When a student books with a new coach, the relationship is recorded. Coaches see their full lesson history with each student. If a student switches coaches, the new coach can see past lesson types and notes (with appropriate permissions). |
| **Dependencies** | Coach-Scoped Lessons (#5), Student Notes (already exists) |
| **Existing Foundation** | StudentNote model exists with createdById. Can be extended to track coach-specific notes. Lesson history already exists and just needs coach filtering. |

### 4. Skill-Based Coach Matching

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Ice dance has specific discipline areas (ice dance, freestyle, choreography, pairs). Matching students to coaches by specialty goes beyond generic scheduling. Most platforms just show all providers. |
| **Complexity** | Low |
| **What It Includes** | Coaches tag their specialties in profile. Students can filter available coaches by specialty. "Recommended for you" based on student level and lesson type. |
| **Dependencies** | Coach Profile (#3), Student Browse-and-Book (#6) |
| **Notes** | Simple to implement (tags/filters) but adds meaningful value for students choosing their first coach. |

### 5. Rink-Aware Scheduling with Ice Time Coordination

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Ice rink scheduling is unique: coaches share limited ice time, and rink sessions have fixed start/end times. The platform already handles rinks and time slots. Making this multi-coach while respecting rink capacity (maxStudents per slot, maxCapacity per rink) is genuinely complex and valuable. |
| **Complexity** | High |
| **What It Includes** | Multiple coaches can have slots at the same rink during the same ice session. Rink capacity limits are enforced across all coaches. Coaches see which other coaches are on the ice (for coordination). Admin sees rink utilization across all coaches. |
| **Dependencies** | Per-Coach Availability (#4), Rink model (existing) |
| **Existing Foundation** | Rink model has maxCapacity. RinkTimeSlot has maxStudents. This infrastructure just needs coach-scoping without losing the cross-coach constraint enforcement. |

### 6. Competition and Travel Schedule Coordination

| Aspect | Detail |
|--------|--------|
| **Value Proposition** | Ice dance coaches travel to competitions with students. The existing BlockedDateRange system is unique to this domain. Extending it to show when coaches are at competitions (and which students are with them) is genuinely useful and not found in generic platforms. |
| **Complexity** | Low-Medium |
| **What It Includes** | Per-coach blocked dates (already scoped via createdById). Admin sees all coaches' blocked dates overlaid. Students see when their coach is unavailable and why. Competition dates could show "Coach X is at [Competition] - no lessons available." |
| **Dependencies** | Coach Profile (#3), existing BlockedDateRange |
| **Existing Foundation** | BlockedDateRange model exists with type (TRAVEL, COMPETITION, OTHER) and createdById. Already partially coach-scopable. |

---

## Anti-Features

Features to explicitly NOT build. Common in the multi-coach scheduling space but wrong for YM Movement's context, size, or domain.

### 1. Automated Payroll Processing

| Anti-Feature | Automated payroll with direct deposit, tax withholding, W-2 generation |
|--------------|-----|
| **Why Avoid** | Vagaro and Mindbody offer this for large businesses with employees. YM Movement's coaches are likely independent contractors, not employees. Payroll is a massive compliance burden. The manual Venmo/Zelle payment flow already works and is appropriate for the scale. |
| **What to Do Instead** | Track revenue splits and generate payout reports. Coaches and admin use reports to settle payments externally via Venmo/Zelle/bank transfer. This is what most small coaching businesses actually do. |

### 2. Built-In Chat/Messaging System

| Anti-Feature | In-app messaging between coaches and students |
|--------------|-----|
| **Why Avoid** | Every messaging system is a maintenance burden and a poor substitute for what people already use (text, email, WhatsApp). Building chat creates data retention obligations, moderation needs, and UX complexity. Coaches and students will use their phones regardless. |
| **What to Do Instead** | Coach profile includes contact preferences (email, phone). Notification system sends alerts. Link out to external communication channels. |

### 3. Multi-Location/Multi-Rink-Organization Management

| Anti-Feature | Multi-tenant architecture where different skating organizations each manage their own coaches |
|--------------|-----|
| **Why Avoid** | This is what Mindbody charges $400+/month for. YM Movement is one business with one set of rinks. Building multi-tenancy adds massive architectural complexity (data isolation, billing per tenant, tenant admin roles) with zero near-term value. |
| **What to Do Instead** | Support multiple rinks within a single organization (already implemented). If someday other skating schools want to use the platform, address multi-tenancy then. |

### 4. Online Payment Processing (Stripe/Square Integration)

| Anti-Feature | Full payment gateway integration with credit card processing, invoicing, and automatic billing |
|--------------|-----|
| **Why Avoid** | The existing Venmo/Zelle/Cash flow with manual verification works for this business. Payment gateway integration adds PCI compliance concerns, processing fees, refund management, and accounting complexity. The ice skating coaching industry commonly uses manual payment methods. |
| **What to Do Instead** | Keep the current payment verification model. Extend it to track which coach the payment is for. Generate reports showing what each coach is owed. |

### 5. Round-Robin or Auto-Assignment Booking

| Anti-Feature | Automatically assigning students to the "next available" coach when booking |
|--------------|-----|
| **Why Avoid** | Calendly Teams uses round-robin for sales meetings where the specific person doesn't matter. In ice dance coaching, the coach-student relationship is deeply personal. Students choose coaches based on specialty, personality, and long-term goals. Auto-assignment undermines this. |
| **What to Do Instead** | Student browses coach profiles, selects a specific coach, then sees that coach's availability. Always explicit coach selection. |

### 6. Student Self-Service Coach Switching

| Anti-Feature | Students freely switching between coaches without admin involvement |
|--------------|-----|
| **Why Avoid** | In ice dance, switching coaches is a significant decision with social implications. Unrestricted switching could create conflicts between coaches, hurt coach-student relationships, and reduce coaching continuity. The business owner (Yura) should be aware of and potentially manage coach transitions. |
| **What to Do Instead** | Students can book with any approved coach for individual lessons. But formal "primary coach" changes should involve admin awareness (notification to admin when a student books with a new coach for the first time). |

### 7. Coach-Set Pricing (Without Admin Approval)

| Anti-Feature | Coaches independently setting and changing their own rates |
|--------------|-----|
| **Why Avoid** | Pricing consistency matters for a coordinated coaching business. If coaches set arbitrary rates, it creates confusion for students and potential conflicts between coaches. The business owner needs pricing control. |
| **What to Do Instead** | Admin sets default rates per lesson type. Admin can set per-coach rate overrides. Coaches can request rate changes but admin approves. This mirrors how the existing custom student pricing works. |

### 8. Complex Group Lesson Enrollment System

| Anti-Feature | Full class management with waitlists, enrollment caps, recurring series registration, drop-in tracking |
|--------------|-----|
| **Why Avoid** | While group lessons exist as a lesson type, building a full class management system (like Mindbody's class booking) is a separate product. The current model of booking individual lessons works. Over-engineering group management diverts from the core multi-coach value. |
| **What to Do Instead** | Keep group lessons as a lesson type with maxStudents on time slots. If formal class management becomes needed later, build it as a separate milestone. |

---

## Feature Dependencies

```
Coach Role (#1)
  |
  +---> Coach Onboarding (#2)
  |
  +---> Coach Profile (#3)
  |       |
  |       +---> Student Browse-by-Coach (#6)
  |       |       |
  |       |       +---> Skill-Based Coach Matching (Diff #4)
  |       |
  |       +---> Per-Coach Google Calendar Sync (#7)
  |       |
  |       +---> Competition/Travel Coordination (Diff #6)
  |
  +---> Per-Coach Availability (#4) *** HIGHEST COMPLEXITY ***
  |       |
  |       +---> Coach-Scoped Lessons (#5)
  |       |       |
  |       |       +---> Per-Coach Revenue Tracking (#9)
  |       |       |       |
  |       |       |       +---> Revenue Split Config (Diff #1)
  |       |       |
  |       |       +---> Coach-Student History (Diff #3)
  |       |
  |       +---> Rink-Aware Multi-Coach Scheduling (Diff #5)
  |
  +---> Role-Based Permissions (#10) [cross-cutting, builds incrementally]
  |
  +---> Super Admin Dashboard (#8) [depends on all coach-scoped data existing]
  |
  +---> Dual-Role Owner Support (Diff #2) [depends on permissions + coach profile]
```

### Critical Path

The critical path is: Coach Role -> Coach Profile -> Per-Coach Availability -> Coach-Scoped Lessons -> Per-Coach Revenue Tracking -> Super Admin Dashboard.

Everything else branches off this spine. Per-Coach Availability (#4) is the highest-complexity item because it fundamentally changes how time slots work (from rink-global to rink+coach scoped).

---

## MVP Recommendation

For a multi-coach MVP, prioritize in this order:

### Phase 1: Coach Foundation (Table Stakes #1-3)
1. **Coach Role and Dashboard** - Basic login, navigation, empty dashboard
2. **Coach Onboarding** - Admin invitation flow (defer self-registration to later)
3. **Coach Profile** - Bio, specialties, rates, certifications

**Rationale:** You cannot do anything multi-coach without coaches existing in the system. This phase creates the coach entity and gives them a place to land.

### Phase 2: Coach-Scoped Scheduling (Table Stakes #4-5, #10)
4. **Per-Coach Availability** - coachId on RinkTimeSlot, coach manages own slots
5. **Coach-Scoped Lessons** - coachId on Lesson, coach sees own lessons
6. **Role-Based Permissions** - Coach data isolation, TRPC middleware

**Rationale:** This is the hardest phase. Schema changes, data migration (assign all existing data to Yura), and the fundamental shift from single-coach to multi-coach data model. Do it early because everything depends on it.

### Phase 3: Student Experience (Table Stakes #6, #8)
7. **Student Browse-and-Book by Coach** - Coach selection in booking flow
8. **Super Admin Cross-Coach Dashboard** - Admin sees all coaches in calendar/reports

**Rationale:** Once coaches and their schedules exist, students need to interact with them and admin needs to oversee them.

### Phase 4: Revenue and Integration (Table Stakes #7, #9, Differentiators)
9. **Per-Coach Revenue Tracking** - Payment attribution, coach earnings view
10. **Revenue Split Configuration** - Per-coach splits, payout reports
11. **Per-Coach Google Calendar Sync** - OAuth per coach, event routing
12. **Dual-Role Owner Support** - Yura as admin+coach

**Rationale:** Revenue and calendar integration are important but can work with manual workarounds initially. The dual-role support is a differentiator that makes Yura's daily experience better.

### Defer to Post-MVP
- **Skill-Based Coach Matching** - Nice to have; simple filters suffice initially
- **Coach-Student Relationship History** - Lesson history is already queryable; formal relationship tracking can wait
- **Competition/Travel Coordination** - Blocked dates already work; cross-coach visibility is a polish feature
- **Coach Self-Registration** - Admin invitation covers the initial rollout; self-registration matters when scaling beyond a handful of coaches

---

## Complexity Summary

| Feature | Complexity | Key Challenge |
|---------|------------|---------------|
| Coach Role + Dashboard | Medium | New layout/navigation, adapted from admin |
| Coach Onboarding | Medium | Email invitation flow, approval workflow |
| Coach Profile | Medium | New model, profile editing UI, photo handling |
| Per-Coach Availability | **High** | Schema migration, time slot scoping, conflict detection across coaches at same rink |
| Coach-Scoped Lessons | Medium-High | Schema migration, existing lesson reassignment, query refactoring |
| Student Browse-by-Coach | Medium | New booking flow pre-step, coach cards UI |
| Per-Coach Google Calendar | **High** | Per-coach OAuth token storage, event routing, token refresh per coach |
| Super Admin Dashboard | Medium | Filter/overlay on existing views, cross-coach analytics |
| Per-Coach Revenue | Medium | Payment attribution, coach earnings queries |
| Role-Based Permissions | Medium | TRPC middleware, data-scoping (not just role checks) |
| Revenue Splits | Medium | Config UI, split calculation, payout reports |
| Dual-Role Owner | Medium | Permission model that allows admin+coach simultaneously |

---

## Sources

- [Mindbody Staff Management](https://www.mindbodyonline.com/business/staff-management) - Staff profiles, permissions, scheduling
- [Mindbody Staff Permissions](https://support.mindbodyonline.com/s/article/Staff-Permissions-Settings?language=en_US) - Role-based access control
- [Acuity Staff Setup](https://help.acuityscheduling.com/hc/en-us/articles/16676894081421-Set-up-new-staff-members-in-Acuity-Scheduling) - Per-staff calendars
- [Acuity Calendar Management](https://help.acuityscheduling.com/hc/en-us/articles/16676883635725-Managing-availability-and-calendars) - Multi-calendar availability
- [SimplyBook Provider Relations](https://help.simplybook.me/index.php/Service/Provider_relations) - Service-to-provider mapping
- [Calendly Multi-User Features](https://help.calendly.com/hc/en-us/articles/4423815346967-Understanding-multi-user-features-groups-teams-and-shared-event-types) - Round-robin, collective events
- [Vagaro Commission Setup](https://support.vagaro.com/hc/en-us/articles/21476003452955-Set-Up-Commissions-for-Classes) - Per-class commission configuration
- [WellnessLiving Staff Management](https://www.wellnessliving.com/features/manage-staff/) - Staff self-service, mobile portal
- [Exercise.com Payment Splitting](https://www.exercise.com/platform/payment-splitting/) - Revenue split automation
- [Great Park Ice Instructors](https://www.greatparkice.com/figure-skating/instructors-private-lessons/) - Ice skating instructor profiles and rates
- [EZFacility Rink Management](https://www.ezfacility.com/industries/rink-management-software/) - Multi-instructor ice rink scheduling
- [Profi Coaching Platform](https://www.profi.io/coaching-platform) - Marketplace coaching model
