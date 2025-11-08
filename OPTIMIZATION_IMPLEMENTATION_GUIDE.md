# Database Optimization Implementation Guide

**Companion to:** DATABASE_OPTIMIZATION_REPORT.md
**Purpose:** Step-by-step implementation instructions for all recommended optimizations

---

## Implementation Phases

### Phase 1: Quick Wins (1-2 hours)
- **Impact:** 40-60% overall performance improvement
- **Risk:** Low
- **Downtime:** None

### Phase 2: Schema Changes (2-3 hours)
- **Impact:** 20-30% additional improvement
- **Risk:** Medium (requires migration)
- **Downtime:** Minimal (CONCURRENT index creation)

### Phase 3: Query Optimizations (3-4 hours)
- **Impact:** 10-20% additional improvement
- **Risk:** Low (code changes only)
- **Downtime:** None

---

## Phase 1: Quick Wins

### 1.1 Add Connection Pooling (CRITICAL - 5 minutes)

**Estimated Impact:** 30-50% improvement in serverless/cold start scenarios

#### Step 1: Update Environment Variables

**File:** `.env`

```bash
# Before:
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# After (add connection pooling parameters):
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require&connection_limit=10&pool_timeout=20&connect_timeout=10&statement_cache_size=100"

# IMPORTANT: If using Neon pooled connection (RECOMMENDED):
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

#### Step 2: Update Prisma Schema

**File:** `prisma/schema.prisma`

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Pooled connection
  directUrl = env("DIRECT_DATABASE_URL") // Direct connection for migrations
}
```

#### Step 3: Regenerate Prisma Client

```bash
pnpm prisma generate
```

#### Step 4: Restart Development Server

```bash
pnpm dev
```

#### Verification:

```bash
# Check connection pool is working
# Look for fewer "new connection" messages in logs
pnpm dev | grep "connection"
```

**Expected Result:** Faster query responses, especially on first request after idle period.

---

### 1.2 Add User.name Index (2 minutes)

**Estimated Impact:** 60-80% faster payment list sorting by student name

#### Step 1: Create Migration

```bash
npx prisma migrate dev --name add_user_name_index
```

#### Step 2: Edit Migration File

**File:** `prisma/migrations/XXXXXX_add_user_name_index/migration.sql`

```sql
-- Add index for User.name to optimize payment sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_name_idx" ON "User"("name");
```

#### Step 3: Update Schema

**File:** `prisma/schema.prisma`

```prisma
model User {
  id                       String   @id @default(cuid())
  email                    String   @unique
  name                     String?
  password                 String?
  role                     Role     @default(STUDENT)
  emailVerified            DateTime?
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  // Relations...

  @@index([createdAt])
  @@index([emailVerified])
  @@index([role])
  @@index([name]) // NEW: Add this line
}
```

#### Step 4: Deploy Migration

```bash
pnpm prisma:migrate
```

#### Verification:

```sql
-- Check index was created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'User' AND indexname = 'User_name_idx';
```

**Expected Result:** Payment page loads 60-80% faster when sorting by student name.

---

### 1.3 Optimize Student Deletion Query (10 minutes)

**Estimated Impact:** 70-90% faster for students with 100+ related records

#### Step 1: Update Student Queries

**File:** `src/features/admin/api/queries/student/studentQueries.ts`

**Find this code (around line 483-491):**

```typescript
// OLD CODE (INEFFICIENT):
const student = await ctx.prisma.student.findUnique({
  where: { id: input.studentId },
  include: {
    User: true,
    Lesson: { select: { id: true } },      // Loads all lesson IDs
    Payment: { select: { id: true } },     // Loads all payment IDs
    StudentNote: { select: { id: true } }, // Loads all note IDs
  },
});
```

**Replace with:**

```typescript
// NEW CODE (OPTIMIZED):
const [student, counts] = await Promise.all([
  ctx.prisma.student.findUnique({
    where: { id: input.studentId },
    select: {
      id: true,
      userId: true,
      User: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  }),
  // Get counts instead of loading all IDs
  Promise.all([
    ctx.prisma.lesson.count({ where: { studentId: input.studentId } }),
    ctx.prisma.payment.count({ where: { studentId: input.studentId } }),
    ctx.prisma.studentNote.count({ where: { studentId: input.studentId } }),
  ]).then(([lessonCount, paymentCount, noteCount]) => ({
    lessons: lessonCount,
    payments: paymentCount,
    notes: noteCount,
  })),
]);
```

