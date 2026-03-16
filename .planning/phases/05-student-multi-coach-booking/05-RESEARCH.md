# Phase 5: Student Multi-Coach Booking - Research

**Researched:** 2026-03-15
**Domain:** Student-facing coach browsing, coach-aware booking flow, coach display in lessons/payments
**Confidence:** HIGH

## Summary

Phase 5 transforms the student booking experience from a single-coach assumption to a multi-coach discovery and booking flow. The current booking flow goes: select rink -> see available time slots -> click slot -> BookingDialog -> book. The new flow must be: browse coaches -> select coach -> see that coach's available time slots -> book. Additionally, every place a student sees a lesson (schedule, dashboard, payments, lesson details) must display which coach the lesson is with.

Codebase investigation reveals that all the backend infrastructure is already in place from prior phases: `RinkTimeSlot.coachId` exists and is populated, `Lesson.coachId` exists and is set during booking (inherited from `timeSlot.coachId`), `Coach` model has profile fields (bio, photoUrl, skills, certifications, yearsExperience) and pricing fields, and the `CoachStudent` junction table exists. The pricing waterfall (student custom > coach pricing > global defaults > hardcoded fallback) is partially implemented -- `calculateLessonPrice` in `src/lib/pricing.ts` currently skips the coach pricing step, which needs to be added.

The primary work is: (1) a new TRPC endpoint for students to browse approved+active coaches with their profiles, (2) a new TRPC endpoint for students to get a specific coach's available time slots, (3) rewriting `BookingCalendar.tsx` to add coach selection as the first step, (4) updating `BookingDialog.tsx` to show which coach the lesson is with and use coach-aware pricing, (5) adding Coach relation includes to `getStudentLessons`, `getLesson`, and the lesson details page, and (6) updating all student UI components (LessonCard, UpcomingLessons, StudentScheduleClient, payments page, lesson details page) to display coach name.

**Primary recommendation:** Add a coach browsing step before the calendar in the booking flow. Create student-scoped TRPC endpoints (using `protectedProcedure`) for coach listing and coach-filtered availability. Update the pricing waterfall to include coach pricing. Add Coach includes to all lesson queries and display coach name in all lesson-related UI.

## Standard Stack

No new libraries needed. This phase uses the existing stack entirely.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-big-calendar | ^1.19.4 | Calendar rendering for booking | Already used in BookingCalendar |
| @tanstack/react-query | ^5.90.12 | Data fetching/caching | Already established |
| TRPC v11 | ^11.8.1 | Student-facing API endpoints | Already established |
| Prisma ORM | existing | Database queries with coach filtering | Already established |
| Luxon | existing | Timezone-aware date handling | Already used in booking |
| date-fns | existing | Date formatting | Already used throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | existing | Card, Badge, Avatar, Select | Coach profiles, coach selector |
| Lucide React | existing | User, Star, Award icons | Coach profile display |
| Sonner | existing | Toast notifications | Already used in booking |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Changes Map

```
src/
  features/
    student/
      api/queries/
        availabilityQueries.ts   # ADD: coachId filter, Coach include in time slots
        bookingQueries.ts        # ADD: coach-aware pricing in bookLesson
        coachBrowseQueries.ts    # NEW: getBrowsableCoaches, getCoachProfile
        profileQueries.ts        # ADD: Coach include in getStudentLessons
        lessonQueries.ts         # ADD: Coach include in getLesson
        index.ts                 # ADD: register coachBrowse router
      components/
        booking/
          CoachBrowse.tsx         # NEW: coach grid/list for discovery
          CoachProfileCard.tsx    # NEW: individual coach card
          BookingCalendar.tsx     # MODIFY: accept coachId prop, filter by coach
          BookingDialog.tsx       # MODIFY: show coach name, use coach pricing
        dashboard/
          UpcomingLessons.tsx     # MODIFY: display coach name
        schedule/
          LessonCard.tsx          # MODIFY: display coach name
      types/
        index.ts                 # MODIFY: add Coach to LessonWithDetails
  lib/
    pricing.ts                   # MODIFY: add coach pricing to waterfall
  app/(protected)/student/
    book/page.tsx                # MODIFY: two-step flow (coach -> calendar)
    schedule/
      [lessonId]/page.tsx        # MODIFY: add Coach include, display coach name
      client.tsx                 # MODIFY: add Coach to Lesson interface, display
      StudentScheduleClient.tsx  # MODIFY: same as client.tsx
    payments/page.tsx            # MODIFY: display coach name column
```

