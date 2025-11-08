# Database Optimization Quick Reference Card

**Last Updated:** 2025-11-08
**Health Score:** 78/100 (GOOD)
**Expected Overall Gain:** 45-65% performance improvement

---

## 🚀 Quick Start: 3 Critical Fixes (17 minutes)

### 1. Add Connection Pooling (5 min) - 30-50% improvement

```bash
# .env
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/db?sslmode=require"
```

### 2. Add User.name Index (2 min) - 60-80% faster payments

```prisma
// schema.prisma - User model
@@index([name])
```

```bash
npx prisma migrate dev --name add_user_name_index
```

### 3. Optimize Student Deletion (10 min) - 70-90% faster

**File:** `src/features/admin/api/queries/student/studentQueries.ts:483-491`

```typescript
// Replace include with count
const [student, counts] = await Promise.all([
  ctx.prisma.student.findUnique({
    where: { id: input.studentId },
    select: { id: true, userId: true, User: { select: { email: true, name: true } } },
  }),
  Promise.all([
    ctx.prisma.lesson.count({ where: { studentId: input.studentId } }),
    ctx.prisma.payment.count({ where: { studentId: input.studentId } }),
    ctx.prisma.studentNote.count({ where: { studentId: input.studentId } }),
  ]).then(([lessonCount, paymentCount, noteCount]) => ({
    lessons: lessonCount, payments: paymentCount, notes: noteCount,
  })),
]);
```

---

## 📋 Additional Recommended Indexes

### Notification Composite Index (2 min)

```prisma
// schema.prisma - Notification model
@@index([userId, isRead, createdAt])
```

### BlockedDateRange Type Index (2 min)

```prisma
// schema.prisma - BlockedDateRange model
@@index([type, startDate, endDate])
```

---

## 🔍 Performance Testing

### Before Optimization

```bash
npx tsx scripts/performance-test.ts > performance-before.txt
```

### After Optimization

```bash
npx tsx scripts/performance-test.ts > performance-after.txt
diff performance-before.txt performance-after.txt
```

---

## 📊 Expected Performance Gains

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Payment list (sorted) | 300ms | 80ms | 73% |
| Student deletion | 800ms | 150ms | 81% |
| Student list | 200ms | 90ms | 55% |
| Notifications | 150ms | 75ms | 50% |
| Calendar view | 250ms | 180ms | 28% |

---

## 🛠️ Common Commands

```bash
# Generate Prisma client
pnpm prisma generate

# Create migration
npx prisma migrate dev --name your_migration_name

# Deploy migration
pnpm prisma:migrate

# Type check
pnpm type-check

# Run tests
pnpm test:all

# Dev server
pnpm dev
```

---

## 🔄 Rollback

```bash
# Rollback code changes
git checkout HEAD -- path/to/file

# Rollback schema changes
npx prisma migrate dev --name revert_changes
# Add DROP INDEX in migration.sql
```

---

## 📚 Full Documentation

1. **DATABASE_OPTIMIZATION_REPORT.md** - Complete analysis (28KB)
2. **OPTIMIZATION_IMPLEMENTATION_GUIDE.md** - Step-by-step (23KB)
3. **OPTIMIZATION_SUMMARY.txt** - Visual summary (12KB)

---

## ✅ Implementation Checklist

**Phase 1: Quick Wins (1-2 hours)**
- [ ] Add connection pooling
- [ ] Add User.name index
- [ ] Optimize student deletion
- [ ] Test and verify improvements

**Phase 2: Schema Changes (2-3 hours)**
- [ ] Add Notification composite index
- [ ] Add BlockedDateRange type index
- [ ] Run migrations
- [ ] Test queries

**Phase 3: Query Optimizations (3-4 hours)**
- [ ] Optimize getStudents query
- [ ] Optimize time slot queries
- [ ] Update TypeScript types
- [ ] Test all affected components

**Final Steps**
- [ ] Run full test suite
- [ ] Deploy to staging
- [ ] Monitor performance
- [ ] Deploy to production
- [ ] Measure actual gains

---

## 🎯 Success Criteria

- [ ] 45-65% overall performance improvement
- [ ] All tests passing
- [ ] No regressions
- [ ] Monitoring shows expected gains
- [ ] No new errors in logs

---

## 🆘 Troubleshooting

### Migration fails?
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS "index_name" ...
```

### Type errors?
```bash
pnpm prisma generate
```

### Queries still slow?
```sql
EXPLAIN ANALYZE SELECT ... ;
# Look for "Index Scan" vs "Seq Scan"
```

---

**Time Investment:** 8-12 hours total
**Expected ROI:** 45-65% performance improvement
**Risk Level:** Low (with proper testing)
**Recommended Timeline:** 2-3 days with monitoring

**Questions?** See full documentation in DATABASE_OPTIMIZATION_REPORT.md