**Update the log statement (around line 500-502):**

```typescript
// OLD:
console.log(
  `Found student with ${student.Lesson.length} lessons, ${student.Payment.length} payments, ${student.StudentNote.length} notes`,
);

// NEW:
console.log(
  `Found student with ${counts.lessons} lessons, ${counts.payments} payments, ${counts.notes} notes`,
);
```

**Update the deletion logic (lines 517-538):**

```typescript
// Replace student.StudentNote.length with counts.notes
if (counts.notes > 0) {
  console.log(`Deleting ${counts.notes} student notes...`);
  await tx.studentNote.deleteMany({
    where: { studentId: input.studentId },
  });
}

// Replace student.Payment.length with counts.payments
if (counts.payments > 0) {
  console.log(`Deleting ${counts.payments} payments...`);
  await tx.payment.deleteMany({
    where: { studentId: input.studentId },
  });
}

// Replace student.Lesson.length with counts.lessons
if (counts.lessons > 0) {
  console.log(`Deleting ${counts.lessons} lessons...`);
  await tx.lesson.deleteMany({
    where: { studentId: input.studentId },
  });
}
```

#### Step 2: Test the Changes

```bash
# Run type check
pnpm type-check

# Start dev server
pnpm dev

# Test student deletion in admin panel
# Navigate to: http://localhost:3100/admin/students
# Delete a test student and verify it works
```

#### Verification:

- Check console logs show correct counts
- Deletion completes faster
- No errors in console

**Expected Result:** Student deletion is 70-90% faster, especially for students with many related records.

---

## Phase 2: Schema Changes

### 2.1 Add Notification Composite Index (2 minutes)

**Estimated Impact:** 40-50% faster notification queries

#### Step 1: Update Schema

**File:** `prisma/schema.prisma`

**Find the Notification model:**

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  message   String
  isRead    Boolean  @default(false)
  type      String   @default("INFO")
  link      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  User      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([createdAt])
  @@index([userId])
  @@index([userId, isRead, createdAt]) // NEW: Add this line
}
```

#### Step 2: Create Migration

```bash
npx prisma migrate dev --name add_notification_composite_index
```

**Migration file will contain:**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Notification_userId_isRead_createdAt_idx"
  ON "Notification"("userId", "isRead", "createdAt");
```

#### Step 3: Deploy

```bash
pnpm prisma:migrate
```

#### Verification:

```sql
-- Check index created
SELECT indexname FROM pg_indexes
WHERE tablename = 'Notification' AND indexname LIKE '%userId_isRead%';
```

**Expected Result:** Notification badge and list load 40-50% faster.

---

### 2.2 Add BlockedDateRange Type Index (2 minutes)

**Estimated Impact:** 30-40% faster blocked date queries

#### Step 1: Update Schema

**File:** `prisma/schema.prisma`

```prisma
model BlockedDateRange {
  id          String          @id @default(cuid())
  title       String
  description String?
  startDate   DateTime
  endDate     DateTime
  type        BlockedDateType @default(TRAVEL)
  createdById String
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  User        User            @relation(fields: [createdById], references: [id])

  @@index([startDate])
  @@index([endDate])
  @@index([startDate, endDate])
  @@index([createdById])
  @@index([type, startDate, endDate]) // NEW: Add this line
}
```

#### Step 2: Create and Deploy Migration

```bash
npx prisma migrate dev --name add_blocked_date_type_index
pnpm prisma:migrate
```

**Expected Result:** Blocked date filtering 30-40% faster.

---

## Phase 3: Query Optimizations

### 3.1 Optimize getStudents Query (15 minutes)

**Estimated Impact:** 40-60% faster + improved security

#### Step 1: Update Student Queries

**File:** `src/features/admin/api/queries/student/studentQueries.ts`

**Find getStudents query (around line 72-87):**

