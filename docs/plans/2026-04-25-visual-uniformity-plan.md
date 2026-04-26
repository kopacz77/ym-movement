# Visual Uniformity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Achieve 100% visual coherence across every page and component in the app, matching the Stitch luxury athletic design system.

**Architecture:** Systematic sweep through all pages and components, standardizing typography, colors, shadows, hover effects, and spacing to use design tokens instead of hardcoded values. Verified via Storybook VRT and Playwright full-page screenshots.

**Tech Stack:** Next.js 16, Tailwind CSS, Radix UI, Storybook, Playwright, Stitch AI design system

---

## Design System Reference (Stitch Luxury Athletic)

**Page titles:** `text-2xl sm:text-3xl font-bold tracking-tight` (inherits `text-foreground`, NO hardcoded colors)
**Section headers:** `text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground`
**Card shadow:** `shadow-multi` (defined in globals.css)
**KPI hover shadow:** `hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_36px_rgba(0,0,0,0.1)]`
**Standard hover:** `hover:-translate-y-1 transition-all duration-200`
**Icon containers:** `w-12 h-12 rounded-xl` with pastel bg + 600-level text color
**Borders:** `border-border` (token) or `border-border/30` for subtle inner borders
**Skeleton loading:** `bg-muted` (NOT `bg-gray-200`)
**KPI icon animation:** `group-hover:scale-110 transition-transform duration-200` (requires `group` on parent)

---

### Task 1: Standardize Page Title Typography

**Files:**
- Modify: `src/app/(protected)/admin/dashboard/page.tsx:57`
- Modify: `src/app/(protected)/coach/dashboard/page.tsx:20-23`
- Modify: `src/app/(protected)/student/settings/page.tsx:36`
- Modify: `src/app/(protected)/student/profile/page.tsx:64`

**Step 1: Fix admin dashboard title**

In `src/app/(protected)/admin/dashboard/page.tsx:57`, change:
```tsx
<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
```
to:
```tsx
<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
```

**Step 2: Fix coach dashboard title and subtitle**

In `src/app/(protected)/coach/dashboard/page.tsx:20-23`, change:
```tsx
<h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">
  Welcome back, {firstName}
</h2>
<p className="text-slate-500">
```
to:
```tsx
<h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
  Welcome back, {firstName}
</h2>
<p className="text-muted-foreground">
```

**Step 3: Fix coach dashboard section header**

In `src/app/(protected)/coach/dashboard/page.tsx:35`, change:
```tsx
<h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
```
to:
```tsx
<h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
```

**Step 4: Fix student settings title responsiveness and layout**

In `src/app/(protected)/student/settings/page.tsx:35-36`, change:
```tsx
<div className="flex justify-between items-center">
  <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
```
to:
```tsx
<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
```

**Step 5: Fix student profile title**

In `src/app/(protected)/student/profile/page.tsx:63-64`, change:
```tsx
<div className="flex justify-between items-center">
  <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
```
to:
```tsx
<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Profile</h1>
```

**Step 6: Verify**

Run: `pnpm type-check`
Expected: No errors

**Step 7: Commit**

```
git add src/app/
git commit -m "fix: standardize page title typography across all roles"
```

---

### Task 2: Replace Hardcoded Border Colors with Design Tokens

**Files:**
- Modify: `src/components/layout/AppLayout.tsx:69,219`

**Step 1: Fix desktop header border**

In `src/components/layout/AppLayout.tsx:69`, change:
```tsx
<header className="sticky top-0 z-10 h-24 border-b border-slate-200 bg-white/80 backdrop-blur-xl shadow-sm px-8 flex items-center">
```
to:
```tsx
<header className="sticky top-0 z-10 h-24 border-b border-border bg-white/80 backdrop-blur-xl shadow-sm px-8 flex items-center">
```

**Step 2: Fix mobile header border**

In `src/components/layout/AppLayout.tsx:219`, change:
```tsx
<header className="flex h-24 shrink-0 items-center gap-2 border-b border-slate-200 bg-white/80 backdrop-blur-xl shadow-sm px-4 py-2">
```
to:
```tsx
<header className="flex h-24 shrink-0 items-center gap-2 border-b border-border bg-white/80 backdrop-blur-xl shadow-sm px-4 py-2">
```