### Pattern 1: Coach Browsing Query (Student-Facing)

**What:** A `protectedProcedure` endpoint that returns only approved+active coaches with public profile info. Students do not need superAdminProcedure -- they need to see coaches to book with them.

**When to use:** Any time a student needs to see available coaches.

**Key design decisions:**
- Use `protectedProcedure` (not adminProcedure or superAdminProcedure) since students call this
- Filter: `isApproved: true, isActive: true` -- only show browsable coaches
- Include: User.name, bio, photoUrl, skills, certifications, yearsExperience
- Include: pricing fields (privateLessonPrice, etc.) so students can see rates
- Do NOT include: revenueSplitPercent, googleCalendarId, tokens, suspendedReason -- internal admin data
- Include: `_count.RinkTimeSlot` with `{ where: { isActive: true, startTime: { gte: now } } }` for "available slots" count

**Example:**
```typescript
// src/features/student/api/queries/coachBrowseQueries.ts
getBrowsableCoaches: protectedProcedure.query(async ({ ctx }) => {
  const coaches = await ctx.prisma.coach.findMany({
    where: {
      isApproved: true,
      isActive: true,
    },
    include: {
      User: { select: { name: true, email: true } },
      _count: {
        select: {
          RinkTimeSlot: {
            where: {
              isActive: true,
              startTime: { gte: new Date() },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return coaches.map((coach) => ({
    id: coach.id,
    name: coach.User.name,
    bio: coach.bio,
    photoUrl: coach.photoUrl,
    skills: coach.skills,
    certifications: coach.certifications,
    yearsExperience: coach.yearsExperience,
    privateLessonPrice: coach.privateLessonPrice,
    groupLessonPrice: coach.groupLessonPrice,
    choreographyPrice: coach.choreographyPrice,
    competitionPrepPrice: coach.competitionPrepPrice,
    availableSlots: coach._count.RinkTimeSlot,
  }));
});
```

### Pattern 2: Coach-Filtered Availability

**What:** Modify `getAvailableTimeSlots` in `availabilityQueries.ts` to accept an optional `coachId` parameter and include Coach relation data. When `coachId` is provided, only return that coach's time slots.

**When to use:** After student selects a coach, show only that coach's available slots.

**Key design:**
```typescript
// In availabilityQueries.ts - add to input schema:
coachId: z.string().optional(),

// In where clause:
if (input.coachId) {
  whereClause.coachId = input.coachId;
}

// In include, add Coach:
Coach: {
  select: {
    id: true,
    User: { select: { name: true } },
  },
},
```

### Pattern 3: Coach-Aware Pricing Waterfall

**What:** Update `calculateLessonPrice` in `src/lib/pricing.ts` to accept an optional coach parameter, inserting coach pricing between student custom pricing and global defaults.

**Current waterfall:** student custom > global defaults > hardcoded fallback
**New waterfall:** student custom > coach pricing > global defaults > hardcoded fallback

**Example:**
```typescript
export function getHourlyRateForLessonType(
  lessonType: LessonType,
  student: { customPricingEnabled: boolean; privateLessonPrice?: number | null; /* ... */ },
  defaultPricing?: { /* ... */ } | null,
  coach?: { privateLessonPrice?: number | null; /* ... */ } | null, // NEW param
): number {
  // 1. Student custom pricing (existing - unchanged)
  if (student.customPricingEnabled) { /* ... existing logic ... */ }

  // 2. Coach pricing (NEW)
  if (coach) {
    switch (lessonType) {
      case LessonType.PRIVATE:
        if (coach.privateLessonPrice != null) return coach.privateLessonPrice;
        break;
      // ... other types
    }
  }

  // 3. Default pricing from database (existing - unchanged)
  if (defaultPricing) { /* ... existing logic ... */ }

  // 4. Hardcoded defaults (existing - unchanged)
  return DEFAULT_HOURLY_PRICES[lessonType];
}
```

**Critical:** The `calculateLessonPrice` function is called from `bookingQueries.ts`. The booking mutation already has `timeSlot.coachId` available. Add a coach fetch to get pricing fields:
```typescript
// In bookLesson mutation, before calculateLessonPrice:
let coachPricing = null;
if (timeSlot.coachId) {
  coachPricing = await ctx.prisma.coach.findUnique({
    where: { id: timeSlot.coachId },
    select: {
      privateLessonPrice: true,
      groupLessonPrice: true,
      choreographyPrice: true,
      competitionPrepPrice: true,
    },
  });
}

const price = calculateLessonPrice(input.type, durationMinutes, student, defaultPricing, coachPricing);
```

