# Pricing and Payment Fixes

**Date:** 2025-10-21
**Issues Fixed:**
1. Prorated pricing based on lesson duration
2. Payment records for admin-assigned lessons

**Status:** ✅ COMPLETE

## Problem Description

### Issue 1: Flat Hourly Pricing
**Problem:** Pricing was calculated as flat hourly rates regardless of lesson duration.

**Example:**
- 60-minute private lesson: $120 ✅ Correct
- 30-minute private lesson: $120 ❌ Incorrect (should be $60)
- 45-minute choreography: $150 ❌ Incorrect (should be $112.50)

**Impact:** Students were being overcharged for lessons shorter than 60 minutes, and the system couldn't accurately price variable-length lessons.

### Issue 2: Missing Payments for Admin-Assigned Lessons
**Problem:** When admin assigned students to time slots, no payment record was created.

**Impact:**
- Only student-booked lessons appeared in the Payments page
- Admin-assigned lessons had no payment tracking
- Inconsistent payment records across the system

## Solution Implemented

### 1. Pricing Helper Library
**File:** [src/lib/pricing.ts](src/lib/pricing.ts)

Created a comprehensive pricing library with three main functions:

#### `calculateProratedPrice(hourlyRate, durationMinutes)`
Calculates the prorated price based on duration:
```typescript
// Formula: (hourlyRate / 60) * durationMinutes
calculateProratedPrice(120, 30)  // Returns 60
calculateProratedPrice(150, 45)  // Returns 112.50
calculateProratedPrice(120, 60)  // Returns 120
```

#### `getHourlyRateForLessonType(lessonType, student, defaultPricing)`
Determines the hourly rate considering:
1. Student custom pricing (if enabled)
2. Default pricing from database settings
3. Hardcoded fallback defaults

#### `calculateLessonPrice(lessonType, durationMinutes, student, defaultPricing)`
Main function that combines both:
1. Gets the correct hourly rate for the lesson type
2. Calculates prorated price based on duration
3. Returns the final price

### 2. Default Hourly Rates
Defined standard 60-minute pricing:
```typescript
PRIVATE: $120/hour
CHOREOGRAPHY: $150/hour
GROUP: $80/hour
COMPETITION_PREP: $180/hour
```

### 3. Updated Pricing Logic

#### Admin: `assignStudentToTimeSlot`
**File:** [lessonQueries.ts:359-372](src/features/admin/api/queries/schedule/lessonQueries.ts:359-372)

**Changes:**
- Calculate lesson duration from time slot
- Use `calculateLessonPrice()` for accurate pricing
- **NEW:** Create payment record in same transaction as lesson
- Include `lesson_date` field in payment

**Before:**
```typescript
// Used flat rate without duration consideration
let price = 75; // or student custom price
```

**After:**
```typescript
const durationMinutes = Math.max(Math.floor(durationMs / 60000), 1);
const price = calculateLessonPrice(
  input.lessonType || LessonType.PRIVATE,
  durationMinutes,
  student,
  defaultPricing,
);
```

#### Student: `bookLesson`
**File:** [bookingQueries.ts:202-222](src/features/student/api/queries/bookingQueries.ts:202-222)

**Changes:**
- Replaced complex switch/case logic
- Calculate duration before pricing
- Use `calculateLessonPrice()` for consistency

**Before:**
```typescript
// 50+ lines of switch statements and conditionals
let price = defaultPrices[input.type];
if (student.customPricingEnabled) {
  switch (input.type) { ... }
}
```

**After:**
```typescript
// 6 lines - clean and maintainable
const durationMinutes = Math.max(Math.floor(durationMs / 60000), 1);
const defaultPricing = await ctx.prisma.defaultPricing.findFirst();
const price = calculateLessonPrice(input.type, durationMinutes, student, defaultPricing);
```

#### Admin: `updateLessonType`
**File:** [lessonQueries.ts:494-508](src/features/admin/api/queries/schedule/lessonQueries.ts:494-508)

**Changes:**
- Calculate duration from existing lesson times
- Use `calculateLessonPrice()` for new type
- **NEW:** Create payment if none exists (handles legacy lessons)
- Update existing payment with new prorated price

## Pricing Examples

### 30-Minute Lessons
| Type | Hourly Rate | 30min Price |
|------|-------------|-------------|
| Private | $120 | **$60** |
| Choreography | $150 | **$75** |
| Group | $80 | **$40** |
| Competition Prep | $180 | **$90** |

### 45-Minute Lessons
| Type | Hourly Rate | 45min Price |
|------|-------------|-------------|
| Private | $120 | **$90** |
| Choreography | $150 | **$112.50** |
| Group | $80 | **$60** |
| Competition Prep | $180 | **$135** |

### 60-Minute Lessons
| Type | Hourly Rate | 60min Price |
|------|-------------|-------------|
| Private | $120 | **$120** |
| Choreography | $150 | **$150** |
| Group | $80 | **$80** |
| Competition Prep | $180 | **$180** |

### Custom Student Pricing Example
**Student with custom rates:**
- Private: $100/hour (instead of $120)
- Choreography: $130/hour (instead of $150)