**Step 3: Verify**

Run: `pnpm type-check`
Expected: No errors

**Step 4: Commit**

```
git add src/components/layout/AppLayout.tsx
git commit -m "fix: replace hardcoded border-slate-200 with border-border token"
```

---

### Task 3: Fix Reports Page Skeleton and Tip Box Colors

**Files:**
- Modify: `src/app/(protected)/admin/reports/page.tsx:353,387-394`

**Step 1: Fix skeleton loading color**

In `src/app/(protected)/admin/reports/page.tsx:353`, change:
```tsx
<div className="h-4 bg-gray-200 rounded" />
<div className="h-4 bg-gray-200 rounded w-3/4" />
```
to:
```tsx
<div className="h-4 bg-muted rounded" />
<div className="h-4 bg-muted rounded w-3/4" />
```

**Step 2: Fix Pro Tip box to use design tokens**

In `src/app/(protected)/admin/reports/page.tsx:387`, change:
```tsx
<div className="mt-4 p-3 border rounded bg-amber-50 text-amber-800">
  <p className="text-sm font-medium">Pro Tip</p>
  <p className="text-xs mt-1">
```
to:
```tsx
<div className="mt-4 p-3 border border-border/30 rounded-lg bg-amber-50/60 text-amber-800">
  <p className="text-sm font-semibold">Pro Tip</p>
  <p className="text-xs mt-1 text-amber-700">
```

**Step 3: Verify & Commit**

Run: `pnpm type-check`

```
git add src/app/(protected)/admin/reports/page.tsx
git commit -m "fix: replace hardcoded gray-200 skeleton with muted token in reports"
```

---

### Task 4: Add Group Hover Animation to CoachOverviewCards

**Files:**
- Modify: `src/features/coach/components/dashboard/CoachOverviewCards.tsx:59-61,72`

**Step 1: Add `group` class to Card**

In `src/features/coach/components/dashboard/CoachOverviewCards.tsx:59-61`, change:
```tsx
<Card
  key={card.title}
  className="hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_36px_rgba(0,0,0,0.1)] transition-all duration-200"
>
```
to:
```tsx
<Card
  key={card.title}
  className="group hover:-translate-y-1 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_12px_36px_rgba(0,0,0,0.1)] transition-all duration-200"
>
```

**Step 2: Add icon scale animation**

