# Test Fixes for YM Movement Playwright Tests

## Core Issues Identified

1. **Wrong Auth Route**: Tests use `/auth/signin` but app uses `/auth/login`
2. **Wrong Form Selectors**: Tests use `input[name="email"]` but app uses `input[id="email"]`
3. **Wrong Redirects**: Admin goes to `/admin/dashboard`, not `/admin`
4. **Title Expectations**: App title is "Yura Scheduler", not "Sign In"

## Quick Fixes Applied

### 1. Fixed Helper Functions (`tests/helpers/test-utils.ts`)
- Changed `/auth/signin` → `/auth/login`
- Changed `input[name="email"]` → `input[id="email"]`
- Changed `input[name="password"]` → `input[id="password"]`
- Updated admin redirect to `/admin/dashboard`
- Updated student redirect to `/student/dashboard`

### 2. Fixed Authentication Tests (`tests/authentication.spec.ts`)
- Fixed page title expectation to `/Yura Scheduler/`
- Updated all form selectors to use `id` instead of `name`
- Updated button text from "Sign In" to "Login"
- Added proper page content checks

## Systematic Fix Approach

To fix ALL failing tests quickly, run these global replacements:

```bash
# Fix auth route
find tests/ -name "*.spec.ts" -exec sed -i 's|/auth/signin|/auth/login|g' {} +

# Fix form selectors
find tests/ -name "*.spec.ts" -exec sed -i 's|input\[name="email"\]|input[id="email"]|g' {} +
find tests/ -name "*.spec.ts" -exec sed -i 's|input\[name="password"\]|input[id="password"]|g' {} +

# Fix page title expectations
find tests/ -name "*.spec.ts" -exec sed -i 's|/Sign In/|/Yura Scheduler/|g' {} +

# Fix admin dashboard URL
find tests/ -name "*.spec.ts" -exec sed -i 's|/admin")|/admin/dashboard")|g' {} +
```

## Test Status After Fixes

### ✅ Working Tests
- `authentication.spec.ts` → `should display login form` - **PASSED**

### 🔄 Need Similar Fixes
All other tests need the same pattern of fixes:
- Route corrections
- Selector updates  
- Content expectations

## Next Steps

1. **Run Batch Fixes**: Apply the sed commands above
2. **Test Core Functionality**: Run auth tests to verify
3. **Identify App-Specific Selectors**: Check actual UI for proper selectors
4. **Update Test Data**: Ensure test users exist in database

## Common Selector Patterns to Update

```typescript
// OLD (failing)
input[name="email"]
input[name="password"]
button:has-text("Sign In")
/auth/signin
/Sign In/

// NEW (working)
input[id="email"]
input[id="password"]
button:has-text("Login")
/auth/login
/Yura Scheduler/
```

This systematic approach will fix most of the 844 failing tests quickly!