```typescript
// OLD CODE:
const [students, total] = await Promise.all([
  ctx.prisma.student.findMany({
    where,
    include: {
      User: true,  // ❌ Over-fetching
      Lesson: {
        orderBy: { startTime: "desc" },
        take: 1,
      },
    },
    orderBy: {
      User: { name: "asc" },
    },
    skip: input?.page ? (input.page - 1) * (input.limit ?? 100) : undefined,
    take: input?.limit ?? 100,
  }),
  ctx.prisma.student.count({ where }),
]);
```

**Replace with:**

```typescript
// NEW CODE (OPTIMIZED):
const [students, total] = await Promise.all([
  ctx.prisma.student.findMany({
    where,
    select: {
      id: true,
      userId: true,
      phone: true,
      level: true,
      isApproved: true,
      approvedAt: true,
      maxLessonsPerWeek: true,
      createdAt: true,
      customPricingEnabled: true,
      User: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          // Explicitly exclude: password, emailVerified, updatedAt
        },
      },
      // Replace full Lesson loading with just a count
      _count: {
        select: {
          Lesson: {
            where: { status: "SCHEDULED" },
          },
        },
      },
    },
    orderBy: {
      User: { name: "asc" },
    },
    skip: input?.page ? (input.page - 1) * (input.limit ?? 100) : undefined,
    take: input?.limit ?? 100,
  }),
  ctx.prisma.student.count({ where }),
]);
```

#### Step 2: Update TypeScript Types

**If you have type definitions that expect the old structure, update them:**

```typescript
// Update any type that expects Lesson array:
type StudentWithLesson = {
  // ... other fields
  _count: {
    Lesson: number;
  };
};
```

#### Step 3: Update Frontend Components

**If your frontend displays the most recent lesson, update the component:**

**Example:**
```typescript
// OLD:
{student.Lesson?.[0]?.startTime}

// NEW (if you need the most recent lesson, fetch separately):
// Consider adding a separate query or showing just the count
{student._count.Lesson} scheduled lessons
```

#### Verification:

```bash
# Test student list page
pnpm dev
# Navigate to /admin/students
# Check network tab: response payload should be smaller
# Check console: no password hashes in student data
```

**Expected Result:**
- 40-60% faster student list loading
- 50% smaller response payload
- No password hashes exposed

---

### 3.2 Optimize Time Slot Queries (15 minutes)

**Estimated Impact:** 15-25% faster calendar loading

#### Step 1: Update Time Slot Query

**File:** `src/features/admin/api/queries/schedule/timeSlotQueries.ts`

**Find getTimeSlots query (around line 36-72):**

```typescript
// OLD CODE:
const timeSlots = await ctx.prisma.rinkTimeSlot.findMany({
  where: {
    rinkId: input.rinkId,
    startTime: input.startDate
      ? {
          gte: input.startDate,
          ...(input.endDate && { lte: input.endDate }),
        }
      : undefined,
    isActive: true,
  },
  include: {
    Rink: true,  // ❌ Over-fetching
    Lesson: {
      select: {
        id: true,
        type: true,
        price: true,
        status: true,
        notes: true,
        Student: {
          select: {
            id: true,
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    },
  },
  orderBy: { startTime: "asc" },
});
```

**Replace with:**

```typescript
// NEW CODE (OPTIMIZED):
const timeSlots = await ctx.prisma.rinkTimeSlot.findMany({
  where: {
    rinkId: input.rinkId,
    startTime: input.startDate
      ? {
          gte: input.startDate,
          ...(input.endDate && { lte: input.endDate }),
        }
      : undefined,
    isActive: true,
  },
  select: {
    id: true,
    rinkId: true,
    startTime: true,
    endTime: true,
    maxStudents: true,
    isActive: true,
    createdAt: true,
    Rink: {
      select: {
        id: true,
        name: true,
        timezone: true,
        address: true,
        // Exclude: maxCapacity, createdAt, updatedAt
      },
    },
    Lesson: {
      select: {
        id: true,
        type: true,
        price: true,
        status: true,
        notes: true,
        Student: {
          select: {
            id: true,
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    },
  },
  orderBy: { startTime: "asc" },
});
```

#### Verification:

```bash
pnpm type-check
pnpm dev
# Test calendar view loads correctly
```

**Expected Result:** 15-25% faster calendar loading with cleaner data structure.

---

### 3.3 Add Payment Query Optimization (10 minutes)