In `src/features/coach/components/dashboard/CoachOverviewCards.tsx:72`, change:
```tsx
className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center`}
```
to:
```tsx
className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}
```

**Step 3: Verify & Commit**

Run: `pnpm type-check`

```
git add src/features/coach/components/dashboard/CoachOverviewCards.tsx
git commit -m "fix: add group hover icon animation to CoachOverviewCards"
```

---

### Task 5: Standardize Student Profile Loading States

**Files:**
- Modify: `src/app/(protected)/student/profile/page.tsx:46-51,53-58`

**Step 1: Replace plain loading text with Card skeleton**

In `src/app/(protected)/student/profile/page.tsx:46-51`, change:
```tsx
if (!isReady || isLoading) {
  return (
    <div className="flex justify-center items-center h-96">
      <p>Loading profile...</p>
    </div>
  );
}
```
to:
```tsx
if (!isReady || isLoading) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      </div>
      <div className="h-64 bg-muted rounded-lg animate-pulse" />
    </div>
  );
}
```

**Step 2: Replace plain "not found" with consistent styling**

In `src/app/(protected)/student/profile/page.tsx:53-58`, change:
```tsx
if (!student) {
  return (
    <div className="flex justify-center items-center h-96">
      <p>Profile not found</p>
    </div>
  );
}
```
to:
```tsx
if (!student) {
  return (
    <div className="flex justify-center items-center h-96">
      <p className="text-muted-foreground">Profile not found</p>
    </div>
  );
}
```

**Step 3: Verify & Commit**

Run: `pnpm type-check`

```
git add src/app/(protected)/student/profile/page.tsx
git commit -m "fix: replace plain loading text with skeleton in student profile"
```

---

### Task 6: Standardize Student Dashboard Payment Card Padding

**Files:**
- Modify: `src/app/(protected)/student/dashboard/page.tsx:60`

**Step 1: Fix Payment Info card content padding**

In `src/app/(protected)/student/dashboard/page.tsx:60`, change:
```tsx
<CardContent className="space-y-2 text-sm pt-4">
```
to:
```tsx
<CardContent className="space-y-2 text-sm p-6 pt-4">
```

**Step 2: Verify & Commit**

Run: `pnpm type-check`

```
git add src/app/(protected)/student/dashboard/page.tsx
git commit -m "fix: standardize payment card padding in student dashboard"
```

---

### Task 7: Rebuild Storybook and Update VRT Baselines

**Step 1: Build Storybook**

Run: `pnpm storybook:build`
Expected: Build completes successfully

**Step 2: Run VRT with updated snapshots**

Run: `npx playwright test --config playwright-storybook.config.ts --update-snapshots`
Expected: All 20 stories pass, snapshots updated

**Step 3: Commit VRT baselines**

```
git add tests/storybook-vrt.spec.ts-snapshots/
git commit -m "test: update VRT baselines after visual uniformity fixes"
```

---

### Task 8: Full-Page Playwright Screenshots for Verification

**Step 1: Ensure dev server is running on port 3100**

Check if already running: `ss -tlnp | grep 3100`
If not running: `pnpm dev &` (wait for ready)

**Step 2: Capture admin dashboard screenshot**

Run:
```bash
npx playwright test --config playwright.config.ts -g "visual" || true
# If no visual test exists, use Playwright CLI directly:
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3100/auth/login');
  await page.fill('input[type=email]', 'admin@test.com');
  await page.fill('input[type=password]', 'ADMINPASS2025!');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/comparison-screenshots/uniformity-admin-dashboard.png', fullPage: true });

  await page.goto('http://localhost:3100/admin/reports');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/comparison-screenshots/uniformity-admin-reports.png', fullPage: true });

  await page.goto('http://localhost:3100/admin/settings');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/comparison-screenshots/uniformity-admin-settings.png', fullPage: true });

  await browser.close();
  console.log('Screenshots captured successfully');
})();
"
```

**Step 3: Capture coach dashboard screenshot**

```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3100/auth/login');
  await page.fill('input[type=email]', 'coach@test.com');
  await page.fill('input[type=password]', 'COACHPASS2025!');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/comparison-screenshots/uniformity-coach-dashboard.png', fullPage: true });
  await browser.close();
  console.log('Coach screenshot captured');
})();
"
```

**Step 4: Capture login page screenshot**

```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3100/auth/login');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/comparison-screenshots/uniformity-login.png', fullPage: true });
  await browser.close();
  console.log('Login screenshot captured');
})();
"
```

**Step 5: Commit screenshots**

```
git add docs/comparison-screenshots/uniformity-*.png
git commit -m "docs: capture post-uniformity verification screenshots"
```

---

### Task 9: Visual Comparison and Final Verification

**Step 1: Verify type safety of all changes**

Run: `pnpm type-check`
Expected: 0 errors

**Step 2: Verify lint passes**

Run: `pnpm lint`
Expected: No errors

**Step 3: Verify build succeeds**

Run: `pnpm build`
Expected: Build completes successfully

**Step 4: Commit any remaining fixes**

If type-check or lint reveals issues, fix them and commit.

---

## Summary of Changes

| Area | Before | After |
|------|--------|-------|
| Admin dashboard title | `text-3xl` | `text-2xl sm:text-3xl` |
| Coach dashboard title | `text-4xl text-slate-900` | `text-2xl sm:text-3xl` (token color) |
| Coach section headers | `font-bold text-slate-500` | `font-semibold text-muted-foreground` |
| Student settings title | Non-responsive, `text-3xl` | Responsive flex, `text-2xl sm:text-3xl` |
| Student profile title | Non-responsive, `text-3xl` | Responsive flex, `text-2xl sm:text-3xl` |
| Header borders | `border-slate-200` | `border-border` (token) |
| Reports skeleton | `bg-gray-200` | `bg-muted` (token) |
| Reports tip box | Raw `border` | `border-border/30 rounded-lg` |
| CoachOverviewCards | No icon animation | `group-hover:scale-110` (matches admin) |
| Student profile loading | Plain text | Card skeleton with muted bg |
| Student payment card | Missing p-6 | `p-6 pt-4` consistent padding |