### Pattern 4: Adding Coach Display to Lesson Queries

**What:** Add `Coach` include to all queries that return lesson data so UI can display coach name.

**Queries to modify:**
1. `profileQueries.ts` -> `getStudentLessons` -> add `Coach: { include: { User: { select: { name: true } } } }` to Lesson include
2. `lessonQueries.ts` -> `getLesson` -> add `Coach: { include: { User: { select: { name: true } } } }` to Lesson include
3. `[lessonId]/page.tsx` -> server-side Prisma query -> add `Coach: { include: { User: true } }` to Lesson include

### Pattern 5: Two-Step Booking Flow

**What:** The `/student/book` page transitions from a direct calendar view to a two-step flow: (1) browse/select coach, (2) view their calendar and book.

**Design:**
```
State: selectedCoach = null | CoachProfile

When selectedCoach is null:
  -> Render <CoachBrowse onSelectCoach={setSelectedCoach} />

When selectedCoach is set:
  -> Render header with selected coach info + "Change Coach" button
  -> Render <BookingCalendar coachId={selectedCoach.id} coachName={selectedCoach.name} />
```

**BookingCalendar modifications:**
- Accept `coachId` prop
- Pass `coachId` to `getAvailableTimeSlots` query
- Pass coach name to `BookingDialog` for display

**BookingDialog modifications:**
- Accept and display `coachName` prop
- Show coach name in the time slot details section

### Anti-Patterns to Avoid

- **Do NOT create a separate booking flow for multi-coach:** Modify the existing `BookingCalendar` and `BookingDialog` -- do not create new components that duplicate their logic.
- **Do NOT filter coaches on the client side:** The coach list query should filter `isApproved: true, isActive: true` on the server. Never return all coaches and filter in the browser.
- **Do NOT remove the rink filter:** Keep the existing rink selection within the calendar. The flow is: select coach -> select rink (existing) -> see slots -> book.
- **Do NOT break backward compatibility:** The `calculateLessonPrice` function adds a new optional parameter. All existing callers continue to work without changes if they don't pass the coach parameter.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coach profile cards | Custom card with raw HTML | shadcn/ui Card + Badge + Avatar | Consistent with existing UI patterns |
| Coach pricing display | Custom price formatter | Existing `formatPrice` pattern from BookingDialog | Already handles $0.00 vs whole numbers |
| Time slot filtering | Client-side filter after fetch | Prisma where clause with coachId | Performance, security -- don't send all coaches' slots to client |
| Coach availability count | Separate query + count | Prisma `_count` aggregation | Single query, database-level efficiency |

## Common Pitfalls

### Pitfall 1: Missing Coach Relation Includes

**What goes wrong:** Lesson data is fetched without Coach include, so `lesson.Coach?.User?.name` is undefined, and coach name shows as "Unknown" or crashes.
**Why it happens:** The Lesson model has `Coach` as an optional relation (`Coach?`). If you don't explicitly include it in the Prisma query, it comes back as `undefined`.
**How to avoid:** Add `Coach: { include: { User: { select: { name: true } } } }` to EVERY Prisma query that fetches Lesson data for student display.
**Warning signs:** Coach name showing as undefined, null, or "Unknown" in any lesson view.

**Files that need Coach includes:**
- `src/features/student/api/queries/profileQueries.ts` -> `getStudentLessons` (line ~191)
- `src/features/student/api/queries/lessonQueries.ts` -> `getLesson` (line ~13)
- `src/app/(protected)/student/schedule/[lessonId]/page.tsx` -> server Prisma query (line ~43)

### Pitfall 2: Pricing Waterfall Parameter Ordering

**What goes wrong:** Adding `coach` parameter to `calculateLessonPrice` breaks existing callers.
**Why it happens:** Adding required parameters changes the function signature.
**How to avoid:** Make the `coach` parameter optional and add it as the LAST parameter. All existing callers pass positional args so adding an optional param at the end is safe.
**Warning signs:** TypeScript errors in `bookingQueries.ts` or `adminAssignment` code after changing pricing.

### Pitfall 3: Student Pricing Display with Coach Context

**What goes wrong:** The `BookingDialog` shows incorrect prices because it uses `getStudentPricing` which doesn't consider coach pricing.
**Why it happens:** `getStudentPricing` in `profileQueries.ts` returns student custom prices or global defaults, never considering coach-level pricing.
**How to avoid:** Either (a) create a new endpoint `getStudentPricingForCoach(studentId, coachId)` that applies the full waterfall, or (b) pass coach pricing to the BookingDialog and apply the waterfall on the frontend. Option (a) is cleaner.
**Warning signs:** Price shown in BookingDialog differs from the price actually charged when booking.

