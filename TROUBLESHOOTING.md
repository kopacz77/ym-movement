# Troubleshooting Guide - Yura Scheduler v3

## 🚨 Quick Fixes

### Application Won't Start
```bash
# Clear cache and reinstall
rm -rf node_modules .next pnpm-lock.yaml
pnpm install
pnpm build

# Check for port conflicts
lsof -i :3000
kill -9 <PID>
```

### Database Connection Issues
```bash
# Test database connection
pnpm prisma studio

# Reset database (development only)
pnpm prisma migrate reset

# Check connection string
echo $DATABASE_URL
```

### Authentication Issues
```bash
# Clear Next.js cache
rm -rf .next

# Check environment variables
echo $NEXTAUTH_SECRET
echo $NEXTAUTH_URL
```

## ✅ Recently Resolved Issues (v3.2.0)

### Student Names Showing as "Unknown" in Payments
**Status:** FIXED ✅  
**Issue:** Payment table displayed "Unknown" instead of student names  
**Root Cause:** Incorrect Prisma relation naming (`student.user.name` vs `Student.User.name`)  
**Solution:** Updated `PaymentTable.tsx:111` to use PascalCase relations consistently  

### Past Time Slot Booking Prevention  
**Status:** FIXED ✅  
**Issue:** Users could book lessons for past time slots  
**Solution:** Implemented dual-layer validation:
- Frontend: Filter past slots in `availabilityQueries.ts` 
- Backend: Server-side validation in `bookingQueries.ts`

### Password Recovery Not Working
**Status:** FIXED ✅  
**Issue:** TRPC API routing mismatch in password reset flow  
**Root Cause:** `ResetPasswordForm` called wrong endpoints (`admin.auth.*` vs `passwordReset.*`)  
**Solution:** Updated API calls and standardized on TRPC mutations

### Inconsistent Blocked Dates Colors
**Status:** FIXED ✅  
**Issue:** Travel dates shown in red/blue instead of neutral colors  
**Solution:** Standardized color scheme:
- Travel: Gray (neutral)
- Competition: Red (important)
- Other: Gray (neutral)

### Notification System Not Active
**Status:** ENHANCED ✅  
**Issue:** Notification UI existed but no notifications were generated  
**Solution:** Integrated `createNotification` helper into lesson booking flow

## 🔍 Common Issues

### Development Environment

#### Issue: "Cannot find module" errors
**Symptoms:**
- Import errors for custom modules
- TypeScript compilation failures

**Solutions:**
```bash
# Clear TypeScript cache
rm -rf .next tsconfig.tsbuildinfo

# Regenerate Prisma client
pnpm prisma generate

# Check tsconfig.json paths
pnpm type-check
```

#### Issue: Hot reload not working
**Symptoms:**
- Changes not reflected in browser
- Dev server not detecting file changes

**Solutions:**
```bash
# For WSL users - increase file watchers
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Restart dev server
pnpm dev

# Clear browser cache
Ctrl+Shift+R (Chrome/Firefox)
```

#### Issue: Database schema out of sync
**Symptoms:**
- Prisma client errors
- Missing tables/columns

**Solutions:**
```bash
# Check migration status
pnpm prisma migrate status

# Apply pending migrations
pnpm prisma migrate deploy

# If corrupted, reset (development only)
pnpm prisma migrate reset
pnpm prisma db seed
```

### Authentication & Authorization

#### Issue: Login fails with 401 error
**Symptoms:**
- Redirected to login page after submitting credentials
- "Unauthorized" error in console

**Diagnostics:**
```bash
# Check if user exists in database
pnpm prisma studio
# Navigate to User table

# Check password hash
# Ensure bcrypt is working correctly
```

**Solutions:**
```bash
# Create test user (if missing)
node scripts/create-admin-user.js

# Reset user password
node scripts/update-admin-password.js

# Check NEXTAUTH_SECRET
grep NEXTAUTH_SECRET .env
```

#### Issue: Session expires immediately
**Symptoms:**
- Logged out after page refresh
- Session not persisting

