# Lesson Type Migration Guide

## Overview

This guide explains how to migrate existing lessons in the database to use the new lesson type system. Lessons created before the lesson type feature was implemented may not have a `type` field set, which can cause display issues in the admin calendar.

## What This Migration Does

The migration script will:

1. ✅ Find all lessons without a `type` set
2. ✅ Set them to `PRIVATE` (the most common lesson type)
3. ✅ Update pricing if needed:
   - Uses student's custom pricing if enabled
   - Falls back to default pricing if no custom pricing
   - Only updates price if it's currently 0 or not set
4. ✅ Create default pricing if it doesn't exist
5. ✅ Provide detailed console output showing progress

## Before Running Migration

### 1. Backup Your Database

**IMPORTANT:** Always backup your database before running migrations!

```bash
# Using Docker
docker exec yura-scheduler-db pg_dump -U postgres yura_scheduler_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# Or using pg_dump directly
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Check Current State

You can manually check how many lessons need migration:

```sql
-- Connect to your database
psql $DATABASE_URL

-- Check lessons without type
SELECT COUNT(*) FROM "Lesson" WHERE "type" IS NULL;

-- See details of lessons without type
SELECT
  l.id,
  l."startTime",
  l.price,
  u.name as student_name
FROM "Lesson" l
JOIN "Student" s ON l."studentId" = s.id
JOIN "User" u ON s."userId" = u.id
WHERE l."type" IS NULL;
```

## Running the Migration

### Option 1: Using npm/pnpm script (Recommended)

```bash
pnpm migrate:lesson-types
```

Or with npm:

```bash
npm run migrate:lesson-types
```

### Option 2: Direct execution

```bash
npx tsx scripts/migrate-lesson-types.ts
```

## Expected Output

The script will show detailed progress:

```
🔄 Starting lesson type migration...

📊 Found 15 lessons without type set

✅ Updated lesson for Jane Smith - Set to PRIVATE ($75)
✅ Updated lesson for John Doe - Set to PRIVATE ($90)
✅ Updated lesson for Alice Johnson - Set to PRIVATE ($75)
...

📈 Migration Summary:
   ✅ Successfully updated: 15 lessons

🎉 Migration completed successfully!

✨ All done!
```

## What If Something Goes Wrong?

### Restore from Backup

If you need to restore your database:

```bash
# Using Docker
cat backup_TIMESTAMP.sql | docker exec -i yura-scheduler-db psql -U postgres yura_scheduler_dev

# Or directly
psql $DATABASE_URL < backup_TIMESTAMP.sql
```

### Common Issues

#### Issue: "No default pricing found"
**Solution:** The script will automatically create default pricing:
- Private: $75
- Choreography: $90
- Group: $45
- Competition Prep: $95

#### Issue: Script fails on specific lessons
**Solution:** The script will continue and show which lessons failed. You can manually update those:

```sql
UPDATE "Lesson"
SET "type" = 'PRIVATE', "price" = 75
WHERE id = 'failing-lesson-id';
```

## After Migration

### 1. Verify Results

Check that all lessons now have types:

```sql
-- Should return 0
SELECT COUNT(*) FROM "Lesson" WHERE "type" IS NULL;

-- Check type distribution
SELECT "type", COUNT(*) FROM "Lesson" GROUP BY "type";
```

### 2. Test in Admin Interface

1. Open the admin calendar
2. Click on various time slots with lessons
3. Verify all lessons show proper type badges
4. Try editing a lesson type to confirm it works

### 3. Update Any Incorrect Types

If some lessons were incorrectly set to PRIVATE, you can update them:

**Via Admin UI:**
1. Click on the time slot
2. Click the edit (pencil) icon next to the lesson
3. Select the correct lesson type
4. Click "Update Lesson Type"

**Via SQL:**
```sql
-- Update specific lesson
UPDATE "Lesson"
SET "type" = 'CHOREOGRAPHY', "price" = 90
WHERE id = 'lesson-id';