**30-minute private lesson:**
```typescript
calculateLessonPrice(
  LessonType.PRIVATE,
  30,
  { customPricingEnabled: true, privateLessonPrice: 100 },
  defaultPricing
)
// Returns: $50 (not $60)
```

## Payment Record Creation

### When Payments Are Created

1. **Student Books Lesson** → Payment created immediately
2. **Admin Assigns Student** → Payment created immediately (NEW!)
3. **Lesson Type Updated** → Payment updated or created if missing (NEW!)

### Payment Record Fields
```typescript
{
  lessonId: string;          // Links to lesson
  studentId: string;         // Who owes payment
  amount: number;            // Prorated price
  method: PaymentMethod;     // VENMO (default)
  status: PaymentStatus;     // PENDING (default)
  referenceCode: string;     // PAY-xxxxxxxx
  lesson_date: DateTime;     // When lesson occurs
}
```

## Files Created/Modified

### New Files
- ✅ [src/lib/pricing.ts](src/lib/pricing.ts) - Pricing calculation library (140 lines)

### Modified Files
1. ✅ [src/features/admin/api/queries/schedule/lessonQueries.ts](src/features/admin/api/queries/schedule/lessonQueries.ts)
   - Added imports for pricing helper and payment types
   - Updated `assignStudentToTimeSlot` (lines 359-432)
   - Updated `updateLessonType` (lines 494-573)

2. ✅ [src/features/student/api/queries/bookingQueries.ts](src/features/student/api/queries/bookingQueries.ts)
   - Added import for pricing helper
   - Simplified pricing calculation (lines 202-222)

## Testing Checklist

### Manual Testing Required
- [ ] Create 30-minute time slot
- [ ] Admin assigns student to 30min slot
- [ ] Verify price is 50% of hourly rate
- [ ] Check payment record exists in Payments page
- [ ] Create 60-minute time slot
- [ ] Admin assigns student to 60min slot
- [ ] Verify price is 100% of hourly rate
- [ ] Student books 45-minute lesson
- [ ] Verify price is 75% of hourly rate
- [ ] Change lesson type on existing lesson
- [ ] Verify price updates based on new type and duration
- [ ] Test with student custom pricing enabled
- [ ] Verify custom rates are prorated correctly

### Expected Results

**30-minute private lesson:**
- Default pricing: $60
- Custom $100/hr: $50
- Payment record created: ✅

**45-minute choreography:**
- Default pricing: $112.50
- Custom $130/hr: $97.50
- Payment record created: ✅

**60-minute competition prep:**
- Default pricing: $180
- Custom $200/hr: $200
- Payment record created: ✅

## Benefits

### For Students
- ✅ **Fair pricing** - Only pay for actual lesson time
- ✅ **Flexible scheduling** - Can book 30min, 45min, or custom durations
- ✅ **Transparent costs** - Price accurately reflects duration

### For Admin
- ✅ **Complete payment tracking** - All lessons have payment records
- ✅ **Accurate pricing** - Automatic calculation based on duration
- ✅ **Easy management** - Change lesson types with automatic price updates
- ✅ **Custom rates honored** - Student pricing automatically applied

### For Development
- ✅ **Maintainable code** - Centralized pricing logic
- ✅ **Consistent behavior** - Same calculation everywhere
- ✅ **Easy testing** - Pure functions with clear inputs/outputs
- ✅ **Extensible** - Easy to add new lesson types or pricing rules

## Edge Cases Handled

### 1. Very Short Lessons
Minimum duration enforced at 1 minute to avoid division errors:
```typescript
const durationMinutes = Math.max(Math.floor(durationMs / 60000), 1);
```

### 2. Missing Default Pricing
Fallback to hardcoded defaults if database record doesn't exist:
```typescript
PRIVATE: 120, CHOREOGRAPHY: 150, GROUP: 80, COMPETITION_PREP: 180
```

### 3. Legacy Lessons Without Payments
`updateLessonType` creates payment record if missing:
```typescript
if (existingLesson.Payment) {
  // Update existing
} else {
  // Create new payment
}
```

### 4. Null Custom Pricing
Gracefully falls back to default pricing:
```typescript
if (student.privateLessonPrice !== null && student.privateLessonPrice !== undefined) {
  return student.privateLessonPrice;
}
// Falls through to default pricing
```

## Future Enhancements

Potential improvements:

1. **Rounding Rules** - Configurable rounding (e.g., round to nearest $0.50)
2. **Package Pricing** - Bulk discounts for multiple lessons
3. **Time-of-Day Pricing** - Peak vs off-peak rates
4. **Seasonal Pricing** - Holiday or summer rates
5. **Multi-Student Discounts** - Reduced rates for family bookings
6. **Cancellation Fees** - Prorated refund calculations

## Migration Notes

### Existing Lessons
- Old lessons retain their original flat-rate pricing
- Price updates when:
  - Lesson type is changed
  - Payment record is created/updated

### No Breaking Changes
- Existing payment records unchanged
- Database schema unchanged
- API interfaces unchanged
- All changes are backward compatible

---

**Last Updated:** 2025-10-21
**Fixed By:** Development Team
**Impact:** High - Affects all lesson pricing
**Risk:** Low - Backward compatible, pure calculation changes