**Solutions:**
```bash
# Check NEXTAUTH_URL matches your domain
echo $NEXTAUTH_URL

# Clear browser cookies
# Developer Tools > Application > Clear Storage

# Check database sessions table
# Some sessions might be corrupted
```

#### Issue: Wrong user role/permissions
**Symptoms:**
- Admin features not accessible
- Student sees admin content

**Solutions:**
```sql
-- Check user role in database
SELECT id, email, role FROM "User" WHERE email = 'your-email@example.com';

-- Update user role if needed
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

### Database Issues

#### Issue: Connection timeout
**Symptoms:**
- "Connection terminated unexpectedly"
- Database queries hanging

**Diagnostics:**
```bash
# Test direct connection
psql $DATABASE_URL

# Check connection pool
# Look for connection limit issues
```

**Solutions:**
```bash
# Increase connection timeout in schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connectionLimit = 20
  poolTimeout = 60
}

# Restart database service
sudo systemctl restart postgresql
```

#### Issue: Migration conflicts
**Symptoms:**
- Migration fails with constraint errors
- "Relation already exists" errors

**Solutions:**
```bash
# Check migration history
pnpm prisma migrate status

# Resolve conflicts manually
pnpm prisma migrate resolve --applied "migration-name"

# Create new migration to fix conflicts
pnpm prisma migrate dev --name fix-constraints
```

#### Issue: Data corruption or inconsistency
**Symptoms:**
- Foreign key constraint violations
- Orphaned records

**Solutions:**
```sql
-- Find orphaned lessons (no user)
SELECT * FROM "Lesson" 
WHERE "studentId" NOT IN (SELECT "id" FROM "User");

-- Clean up orphaned records
DELETE FROM "Lesson" 
WHERE "studentId" NOT IN (SELECT "id" FROM "User");

-- Verify data integrity
SELECT table_name, column_name, constraint_name 
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
ON tc.constraint_name = ccu.constraint_name;
```

### Performance Issues

#### Issue: Slow page loads
**Symptoms:**
- Pages take >3 seconds to load
- High memory usage

**Diagnostics:**
```bash
# Analyze bundle size
pnpm analyze

# Check memory usage
npm run dev
# Monitor browser DevTools > Performance
```

**Solutions:**
```bash
# Enable production optimizations
NODE_ENV=production pnpm build
pnpm start

# Optimize images
# Ensure Next.js Image component is used
# Check image sizes and formats

# Database query optimization
# Add indexes for frequently queried columns
```

#### Issue: High memory usage
**Symptoms:**
- Node.js process using >1GB RAM
- Out of memory errors

**Solutions:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" pnpm dev

# Check for memory leaks
node --inspect pnpm dev
# Use Chrome DevTools Memory tab

# Optimize React components
# Use React.memo, useCallback, useMemo
```

### API & TRPC Issues

#### Issue: TRPC queries failing
**Symptoms:**
- "Failed to fetch" errors
- Queries return undefined

**Diagnostics:**
```bash
# Check TRPC router configuration
# Verify API routes are properly set up

# Check browser Network tab
# Look for 500/404 errors

# Check server logs
pnpm dev
# Look for router/procedure errors
```

**Solutions:**
```typescript
// Ensure proper error handling in TRPC procedures
.query(async ({ ctx, input }) => {
  try {
    // Your logic here
  } catch (error) {
    console.error('TRPC Error:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong'
    });
  }
});
```

#### Issue: Type safety errors
**Symptoms:**
- TypeScript errors in TRPC calls
- Runtime type mismatches

**Solutions:**
```bash
# Regenerate TRPC types
rm -rf .next
pnpm build

# Check Zod schemas match Prisma models
# Ensure input validation is correct

# Update TRPC client
pnpm install @trpc/client@latest @trpc/server@latest
```

### Security Issues

#### Issue: CSP violations
**Symptoms:**
- Content blocked by browser
- Console security warnings

**Solutions:**
```javascript
// Update next.config.js CSP header
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://accounts.google.com;
`;
```

#### Issue: Input sanitization not working
**Symptoms:**
- XSS vulnerabilities detected
- Unsanitized data in database

**Diagnostics:**
```bash
# Run security tests
pnpm test __tests__/security/