### Pitfall 4: TypeScript Interface Updates

**What goes wrong:** Adding Coach to lesson data but forgetting to update TypeScript interfaces causes runtime undefined access.
**Why it happens:** The codebase has multiple parallel type definitions: `LessonWithDetails` in `src/features/student/types/index.ts`, `Lesson` interface in `client.tsx`, `LessonWithDetails` in `StudentScheduleClient.tsx`, and the raw Prisma return types.
**How to avoid:** Update ALL of these interfaces to include `Coach?: { User: { name: string | null } }`. Use optional chaining (`lesson.Coach?.User?.name || "Instructor"`) with a sensible fallback for backward compatibility with lessons that have no coachId.
**Warning signs:** TypeScript errors after adding Coach include to queries; missing coach name in some views but not others.

### Pitfall 5: Duplicate Client Components for Schedule

**What goes wrong:** There are TWO client components for the schedule page: `client.tsx` and `StudentScheduleClient.tsx` in the same directory. Updating one but not the other creates inconsistency.
**Why it happens:** Historical duplication. `page.tsx` imports `./client` (which is `StudentScheduleClient.tsx` -- NOTE: actually `page.tsx` imports `"./client"` which resolves to `client.tsx`, but both exist).
**How to avoid:** Check which one `page.tsx` actually imports and update THAT one. Also update the other for consistency, or consolidate them.
**Warning signs:** Coach name appears on schedule in one view but not another.

### Pitfall 6: Notification Coach Context

**What goes wrong:** Booking notifications say "Your PRIVATE lesson has been scheduled" but don't mention which coach.
**Why it happens:** The notification creation in `bookingQueries.ts` doesn't include coach name.
**How to avoid:** After the lesson is created, fetch coach name (if coachId exists) and include it in notification messages: "Your PRIVATE lesson with Coach [Name] has been scheduled..."
**Warning signs:** Student notifications don't tell them which coach the lesson is with.

## Code Examples

### Coach Browse Grid Component

```tsx
// src/features/student/components/booking/CoachBrowse.tsx
interface CoachProfile {
  id: string;
  name: string | null;
  bio: string | null;
  photoUrl: string | null;
  skills: string[];
  certifications: string | null;
  yearsExperience: number | null;
  privateLessonPrice: number | null;
  groupLessonPrice: number | null;
  choreographyPrice: number | null;
  competitionPrepPrice: number | null;
  availableSlots: number;
}

interface CoachBrowseProps {
  onSelectCoach: (coach: CoachProfile) => void;
}

// Grid of CoachProfileCard components
// Each card shows: name, photo/avatar, skills as badges, years experience, starting price
// "View Schedule" button calls onSelectCoach
```

### Coach Profile Card Component

```tsx
// src/features/student/components/booking/CoachProfileCard.tsx
// Uses shadcn Card, Badge, Avatar
// Layout: avatar/photo at top, name, bio snippet, skills as Badges, pricing info, available slots count
// "View Available Times" button

<Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
  <CardContent className="p-6">
    <div className="flex items-start gap-4">
      <Avatar className="h-16 w-16">
        {coach.photoUrl ? (
          <AvatarImage src={coach.photoUrl} alt={coach.name} />
        ) : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <h3 className="font-semibold text-lg">{coach.name}</h3>
        {coach.yearsExperience && (
          <p className="text-sm text-muted-foreground">
            {coach.yearsExperience} years experience
          </p>
        )}
      </div>
    </div>
    {coach.bio && (
      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{coach.bio}</p>
    )}
    <div className="flex flex-wrap gap-1 mt-3">
      {coach.skills.map((skill) => (
        <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
      ))}
    </div>
    <div className="flex items-center justify-between mt-4">
      <span className="text-sm">
        From ${lowestPrice}/hr
      </span>
      <Badge variant="outline">{coach.availableSlots} slots available</Badge>
    </div>
  </CardContent>
</Card>
```

### Updated Booking Flow Page

```tsx
// src/app/(protected)/student/book/page.tsx
export default function BookLessonPage() {
  return (
    <ApprovalGuard>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Book a Lesson</h1>
        <ErrorBoundary>
          <BookingFlow />  {/* New component managing the two-step flow */}
        </ErrorBoundary>
      </div>
    </ApprovalGuard>
  );
}
```

### Adding Coach Name to Lesson Card