**Note:** The payment sorting by student name will automatically benefit from the User.name index added in Phase 1.1.2.

#### Verification:

```bash
# Test payment page with "Sort by Name" option
# Navigate to /admin/payments
# Sort by student name (ascending and descending)
# Check network tab: should be 60-80% faster
```

**Expected Result:** Payment sorting by name is 60-80% faster after User.name index is in place.

---

## Performance Testing

### Before and After Comparison

#### 1. Set Up Performance Monitoring

**Create test script:** `scripts/performance-test.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function measureQuery(name: string, fn: () => Promise<any>) {
  const start = performance.now();
  await fn();
  const duration = performance.now() - start;
  console.log(`${name}: ${duration.toFixed(2)}ms`);
  return duration;
}

async function runTests() {
  console.log('Running performance tests...\n');

  // Test 1: Payment list sorted by name
  await measureQuery('Payment list (sorted by name)', async () => {
    await prisma.payment.findMany({
      take: 100,
      orderBy: {
        Student: {
          User: { name: 'asc' },
        },
      },
      include: {
        Student: {
          include: { User: true },
        },
      },
    });
  });

  // Test 2: Student list
  await measureQuery('Student list', async () => {
    await prisma.student.findMany({
      take: 100,
      include: {
        User: true,
      },
    });
  });

  // Test 3: Notification list
  await measureQuery('Notification list (filtered)', async () => {
    const users = await prisma.user.findMany({ take: 1 });
    if (users[0]) {
      await prisma.notification.findMany({
        where: {
          userId: users[0].id,
          isRead: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    }
  });

  // Test 4: Time slot query
  await measureQuery('Time slot query (calendar)', async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await prisma.rinkTimeSlot.findMany({
      where: {
        startTime: {
          gte: now,
          lte: futureDate,
        },
        isActive: true,
      },
      include: {
        Rink: true,
        Lesson: true,
      },
    });
  });

  await prisma.$disconnect();
}

runTests().catch(console.error);
```

#### 2. Run Before Optimization

```bash
# Run before implementing optimizations
npx tsx scripts/performance-test.ts > performance-before.txt
```

#### 3. Run After Each Phase

```bash
# After Phase 1
npx tsx scripts/performance-test.ts > performance-phase1.txt

# After Phase 2
npx tsx scripts/performance-test.ts > performance-phase2.txt

# After Phase 3
npx tsx scripts/performance-test.ts > performance-phase3.txt
```

#### 4. Compare Results

```bash
# Compare performance improvements
diff performance-before.txt performance-phase3.txt
```

---

## Rollback Procedures

### Rollback Phase 1.1 (Connection Pooling)

```bash
# 1. Restore original .env
git checkout HEAD -- .env

# 2. Restore prisma/schema.prisma
git checkout HEAD -- prisma/schema.prisma

# 3. Regenerate Prisma client
pnpm prisma generate

# 4. Restart
pnpm dev
```

### Rollback Phase 1.2 (User.name Index)

```bash
# 1. Remove index
npx prisma migrate dev --name remove_user_name_index

# Add to migration.sql:
# DROP INDEX IF EXISTS "User_name_idx";

# 2. Update schema.prisma (remove @@index([name]) line)

# 3. Deploy
pnpm prisma:migrate
```

### Rollback Code Changes

```bash
# Rollback specific file
git checkout HEAD -- src/features/admin/api/queries/student/studentQueries.ts

# Or rollback all changes
git reset --hard HEAD

# Restart
pnpm dev
```

---

## Monitoring After Deployment

### 1. Check Neon Dashboard

**Metrics to watch:**
- Query execution time (p50, p95, p99)
- Connection count
- CPU and memory usage
- Slow query log

**Expected changes:**
- Lower p95/p99 query times
- Fewer connection spikes
- No increase in CPU/memory

### 2. Application Logs

**Add logging to measure impact:**

```typescript
// Add to src/lib/prisma.ts
const prisma = new PrismaClient().$extends({
  query: {
    $allOperations: async ({ operation, model, args, query }) => {
      const start = Date.now();
      const result = await query(args);
      const duration = Date.now() - start;

      if (duration > 100) {
        console.warn(`[SLOW QUERY] ${model}.${operation} took ${duration}ms`);
      }

      return result;
    },
  },
});
```