-- Update multiple lessons by student
UPDATE "Lesson" l
SET "type" = 'CHOREOGRAPHY', "price" = 90
WHERE l."studentId" IN (
  SELECT s.id FROM "Student" s
  JOIN "User" u ON s."userId" = u.id
  WHERE u.name = 'Student Name'
);
```

## Migration Script Details

### Location
`scripts/migrate-lesson-types.ts`

### Dependencies
- `@prisma/client` - Database access
- `tsx` - TypeScript execution

### Safety Features
1. **Transaction safety** - Uses Prisma transactions
2. **Error handling** - Continues on individual failures
3. **Detailed logging** - Shows exactly what's being updated
4. **Price preservation** - Only updates prices if they're 0 or unset
5. **Custom pricing respect** - Uses student custom rates when available

### Default Values Used

| Field | Default Value | Condition |
|-------|--------------|-----------|
| `type` | `PRIVATE` | Always applied to lessons without type |
| `price` | Student custom price | If `customPricingEnabled = true` |
| `price` | Default pricing | If no custom pricing |
| `price` | Not changed | If already set and > 0 |

## Testing the Migration

### In Development

```bash
# 1. Create test lesson without type
psql $DATABASE_URL -c "
  INSERT INTO \"Lesson\" (id, \"studentId\", \"rinkId\", \"startTime\", \"endTime\", duration, price, area, status)
  VALUES ('test-lesson-1', 'student-id', 'rink-id', NOW(), NOW() + INTERVAL '1 hour', 60, 0, 'MAIN_RINK', 'SCHEDULED')
"

# 2. Run migration
pnpm migrate:lesson-types

# 3. Verify
psql $DATABASE_URL -c "SELECT id, type, price FROM \"Lesson\" WHERE id = 'test-lesson-1'"
```

### Dry Run

To see what would be updated without making changes, you can modify the script temporarily:

```typescript
// In scripts/migrate-lesson-types.ts
// Comment out the update and add console.log instead:

// await prisma.lesson.update({ ... });
console.log(`Would update lesson ${lesson.id} to PRIVATE with price ${price}`);
```

## Rollback Plan

If you need to undo the migration:

### Option 1: Restore from Backup
```bash
psql $DATABASE_URL < backup_TIMESTAMP.sql
```

### Option 2: Manual Rollback
```sql
-- Reset all PRIVATE lessons to NULL (only if ALL were migrated)
UPDATE "Lesson" SET "type" = NULL WHERE "type" = 'PRIVATE';

-- Or more selective rollback based on updateAt timestamp
UPDATE "Lesson"
SET "type" = NULL
WHERE "updatedAt" >= '2025-10-14 00:00:00'
  AND "type" = 'PRIVATE';
```

## Production Deployment

### Recommended Process

1. **Backup production database**
   ```bash
   pg_dump $PRODUCTION_DATABASE_URL > prod_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test on staging first**
   ```bash
   # Copy production data to staging
   # Run migration on staging
   pnpm migrate:lesson-types
   # Verify results
   ```

3. **Schedule maintenance window**
   - Notify users
   - Put app in maintenance mode if needed

4. **Run migration**
   ```bash
   NODE_ENV=production pnpm migrate:lesson-types
   ```

5. **Verify and monitor**
   - Check logs
   - Test critical user flows
   - Monitor error rates

6. **Keep backup for 7 days**
   - Don't delete backup immediately
   - Monitor for any issues

## FAQs

### Q: Will this affect active lessons?
**A:** No, lessons can continue to be booked and managed during migration. The migration only sets the `type` field which doesn't affect scheduling.

### Q: What if I have custom lesson types?
**A:** The migration only uses standard types (PRIVATE, CHOREOGRAPHY, GROUP, COMPETITION_PREP). If you have custom types, you'll need to manually update after migration.

### Q: Can I run this multiple times?
**A:** Yes! The script is idempotent - it only updates lessons without a type set, so running it multiple times won't cause issues.

### Q: How long does it take?
**A:** For most databases (< 1000 lessons), it takes 1-5 seconds. Larger databases may take longer but should still complete in under a minute.

### Q: Will students be notified?
**A:** No, the migration runs silently. Students are only notified when lesson types are changed through the admin UI.

## Support

If you encounter any issues:

1. Check the console output for specific error messages
2. Verify your database connection
3. Ensure you have write permissions on the database
4. Check the migration script logs
5. Restore from backup if needed

---

**Last Updated:** 2025-10-14
**Version:** 3.2.1
**Script:** `scripts/migrate-lesson-types.ts`