```tsx
// In LessonCard.tsx - add coach display
<div className="flex items-center gap-2 text-sm">
  <User className="h-4 w-4 text-muted-foreground" />
  <span>{lesson.Coach?.User?.name || "Instructor"}</span>
</div>
```

### Coach-Aware getStudentPricing

```typescript
// New endpoint or modification to profileQueries.ts
getStudentPricingForCoach: protectedProcedure
  .input(z.object({ studentId: z.string(), coachId: z.string().optional() }))
  .query(async ({ ctx, input }) => {
    const student = await ctx.prisma.student.findUnique({ /* ... */ });
    const defaultPricing = await ctx.prisma.defaultPricing.findFirst();

    let coachPricing = null;
    if (input.coachId) {
      coachPricing = await ctx.prisma.coach.findUnique({
        where: { id: input.coachId },
        select: {
          privateLessonPrice: true,
          groupLessonPrice: true,
          choreographyPrice: true,
          competitionPrepPrice: true,
        },
      });
    }

    // Apply waterfall for each type
    return {
      privateLessonPrice: getHourlyRateForLessonType(
        LessonType.PRIVATE, student, defaultPricing, coachPricing
      ),
      // ... etc for each type
    };
  }),
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single coach assumed | coachId on RinkTimeSlot + Lesson | Phase 1 (01-03) | Time slots and lessons know which coach |
| No coach filtering | Query scoping with coachId | Phase 3 (03-01, 03-02) | Backend ready for multi-coach |
| Student selects rink first | Student selects coach first, then rink | Phase 5 (this phase) | New booking flow UX |
| Pricing: student > global | Pricing: student > coach > global | Phase 5 (this phase) | Coach-specific rates applied |

**Still single-coach patterns to update:**
- `BookingCalendar.tsx` has no coach awareness -- shows all time slots regardless of coach
- `BookingDialog.tsx` refers to "instructor" generically, no coach name displayed
- Student notifications say "lesson has been scheduled" without mentioning coach
- `getStudentLessons` doesn't include Coach relation
- `getLesson` doesn't include Coach relation
- Lesson details page (`[lessonId]/page.tsx`) doesn't display coach name
- Payments page doesn't show which coach the lesson was with
- Google Calendar event title says "PRIVATE Lesson with [Student]" -- should say "with [Coach]" or include both

## Open Questions

1. **Google Calendar event title format with coach name**
   - What we know: Currently `${input.type} Lesson with ${student.User.name}`. Phase 4 added `[Coach Name]` suffix for admin calendar view.
   - What's unclear: Whether to update the student-facing event title to include coach name. E.g., `PRIVATE Lesson with StudentName [CoachName]`
   - Recommendation: YES, update calendar title to include coach name. This is Phase 5 scope since it's the student booking flow that creates events.

2. **Confirmation email with coach name**
   - What we know: `sendLessonConfirmationEmail` sends lesson details but doesn't mention coach.
   - What's unclear: Whether email template changes are in scope for Phase 5 or deferred.
   - Recommendation: Add coach name to the email -- it's a single line change in the email template and directly supports the student experience of knowing who they're booked with.

3. **CoachStudent junction table population**
   - What we know: The `CoachStudent` junction table exists but nothing in the booking flow creates entries. The admin assignment flow may or may not create them.
   - What's unclear: Should booking a lesson with a coach automatically create a `CoachStudent` record?
   - Recommendation: YES, upsert a `CoachStudent` record during booking if one doesn't exist. This enables future features (student's "My Coaches" view) and keeps the junction table accurate.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all files listed above
- Prisma schema at `prisma/schema.prisma` -- authoritative for data model
- `src/lib/pricing.ts` -- authoritative for pricing waterfall logic
- `src/features/student/api/queries/` -- all student TRPC endpoints
- `src/features/student/components/` -- all student UI components
- `.planning/STATE.md` -- accumulated decisions from prior phases

### Secondary (MEDIUM confidence)
- Phase 4 research patterns for similar modifications (adding Coach to existing flows)

### Tertiary (LOW confidence)
- None -- all findings verified against actual codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, existing stack verified
- Architecture: HIGH -- patterns derive directly from existing code + prior phase patterns
- Pitfalls: HIGH -- identified from actual duplicate code, missing includes, and interface mismatches in codebase
- Pricing waterfall: HIGH -- verified current implementation in `src/lib/pricing.ts`, gap confirmed (no coach step)
- UI changes: HIGH -- every component inspected, all modification points identified

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable -- no external dependencies changing)