# Check sanitization hook usage
grep -r "useSanitizedInput" src/
```

**Solutions:**
```typescript
// Ensure all forms use sanitization
import { useSanitizedInput } from '@/hooks/useSanitizedInput';

const { sanitizeInput } = useSanitizedInput();
const cleanData = sanitizeInput(userInput);
```

### Docker Issues

#### Issue: Docker container won't start
**Symptoms:**
- Container exits immediately
- "Cannot find module" in container logs

**Diagnostics:**
```bash
# Check container logs
docker logs yura-scheduler-app

# Inspect container
docker exec -it yura-scheduler-app sh

# Check file permissions
ls -la /app/
```

**Solutions:**
```bash
# Rebuild with no cache
docker-compose build --no-cache

# Check Dockerfile
# Ensure all files are copied correctly

# Verify environment variables
docker-compose config
```

#### Issue: Database container issues
**Symptoms:**
- Connection refused to PostgreSQL
- Database not accepting connections

**Solutions:**
```bash
# Check database container status
docker-compose ps

# View database logs
docker-compose logs postgres

# Reset database volume
docker-compose down -v
docker-compose up -d postgres
```

### Production Issues

#### Issue: 500 Internal Server Error
**Symptoms:**
- Server errors in production
- Application crashes

**Diagnostics:**
```bash
# Check server logs
pm2 logs yura-scheduler

# Check system resources
htop
df -h

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

**Solutions:**
```bash
# Restart application
pm2 restart yura-scheduler

# Check environment variables
pm2 env 0

# Monitor resource usage
pm2 monit
```

#### Issue: SSL/TLS certificate problems
**Symptoms:**
- "Not secure" warning in browser
- Certificate expired errors

**Solutions:**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test certificate renewal
sudo certbot renew --dry-run

# Update Nginx configuration
sudo nginx -t
sudo systemctl reload nginx
```

## 🛠️ Development Tools

### Debugging Commands

```bash
# Check all environment variables
printenv | grep -E "(DATABASE|NEXTAUTH|GOOGLE)"

# Test database connection
pnpm prisma db pull

# Validate TypeScript
pnpm type-check

# Run all tests
pnpm test

# Check for security vulnerabilities
pnpm audit

# Analyze bundle size
pnpm analyze
```

### Log Analysis

```bash
# Watch logs in real-time
tail -f .next/trace

# Search for specific errors
grep -r "Error:" src/

# Check memory usage
ps aux | grep node

# Monitor file changes
watch -n 1 'ls -la src/'
```

### Database Debugging

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE tablename IN ('User', 'Lesson', 'RinkTimeSlot')
ORDER BY n_distinct DESC;

-- Find slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check active connections
SELECT datname, usename, state, query
FROM pg_stat_activity
WHERE state = 'active';
```

## 📞 Getting Help

### Before Asking for Help

1. **Check this guide** for your specific issue
2. **Search GitHub issues** for similar problems
3. **Check the logs** for error messages
4. **Try the quick fixes** listed above
5. **Gather information** about your environment

### Information to Include

When reporting issues, include:

- **Operating System**: macOS, Windows, Linux distribution
- **Node.js version**: `node --version`
- **Package manager**: `pnpm --version` or `npm --version`
- **Environment**: Development, staging, production
- **Error messages**: Full error text and stack traces
- **Steps to reproduce**: What you were doing when the error occurred
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened

### Support Channels

- 📖 **Documentation**: README.md, API.md, DEPLOYMENT.md
- 🐛 **Bug Reports**: GitHub Issues
- 💬 **Questions**: GitHub Discussions
- 🔒 **Security**: Email security team directly
- 📧 **Urgent Issues**: Contact system administrator

### Useful Commands for Issue Reports

```bash
# System information
uname -a
node --version
pnpm --version

# Project information
git log --oneline -5
pnpm list
pnpm audit

# Environment check
echo "DATABASE_URL=$DATABASE_URL"
echo "NODE_ENV=$NODE_ENV"
echo "NEXTAUTH_URL=$NEXTAUTH_URL"

# Recent logs
tail -n 50 logs/combined.log
```

Remember: The more information you provide, the faster we can help resolve your issue!