### 3. Client-Side Performance

**Monitor in browser:**
```typescript
// Add to TRPC client configuration
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === 'development' ||
        (opts.direction === 'down' && opts.result instanceof Error),
    }),
    // ... other links
  ],
});
```

**Check DevTools:**
- Network tab: Response times for API calls
- Performance tab: Long tasks and main thread blocking

---

## Success Criteria

### Phase 1 Success Metrics

- [ ] Connection pooling configured (verify in logs)
- [ ] User.name index created (verify with SQL query)
- [ ] Student deletion 70%+ faster (measure before/after)
- [ ] No new errors in logs
- [ ] All tests passing

### Phase 2 Success Metrics

- [ ] Notification index created
- [ ] BlockedDateRange index created
- [ ] Notification queries 40%+ faster
- [ ] Blocked date queries 30%+ faster
- [ ] No migration errors

### Phase 3 Success Metrics

- [ ] Student list 40%+ faster
- [ ] No password hashes in API responses
- [ ] Calendar loading 15%+ faster
- [ ] All TypeScript types updated
- [ ] Frontend components working correctly

### Overall Success

- [ ] **Target: 45-65% overall performance improvement**
- [ ] No regressions in functionality
- [ ] All test suites passing
- [ ] Production deployment successful
- [ ] Monitoring shows expected improvements

---

## Troubleshooting

### Issue: Migration Fails with "Index Already Exists"

**Solution:**
```sql
-- Use IF NOT EXISTS
CREATE INDEX CONCURRENTLY IF NOT EXISTS "index_name" ON "table"("column");
```

### Issue: Type Errors After select Changes

**Solution:**
```typescript
// Regenerate Prisma types
pnpm prisma generate

// Update component imports to use generated types
import type { Prisma } from '@prisma/client';

type StudentWithUser = Prisma.StudentGetPayload<{
  select: {
    // your select fields
  };
}>;
```

### Issue: Queries Still Slow After Index

**Debug steps:**
1. Verify index exists:
```sql
SELECT * FROM pg_indexes WHERE tablename = 'YourTable';
```

2. Check query plan:
```sql
EXPLAIN ANALYZE
SELECT * FROM "User" WHERE name = 'John' ORDER BY name;
```

3. Look for "Index Scan" vs "Seq Scan" in output

### Issue: Connection Pool Exhaustion

**Solution:**
```env
# Increase connection limit
DATABASE_URL="...&connection_limit=20&pool_timeout=30"
```

**Or check for connection leaks:**
```typescript
// Ensure prisma.$disconnect() is called
// Check for unclosed transactions
```

---

## Final Checklist

### Pre-Implementation

- [ ] Backup database (Neon automatic snapshots enabled)
- [ ] Create feature branch: `git checkout -b feat/database-optimizations`
- [ ] Run baseline performance tests
- [ ] Review all code changes with team
- [ ] Schedule deployment window

### During Implementation

- [ ] Implement Phase 1 (quick wins)
- [ ] Test Phase 1 in development
- [ ] Implement Phase 2 (schema changes)
- [ ] Test Phase 2 in development
- [ ] Implement Phase 3 (query optimizations)
- [ ] Test Phase 3 in development
- [ ] Run full test suite: `pnpm test:all`
- [ ] Type check: `pnpm type-check`
- [ ] Lint: `pnpm lint`

### Post-Implementation

- [ ] Deploy to staging environment
- [ ] Run performance tests on staging
- [ ] Verify all metrics improved
- [ ] Deploy to production
- [ ] Monitor for 24 hours
- [ ] Compare before/after metrics
- [ ] Document actual performance gains
- [ ] Update team on results

---

**Implementation Timeline:**
- Phase 1: 1-2 hours
- Phase 2: 2-3 hours
- Phase 3: 3-4 hours
- Testing & Verification: 2-3 hours
- **Total: 8-12 hours**

**Recommended Approach:** Implement in phases over 2-3 days with monitoring between each phase.

---

**Questions or Issues During Implementation?**
- Check DATABASE_OPTIMIZATION_REPORT.md for detailed analysis
- Review Prisma documentation: https://www.prisma.io/docs/
- Check Neon documentation: https://neon.tech/docs/
- Consult with database team before proceeding if uncertain
